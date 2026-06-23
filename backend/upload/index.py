import json
import os
import base64
import uuid
import boto3
import re

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
}

def parse_multipart(body_bytes: bytes, boundary: str):
    """Парсит multipart/form-data и возвращает dict с полями"""
    fields = {}
    delimiter = ('--' + boundary).encode()
    parts = body_bytes.split(delimiter)
    for part in parts[1:]:
        if part in (b'--\r\n', b'--', b'\r\n'):
            continue
        if b'\r\n\r\n' not in part:
            continue
        headers_raw, _, content = part.partition(b'\r\n\r\n')
        content = content.rstrip(b'\r\n--')
        headers_str = headers_raw.decode('utf-8', errors='replace')
        disp = re.search(r'Content-Disposition:[^\r\n]*name="([^"]+)"', headers_str)
        if not disp:
            continue
        name = disp.group(1)
        filename_match = re.search(r'filename="([^"]+)"', headers_str)
        ct_match = re.search(r'Content-Type:\s*(\S+)', headers_str)
        if filename_match:
            fields[name] = {
                'filename': filename_match.group(1),
                'content_type': ct_match.group(1) if ct_match else 'application/octet-stream',
                'data': content,
            }
        else:
            fields[name] = content.decode('utf-8', errors='replace')
    return fields

def handler(event: dict, context) -> dict:
    """Загрузка фото товаров в S3 хранилище"""

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    raw_body = event.get('body') or ''
    if event.get('isBase64Encoded'):
        body_bytes = base64.b64decode(raw_body)
    else:
        body_bytes = raw_body.encode('utf-8') if isinstance(raw_body, str) else raw_body

    content_type_header = (event.get('headers') or {}).get('content-type', '') or \
                          (event.get('headers') or {}).get('Content-Type', '')

    admin_pass = os.environ.get('ADMIN_PASSWORD', '')

    # multipart/form-data
    if 'multipart/form-data' in content_type_header:
        boundary_match = re.search(r'boundary=([^\s;]+)', content_type_header)
        if not boundary_match:
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'No boundary'})}
        boundary = boundary_match.group(1)
        fields = parse_multipart(body_bytes, boundary)

        token = fields.get('token', '')
        if not token or token != admin_pass:
            return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Unauthorized'})}

        file_field = fields.get('file')
        if not file_field or not isinstance(file_field, dict):
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'No file provided'})}

        file_bytes = file_field['data']
        file_name = file_field['filename']
        content_type = file_field['content_type']

    # application/json (старый формат base64)
    else:
        body = json.loads(body_bytes.decode('utf-8')) if body_bytes.strip() else {}
        token = (event.get('headers') or {}).get('X-Admin-Token', '') or body.get('token', '')
        if not token or token != admin_pass:
            return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Unauthorized'})}

        file_data = body.get('file', '')
        file_name = body.get('name', 'photo.jpg')
        content_type = body.get('content_type', 'image/jpeg')
        if not file_data:
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'No file provided'})}
        if ',' in file_data:
            file_data = file_data.split(',', 1)[1]
        file_bytes = base64.b64decode(file_data)

    ext = file_name.rsplit('.', 1)[-1].lower() if '.' in file_name else 'jpg'
    unique_name = f"products/{uuid.uuid4().hex}.{ext}"

    s3 = boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )

    s3.put_object(
        Bucket='files',
        Key=unique_name,
        Body=file_bytes,
        ContentType=content_type,
    )

    cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{unique_name}"

    return {
        'statusCode': 200,
        'headers': CORS,
        'body': json.dumps({'url': cdn_url, 'success': True}),
    }
