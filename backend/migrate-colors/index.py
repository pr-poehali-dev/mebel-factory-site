import json
import os
import re
import psycopg2

CORS = {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type'}

def py_str_to_list(raw_str: str) -> list:
    """Парсит Python-строку вида [{'key': 'val', ...}] в список dict."""
    fixed = raw_str.strip()
    fixed = re.sub(r"'", '"', fixed)
    fixed = fixed.replace('None', 'null').replace('True', 'true').replace('False', 'false')
    fixed = fixed.replace('\\t', '')
    try:
        result = json.loads(fixed)
        return result if isinstance(result, list) else []
    except Exception:
        return []

def normalize_color(c: dict) -> dict:
    photos = c.get('photos') or c.get('images') or []
    icon = c.get('icon') or c.get('swatch') or (photos[0] if photos else '')
    return {
        'name': (c.get('name') or '').strip('\t '),
        'sku': (c.get('sku') or '').strip('\t '),
        'icon': icon,
        'photos': photos,
    }

def normalize_specs(raw: dict) -> dict:
    """Склеивает Python-строку из ключа+значения и парсит в {label: value}."""
    if not raw or not isinstance(raw, dict):
        return {}
    keys = list(raw.keys())
    # Если уже нормальный формат (первый ключ не начинается с '[')
    if keys and not keys[0].strip().startswith('['):
        return raw
    # Склеиваем: ключ + ': ' + значение — получаем Python-строку массива
    full_str = keys[0] + ': ' + raw[keys[0]]
    items = py_str_to_list(full_str)
    if not items:
        return raw
    result = {}
    for item in items:
        if isinstance(item, dict) and 'label' in item and 'value' in item:
            result[item['label']] = item['value']
        elif isinstance(item, dict) and len(item) == 2:
            vals = list(item.values())
            result[str(vals[0])] = str(vals[1])
    return result

def handler(event: dict, context) -> dict:
    """Миграция: нормализует colors и specs всех товаров в единый чистый формат."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    cur.execute("SELECT id, colors, specs FROM products")
    rows = cur.fetchall()

    colors_updated = 0
    specs_updated = 0
    errors = []

    for product_id, colors_raw, specs_raw in rows:
        # --- COLORS ---
        colors = colors_raw if isinstance(colors_raw, list) else []
        needs_unpack = (
            len(colors) == 1
            and isinstance(colors[0], dict)
            and isinstance(colors[0].get('name', ''), str)
            and colors[0]['name'].strip().startswith('[')
        )
        has_images_field = not needs_unpack and any(
            isinstance(c, dict) and c.get('images') and not c.get('photos')
            for c in colors
        )
        if needs_unpack or has_images_field:
            try:
                if needs_unpack:
                    parsed = py_str_to_list(colors[0]['name'])
                    if not parsed:
                        errors.append(f"colors id={product_id}: не распарсить")
                    else:
                        normalized = [normalize_color(c) for c in parsed]
                        cur.execute("UPDATE products SET colors = %s WHERE id = %s",
                                    (json.dumps(normalized, ensure_ascii=False), product_id))
                        colors_updated += 1
                else:
                    normalized = [normalize_color(c) for c in colors]
                    cur.execute("UPDATE products SET colors = %s WHERE id = %s",
                                (json.dumps(normalized, ensure_ascii=False), product_id))
                    colors_updated += 1
            except Exception as e:
                errors.append(f"colors id={product_id}: {e}")

        # --- SPECS ---
        if specs_raw and isinstance(specs_raw, dict):
            keys = list(specs_raw.keys())
            if keys and keys[0].strip().startswith('['):
                try:
                    normalized_specs = normalize_specs(specs_raw)
                    cur.execute("UPDATE products SET specs = %s WHERE id = %s",
                                (json.dumps(normalized_specs, ensure_ascii=False), product_id))
                    specs_updated += 1
                except Exception as e:
                    errors.append(f"specs id={product_id}: {e}")

    conn.commit()
    cur.close()
    conn.close()

    return {
        'statusCode': 200,
        'headers': CORS,
        'body': json.dumps({
            'colors_updated': colors_updated,
            'specs_updated': specs_updated,
            'errors': errors
        }, ensure_ascii=False),
    }
