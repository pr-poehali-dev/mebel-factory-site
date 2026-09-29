ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order INTEGER;
UPDATE products SET sort_order = sub.rn FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) AS rn FROM products
) sub WHERE products.id = sub.id;
ALTER TABLE products ALTER COLUMN sort_order SET DEFAULT 0;