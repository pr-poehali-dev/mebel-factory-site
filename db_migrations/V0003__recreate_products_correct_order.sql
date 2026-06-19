CREATE TABLE products_new (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  price INTEGER,
  old_price INTEGER,
  img TEXT,
  tag TEXT,
  angle_type TEXT,
  fabric JSONB DEFAULT '[]',
  description TEXT,
  specs JSONB DEFAULT '{}',
  colors JSONB DEFAULT '[]',
  images JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  sku TEXT
);

ALTER TABLE products RENAME TO products_old;
ALTER TABLE products_new RENAME TO products;
