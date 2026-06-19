import json
import os
import psycopg2
import csv
import io

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def handler(event: dict, context) -> dict:
    """Управление товарами каталога: получение, добавление, редактирование, удаление, импорт CSV"""
    cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
    }

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors, 'body': ''}

    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}
    body = json.loads(event.get('body') or '{}')

    action = params.get('action', '')

    def verify_admin():
        token = (event.get('headers') or {}).get('X-Admin-Token', '')
        return token == os.environ.get('ADMIN_PASSWORD', '')

    # GET /products — список товаров (публичный)
    if method == 'GET' and not action:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("""
            SELECT id, name, main_image, category, gallery, product_type, material, description, specs, is_active, created_at
            FROM products
            WHERE is_active = true
            ORDER BY created_at DESC
        """)
        rows = cur.fetchall()
        conn.close()
        products = []
        for r in rows:
            products.append({
                'id': r[0], 'name': r[1], 'main_image': r[2],
                'category': r[3], 'gallery': r[4], 'product_type': r[5],
                'material': r[6], 'description': r[7], 'specs': r[8],
                'is_active': r[9], 'created_at': str(r[10])
            })
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'products': products}, ensure_ascii=False)}

    # GET /products?action=all — все товары для админки
    if method == 'GET' and action == 'all':
        if not verify_admin():
            return {'statusCode': 401, 'headers': cors, 'body': json.dumps({'error': 'Unauthorized'})}
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("""
            SELECT id, name, main_image, category, gallery, product_type, material, description, specs, is_active, created_at
            FROM products
            ORDER BY created_at DESC
        """)
        rows = cur.fetchall()
        conn.close()
        products = []
        for r in rows:
            products.append({
                'id': r[0], 'name': r[1], 'main_image': r[2],
                'category': r[3], 'gallery': r[4], 'product_type': r[5],
                'material': r[6], 'description': r[7], 'specs': r[8],
                'is_active': r[9], 'created_at': str(r[10])
            })
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'products': products}, ensure_ascii=False)}

    # POST /products?action=create
    if method == 'POST' and action == 'create':
        if not verify_admin():
            return {'statusCode': 401, 'headers': cors, 'body': json.dumps({'error': 'Unauthorized'})}
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO products (name, main_image, category, gallery, product_type, material, description, specs, is_active)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id
        """, (
            body.get('name'), body.get('main_image'), body.get('category'),
            json.dumps(body.get('gallery', []), ensure_ascii=False),
            body.get('product_type'), body.get('material'),
            body.get('description'),
            json.dumps(body.get('specs', {}), ensure_ascii=False),
            body.get('is_active', True)
        ))
        new_id = cur.fetchone()[0]
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'id': new_id, 'success': True})}

    # PUT /products?action=update&id=X
    if method == 'PUT' and action == 'update':
        if not verify_admin():
            return {'statusCode': 401, 'headers': cors, 'body': json.dumps({'error': 'Unauthorized'})}
        product_id = params.get('id')
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("""
            UPDATE products SET name=%s, main_image=%s, category=%s, gallery=%s,
            product_type=%s, material=%s, description=%s, specs=%s, is_active=%s
            WHERE id=%s
        """, (
            body.get('name'), body.get('main_image'), body.get('category'),
            json.dumps(body.get('gallery', []), ensure_ascii=False),
            body.get('product_type'), body.get('material'),
            body.get('description'),
            json.dumps(body.get('specs', {}), ensure_ascii=False),
            body.get('is_active', True), product_id
        ))
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'success': True})}

    # DELETE /products?action=delete&id=X
    if method == 'DELETE' and action == 'delete':
        if not verify_admin():
            return {'statusCode': 401, 'headers': cors, 'body': json.dumps({'error': 'Unauthorized'})}
        product_id = params.get('id')
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("DELETE FROM products WHERE id=%s", (product_id,))
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'success': True})}

    # POST /products?action=import_csv
    if method == 'POST' and action == 'import_csv':
        if not verify_admin():
            return {'statusCode': 401, 'headers': cors, 'body': json.dumps({'error': 'Unauthorized'})}
        csv_text = body.get('csv', '')
        reader = csv.DictReader(io.StringIO(csv_text))
        conn = get_conn()
        cur = conn.cursor()
        count = 0
        for row in reader:
            gallery = []
            if row.get('gallery'):
                gallery = [u.strip() for u in row['gallery'].split('|') if u.strip()]
            specs = {}
            if row.get('specs'):
                for part in row['specs'].split(';'):
                    if ':' in part:
                        k, v = part.split(':', 1)
                        specs[k.strip()] = v.strip()
            cur.execute("""
                INSERT INTO products (name, main_image, category, gallery, product_type, material, description, specs, is_active)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                row.get('name', ''), row.get('main_image', ''), row.get('category', ''),
                json.dumps(gallery, ensure_ascii=False),
                row.get('product_type', ''), row.get('material', ''),
                row.get('description', ''),
                json.dumps(specs, ensure_ascii=False),
                True
            ))
            count += 1
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'imported': count, 'success': True})}

    # POST /products?action=login — проверка пароля
    if method == 'POST' and action == 'login':
        password = body.get('password', '')
        if password == os.environ.get('ADMIN_PASSWORD', ''):
            return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'success': True})}
        return {'statusCode': 401, 'headers': cors, 'body': json.dumps({'error': 'Неверный пароль'})}

    return {'statusCode': 404, 'headers': cors, 'body': json.dumps({'error': 'Not found'})}
