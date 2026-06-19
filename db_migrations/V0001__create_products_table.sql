CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  main_image TEXT,
  category TEXT,
  gallery JSONB DEFAULT '[]',
  product_type TEXT,
  material TEXT,
  description TEXT,
  specs JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
