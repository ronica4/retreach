#!/usr/bin/env python3
"""
Seed public.vendor_catalog from the master vendor dataset CSV.

Usage:
    python scripts/import-vendor-catalog.py "<path-to-csv>" [--dry-run]

- Apply supabase-migration-vendor-catalog.sql first (creates the table).
- Reads Supabase URL + SERVICE_ROLE key from .env.local (service role bypasses RLS).
- Skips "article" rows (info/guides, not vendors) — keeps attractions + hostels.
- Upserts on source_id, so it is safe to re-run.

Stdlib only — no pip installs needed.
"""
import csv, json, os, re, sys, html, urllib.request, urllib.error

DEFAULT_CSV = r"C:\Users\rotem\Downloads\עותק של master_dataset_with_wp_url - Sheet1.csv"

# Hebrew country spellings that should collapse to one canonical value.
COUNTRY_ALIASES = {"ויאטנם": "וייטנאם"}

TAG_RE = re.compile(r"<[^>]+>")
WS_RE = re.compile(r"\s+")


def load_env(path=".env.local"):
    env = {}
    if not os.path.exists(path):
        return env
    for line in open(path, encoding="utf-8-sig"):
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def clean_text(s: str) -> str:
    """Strip HTML, decode entities, collapse whitespace."""
    s = html.unescape(TAG_RE.sub(" ", s or ""))
    return WS_RE.sub(" ", s).strip()


def description_for(row: dict) -> str | None:
    etype = row["entity_type"].strip()
    if etype == "attraction":
        # Attraction snippets are clean human-written Hebrew.
        desc = clean_text(row.get("snippet_for_display", ""))
    else:
        # Hostel snippets are polluted with ChatGPT-export markup; the real
        # description lives in text_for_embedding as "title |  | <html prose>".
        full = clean_text(row.get("text_for_embedding", ""))
        parts = [p.strip() for p in full.split("|")]
        desc = " ".join(parts[2:]).strip() if len(parts) > 2 else full
    return desc or None


def country_for(row: dict) -> str | None:
    c = (row.get("country") or "").strip()
    if not c or c == "general":
        return None
    return COUNTRY_ALIASES.get(c, c)


def transform(csv_path: str) -> list[dict]:
    out = []
    with open(csv_path, encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            etype = (row.get("entity_type") or "").strip()
            if etype not in ("attraction", "hostel"):
                continue  # drop "article" rows
            try:
                source_id = int(row["parent_id"])
            except (KeyError, ValueError):
                source_id = None
            name = (row.get("title") or "").strip()
            if not name:
                continue
            out.append({
                "source_id": source_id,
                "entity_type": etype,
                "name": name,
                "country": country_for(row),
                "city": (row.get("city") or "").strip() or None,
                "category": (row.get("category") or "").strip() or None,
                "description": description_for(row),
                "url": (row.get("wp_url") or "").strip() or None,
                "created_by": None,
            })
    return out


def upsert(env: dict, records: list[dict]):
    base = env.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not base or not key:
        sys.exit("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
    url = f"{base}/rest/v1/vendor_catalog?on_conflict=source_id"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal,resolution=merge-duplicates",
    }
    BATCH = 500
    for i in range(0, len(records), BATCH):
        chunk = records[i:i + BATCH]
        body = json.dumps(chunk, ensure_ascii=False).encode("utf-8")
        req = urllib.request.Request(url, data=body, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req) as resp:
                print(f"  upserted rows {i + 1}-{i + len(chunk)}  (HTTP {resp.status})")
        except urllib.error.HTTPError as e:
            sys.exit(f"HTTP {e.code} on batch {i}: {e.read().decode('utf-8', 'replace')}")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry = "--dry-run" in sys.argv
    csv_path = args[0] if args else DEFAULT_CSV
    if not os.path.exists(csv_path):
        sys.exit(f"CSV not found: {csv_path}")

    records = transform(csv_path)
    print(f"Parsed {len(records)} vendor rows (attractions + hostels).")
    by_type = {}
    for r in records:
        by_type[r["entity_type"]] = by_type.get(r["entity_type"], 0) + 1
    print("  by type:", by_type)

    if dry:
        sample = records[:2] + [r for r in records if r["entity_type"] == "hostel"][:1]
        open("_catalog_preview.json", "w", encoding="utf-8").write(
            json.dumps(sample, ensure_ascii=False, indent=2))
        print("Dry run — wrote sample to _catalog_preview.json, nothing inserted.")
        return

    env = load_env()
    upsert(env, records)
    print(f"Done. {len(records)} rows upserted into vendor_catalog.")


if __name__ == "__main__":
    main()
