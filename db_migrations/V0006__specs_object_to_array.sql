UPDATE products
SET specs = (
  SELECT jsonb_agg(jsonb_build_object('label', kv.key, 'value', kv.value) ORDER BY kv.ord)
  FROM (
    SELECT key, value, row_number() OVER () as ord
    FROM jsonb_each_text(specs)
  ) kv
)
WHERE specs IS NOT NULL AND specs != '{}' AND jsonb_typeof(specs) = 'object';