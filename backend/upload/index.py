import json
import os
import base64
import uuid
import boto3

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
}

def handler(event: dict, context) -> dict:
    """Загрузка фото товаров в S3 хранилище (приём base64 в JSON)"""

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    raw_body = event.get('body') or ''
    if event.get('isBase64Encoded'):
        raw_body = base64.b64decode(raw_body).decode('utf-8')

    body = json.loads(raw_body) if raw_body.strip() else {}

    token = (event.get('headers') or {}).get('X-Admin-Token', '') or body.get('token', '')
    admin_pass = os.environ.get('ADMIN_PASSWORD', '')
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
    if ext not in ('jpg', 'jpeg', 'png', 'webp', 'gif'):
        ext = 'jpg'
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
