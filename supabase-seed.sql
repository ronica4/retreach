-- Seed data for retreat destination lookup tables
-- Run this in Supabase SQL editor AFTER supabase-schema.sql

-- Fix: iata_code should not be globally unique — multiple destinations share an airport.
-- Change the unique constraint to (iata_code, city) instead.
alter table public.flight_airport_codes drop constraint if exists flight_airport_codes_iata_code_key;
alter table public.flight_airport_codes add constraint flight_airport_codes_iata_city_key unique (iata_code, city);

-- Flight airport codes: one row per destination→airport mapping.
-- The `city` column holds the DESTINATION city name (not the airport's city),
-- so the lookup query `.ilike('city', '%Sedona%')` resolves to FLG, etc.
insert into public.flight_airport_codes (iata_code, airport_name, city, country, latitude, longitude) values
  -- USA
  ('FLG', 'Flagstaff Pulliam Airport',         'Sedona',           'USA',        35.1385, -111.6692),
  ('AVL', 'Asheville Regional Airport',         'Asheville',        'USA',        35.4362,  -82.5418),
  ('SBA', 'Santa Barbara Municipal Airport',    'Santa Barbara',    'USA',        34.4262, -119.8401),
  ('SBA', 'Santa Barbara Municipal Airport',    'Ojai',             'USA',        34.4262, -119.8401),
  ('PSP', 'Palm Springs Int''l Airport',        'Palm Springs',     'USA',        33.8297, -116.5067),
  ('MRY', 'Monterey Regional Airport',          'Carmel',           'USA',        36.5870, -121.8428),
  ('SAF', 'Santa Fe Regional Airport',          'Santa Fe',         'USA',        35.6170, -106.0888),
  ('ABQ', 'Albuquerque Int''l Sunport',         'Taos',             'USA',        35.0402, -106.6090),
  ('RNO', 'Reno-Tahoe Int''l Airport',          'Lake Tahoe',       'USA',        39.4991, -119.7681),
  -- Mexico
  ('CUN', 'Cancun Int''l Airport',              'Tulum',            'Mexico',     21.0365,  -86.8770),
  ('CUN', 'Cancun Int''l Airport',              'Playa del Carmen', 'Mexico',     21.0365,  -86.8770),
  -- Central America
  ('SJO', 'Juan Santamaría Int''l Airport',     'Costa Rica',       'Costa Rica',  9.9937,  -84.2088),
  ('SJO', 'Juan Santamaría Int''l Airport',     'Nosara',           'Costa Rica',  9.9937,  -84.2088),
  ('LIR', 'Daniel Oduber Quiros Int''l',        'Guanacaste',       'Costa Rica', 10.5933,  -85.5444),
  -- Indonesia
  ('DPS', 'Ngurah Rai Int''l Airport',          'Ubud',             'Indonesia',  -8.7481,  115.1671),
  ('DPS', 'Ngurah Rai Int''l Airport',          'Seminyak',         'Indonesia',  -8.7481,  115.1671),
  -- Thailand
  ('HKT', 'Phuket Int''l Airport',              'Phuket',           'Thailand',    8.1132,   98.3167),
  ('USM', 'Samui Airport',                      'Koh Samui',        'Thailand',    9.5479,  100.0627),
  ('BKK', 'Suvarnabhumi Airport',               'Bangkok',          'Thailand',   13.6900,  100.7501),
  -- Europe
  ('FLR', 'Florence Airport',                   'Tuscany',          'Italy',      43.7898,   11.2051),
  ('BCN', 'Barcelona El Prat Airport',          'Barcelona',        'Spain',      41.2974,    2.0833),
  ('LIS', 'Lisbon Humberto Delgado Airport',    'Lisbon',           'Portugal',   38.7813,   -9.1359),
  ('AMS', 'Amsterdam Schiphol Airport',         'Amsterdam',        'Netherlands',52.3105,    4.7683),
  ('ZRH', 'Zurich Airport',                     'Swiss Alps',       'Switzerland',47.4647,    8.5492),
  -- South Asia
  ('CMB', 'Bandaranaike Int''l Airport',        'Sri Lanka',        'Sri Lanka',   7.1801,   79.8841),
  ('DEL', 'Indira Gandhi Int''l Airport',       'Rishikesh',        'India',      28.5562,   77.1000),
  ('GOI', 'Goa Int''l Airport',                 'Goa',              'India',      15.3808,   73.8314)
on conflict (iata_code, city) do nothing;

-- Agoda city IDs for hotel searches.
-- city_name must match what the destination dropdown shows.
-- agoda_city_id values are Agoda's internal IDs for the destination area.
insert into public.agoda_city_ids (city_name, country, agoda_city_id, latitude, longitude) values
  ('Sedona, Arizona, USA',               'USA',          16742,   34.8697, -111.7609),
  ('Asheville, North Carolina, USA',     'USA',          28787,   35.5951,  -82.5515),
  ('Santa Barbara, California, USA',     'USA',          18265,   34.4208, -119.6982),
  ('Ojai, California, USA',              'USA',           5337,   34.4480, -119.2429),
  ('Palm Springs, California, USA',      'USA',           3718,   33.8303, -116.5453),
  ('Carmel, California, USA',            'USA',           5336,   36.5552, -121.9233),
  ('Santa Fe, New Mexico, USA',          'USA',          13274,   35.6870, -105.9378),
  ('Taos, New Mexico, USA',              'USA',          10743,   36.4072, -105.5731),
  ('Lake Tahoe, California, USA',        'USA',           4019,   39.0968, -120.0324),
  ('Tulum, Quintana Roo, Mexico',        'Mexico',       61665,   20.2114,  -87.4654),
  ('Playa del Carmen, Quintana Roo, Mexico','Mexico',     1039,   20.6296,  -87.0739),
  ('Nosara, Guanacaste, Costa Rica',     'Costa Rica',   39861,    9.9796,  -85.6536),
  ('Guanacaste, Costa Rica',             'Costa Rica',   13987,   10.3153,  -85.4400),
  ('Ubud, Bali, Indonesia',              'Indonesia',    17314,   -8.5069,  115.2625),
  ('Seminyak, Bali, Indonesia',          'Indonesia',     3588,   -8.6910,  115.1618),
  ('Phuket, Thailand',                   'Thailand',      3940,    7.8804,   98.3923),
  ('Koh Samui, Thailand',                'Thailand',      1185,    9.5120,  100.0136),
  ('Bangkok, Thailand',                  'Thailand',      3960,   13.7563,  100.5018),
  ('Tuscany, Italy',                     'Italy',        15266,   43.7711,   11.2486),
  ('Barcelona, Spain',                   'Spain',          636,   41.3851,    2.1734),
  ('Lisbon, Portugal',                   'Portugal',      1393,   38.7223,   -9.1393),
  ('Amsterdam, Netherlands',             'Netherlands',    184,   52.3702,    4.8952),
  ('Swiss Alps, Switzerland',            'Switzerland',  15701,   46.8182,    8.2275),
  ('Sri Lanka',                          'Sri Lanka',     6455,    7.8731,   80.7718),
  ('Rishikesh, Uttarakhand, India',      'India',         3698,   30.0869,   78.2676),
  ('Goa, India',                         'India',          546,   15.2993,   74.1240)
on conflict (city_name) do nothing;
