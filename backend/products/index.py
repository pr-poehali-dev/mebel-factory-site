import json
import os
import psycopg2
import csv
import io
import base64

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
}

def safe_json(val):
    if val is None:
        return val
    if isinstance(val, (list, dict)):
        return val
    if isinstance(val, str):
        try:
            return json.loads(val)
        except Exception:
            try:
                fixed = val.replace("'", '"').replace('None', 'null').replace('True', 'true').replace('False', 'false')
                return json.loads(fixed)
            except Exception:
                return val
    return val

def row_to_dict(r):
    return {
        'id': r[0], 'name': r[1], 'category': r[2], 'price': r[3],
        'old_price': r[4], 'img': r[5], 'tag': r[6], 'angle_type': r[7],
        'fabric': safe_json(r[8]), 'description': r[9], 'specs': safe_json(r[10]),
        'colors': safe_json(r[11]), 'images': safe_json(r[12]),
        'is_active': r[13], 'created_at': str(r[14]), 'sku': r[15],
    }

SELECT_SQL = """
    SELECT id, name, category, price, old_price, img, tag, angle_type,
           fabric, description, specs, colors, images, is_active, created_at, sku
    FROM products
"""

def handler(event: dict, context) -> dict:
    """Управление товарами каталога: получение, добавление, редактирование, удаление, импорт CSV"""

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}
    raw_body = event.get('body') or ''
    if event.get('isBase64Encoded') and raw_body:
        raw_body = base64.b64decode(raw_body).decode('utf-8')
    body = json.loads(raw_body) if raw_body.strip() else {}
    action = params.get('action', '')

    def verify_admin():
        token = (event.get('headers') or {}).get('X-Admin-Token', '')
        return token == os.environ.get('ADMIN_PASSWORD', '')

    # POST login
    if method == 'POST' and action == 'login':
        password = body.get('password', '')
        if password == os.environ.get('ADMIN_PASSWORD', ''):
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'success': True})}
        return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Неверный пароль'})}

    # GET — публичный список (активные)
    if method == 'GET' and not action:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(SELECT_SQL + " WHERE is_active = true ORDER BY created_at DESC")
        rows = cur.fetchall()
        conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'products': [row_to_dict(r) for r in rows]}, ensure_ascii=False)}

    # GET all — для админки
    if method == 'GET' and action == 'all':
        if not verify_admin():
            return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Unauthorized'})}
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(SELECT_SQL + " ORDER BY created_at DESC")
        rows = cur.fetchall()
        conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'products': [row_to_dict(r) for r in rows]}, ensure_ascii=False)}

    # POST create
    if method == 'POST' and action == 'create':
        if not verify_admin():
            return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Unauthorized'})}
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO products (name, category, price, old_price, img, tag, angle_type,
                fabric, description, specs, colors, images, is_active, sku)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id
        """, (
            body.get('name'), body.get('category'),
            body.get('price') or None, body.get('old_price') or None,
            body.get('img'), body.get('tag'), body.get('angle_type'),
            json.dumps(body.get('fabric', []), ensure_ascii=False),
            body.get('description'),
            json.dumps(body.get('specs', {}), ensure_ascii=False),
            json.dumps(body.get('colors', []), ensure_ascii=False),
            json.dumps(body.get('images', []), ensure_ascii=False),
            body.get('is_active', True), body.get('sku'),
        ))
        new_id = cur.fetchone()[0]
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'id': new_id, 'success': True})}

    # PUT update
    if method == 'PUT' and action == 'update':
        if not verify_admin():
            return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Unauthorized'})}
        product_id = params.get('id')
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("""
            UPDATE products SET name=%s, category=%s, price=%s, old_price=%s, img=%s, tag=%s,
                angle_type=%s, fabric=%s, description=%s, specs=%s, colors=%s, images=%s,
                is_active=%s, sku=%s
            WHERE id=%s
        """, (
            body.get('name'), body.get('category'),
            body.get('price') or None, body.get('old_price') or None,
            body.get('img'), body.get('tag'), body.get('angle_type'),
            json.dumps(body.get('fabric', []), ensure_ascii=False),
            body.get('description'),
            json.dumps(body.get('specs', {}), ensure_ascii=False),
            json.dumps(body.get('colors', []), ensure_ascii=False),
            json.dumps(body.get('images', []), ensure_ascii=False),
            body.get('is_active', True), body.get('sku'), product_id,
        ))
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'success': True})}

    # DELETE
    if method == 'DELETE' and action == 'delete':
        if not verify_admin():
            return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Unauthorized'})}
        product_id = params.get('id')
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("DELETE FROM products WHERE id=%s", (product_id,))
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'success': True})}

    # POST import_csv
    if method == 'POST' and action == 'import_csv':
        if not verify_admin():
            return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Unauthorized'})}
        csv_text = body.get('csv', '')

        def parse_json_or_list(val, sep='|'):
            if not val:
                return []
            val = val.strip()
            if val.startswith('['):
                try:
                    return json.loads(val)
                except Exception:
                    pass
            return [u.strip() for u in val.split(sep) if u.strip()]

        def parse_json_or_dict(val):
            if not val:
                return {}
            val = val.strip()
            if val.startswith('{'):
                try:
                    return json.loads(val)
                except Exception:
                    pass
            result = {}
            for part in val.split(';'):
                if ':' in part:
                    k, v = part.split(':', 1)
                    result[k.strip()] = v.strip()
            return result

        def parse_int(val):
            if not val:
                return None
            val = str(val).strip()
            return int(val) if val.isdigit() else None

        # Определяем разделитель — запятая или точка с запятой
        delimiter = ';' if csv_text.count(';') > csv_text.count(',') else ','

        reader = csv.DictReader(io.StringIO(csv_text), delimiter=delimiter)
        conn = get_conn()
        cur = conn.cursor()
        count = 0
        errors = []
        for i, row in enumerate(reader):
            try:
                cur.execute("""
                    INSERT INTO products (name, category, price, old_price, img, tag, angle_type,
                        fabric, description, specs, colors, images, is_active, sku)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """, (
                    row.get('name', ''), row.get('category', ''),
                    parse_int(row.get('price')), parse_int(row.get('old_price')),
                    row.get('img', ''), row.get('tag', ''), row.get('angle_type', ''),
                    json.dumps(parse_json_or_list(row.get('fabric')), ensure_ascii=False),
                    row.get('description', ''),
                    json.dumps(parse_json_or_dict(row.get('specs')), ensure_ascii=False),
                    json.dumps(parse_json_or_list(row.get('colors')), ensure_ascii=False),
                    json.dumps(parse_json_or_list(row.get('images')), ensure_ascii=False),
                    True, row.get('sku', ''),
                ))
                count += 1
            except Exception as e:
                errors.append(f"Row {i+2}: {str(e)}")
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'imported': count, 'errors': errors, 'success': True}, ensure_ascii=False)}

    return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Not found'})}