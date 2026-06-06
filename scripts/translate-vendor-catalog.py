#!/usr/bin/env python3
"""
Translate vendor_catalog rows (name / city / description) from Hebrew to English,
in place. Country is left as-is (the UI maps it to an English label).

Usage:
    python scripts/translate-vendor-catalog.py --sample 5   # translate 5 rows, print, no write
    python scripts/translate-vendor-catalog.py              # translate all, write back

Reversible: re-run scripts/import-vendor-catalog.py to restore the Hebrew originals.
Reads keys from .env.local. Stdlib only.
"""
import json, os, sys, urllib.request, urllib.error

OPENAI_MODEL = "gpt-4o-mini"
BATCH = 25  # rows per translation request

SYSTEM = (
    "You translate travel-vendor data from Hebrew to natural English. "
    "For each item translate the name, city and description. "
    "Names: if already in Latin script, keep unchanged; if Hebrew, give the natural "
    "English/transliterated form a traveler would recognize (proper nouns, brands, places). "
    "Cities: use the common English spelling of the place. "
    "Descriptions: fluent, concise English that preserves the meaning and tone. "
    "If an input field is empty, return it empty. "
    'Return JSON: {"items":[{"id":"...","name":"...","city":"...","description":"..."}]}.'
)


def load_env(path=".env.local"):
    env = {}
    for line in open(path, encoding="utf-8-sig"):
        line = line.strip()
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


ENV = load_env()
SB = ENV["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
SB_KEY = ENV["SUPABASE_SERVICE_ROLE_KEY"]
OAI_KEY = ENV["OPENAI_API_KEY"]
SB_AUTH = {"apikey": SB_KEY, "Authorization": f"Bearer {SB_KEY}"}


def fetch_rows():
    rows, offset, PAGE = [], 0, 1000
    while True:
        req = urllib.request.Request(
            f"{SB}/rest/v1/vendor_catalog?select=id,name,city,description&order=created_at",
            headers={**SB_AUTH, "Range-Unit": "items", "Range": f"{offset}-{offset + PAGE - 1}"})
        data = json.loads(urllib.request.urlopen(req).read())
        rows += data
        if len(data) < PAGE:
            break
        offset += PAGE
    return rows


def translate_batch(batch):
    payload = [{"id": r["id"], "name": r["name"] or "",
                "city": r["city"] or "", "description": r["description"] or ""} for r in batch]
    body = json.dumps({
        "model": OPENAI_MODEL,
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": json.dumps({"items": payload}, ensure_ascii=False)},
        ],
    }).encode("utf-8")
    req = urllib.request.Request("https://api.openai.com/v1/chat/completions", data=body,
        headers={"Authorization": f"Bearer {OAI_KEY}", "Content-Type": "application/json"}, method="POST")
    try:
        resp = json.loads(urllib.request.urlopen(req).read())
    except urllib.error.HTTPError as e:
        sys.exit(f"OpenAI HTTP {e.code}: {e.read().decode('utf-8', 'replace')[:400]}")
    content = resp["choices"][0]["message"]["content"]
    return {it["id"]: it for it in json.loads(content)["items"]}


def write_rows(rows, translations):
    """Upsert on the primary key — updates only name/city/description, preserving the rest."""
    updates = []
    for r in rows:
        t = translations.get(r["id"])
        if not t:
            continue
        updates.append({
            "id": r["id"],
            "name": (t.get("name") or r["name"]).strip() or r["name"],
            # keep null if the original was null
            "city": ((t.get("city") or "").strip() or None) if r["city"] else None,
            "description": ((t.get("description") or "").strip() or None) if r["description"] else None,
        })
    url = f"{SB}/rest/v1/vendor_catalog?on_conflict=id"
    headers = {**SB_AUTH, "Content-Type": "application/json",
               "Prefer": "return=minimal,resolution=merge-duplicates"}
    for i in range(0, len(updates), 500):
        chunk = updates[i:i + 500]
        req = urllib.request.Request(url, data=json.dumps(chunk, ensure_ascii=False).encode("utf-8"),
                                     headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req) as resp:
                print(f"  wrote rows {i + 1}-{i + len(chunk)} (HTTP {resp.status})")
        except urllib.error.HTTPError as e:
            sys.exit(f"Supabase HTTP {e.code}: {e.read().decode('utf-8', 'replace')[:400]}")


def main():
    sample = None
    if "--sample" in sys.argv:
        sample = int(sys.argv[sys.argv.index("--sample") + 1])

    rows = fetch_rows()
    print(f"Fetched {len(rows)} rows.")
    if sample:
        rows = rows[:sample]

    translations = {}
    for i in range(0, len(rows), BATCH):
        batch = rows[i:i + BATCH]
        translations.update(translate_batch(batch))
        print(f"  translated {min(i + BATCH, len(rows))}/{len(rows)}")

    if sample:
        for r in rows:
            t = translations.get(r["id"], {})
            print("\n— HE:", r["name"], "|", r["city"])
            print("       ", (r["description"] or "")[:120])
            print("  EN:", t.get("name"), "|", t.get("city"))
            print("       ", (t.get("description") or "")[:120])
        print("\nSample only — nothing written.")
        return

    write_rows(rows, translations)
    print(f"Done. Translated {len(translations)} rows to English (in place).")


if __name__ == "__main__":
    main()
