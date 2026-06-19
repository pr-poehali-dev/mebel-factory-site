-- colors теперь хранит массив объектов вида:
-- [{"name": "Бежевый", "sku": "80525522", "icon": "https://...", "photos": ["https://...", ...]}]
-- Структура уже JSONB, просто меняем формат данных — миграция данных не нужна, таблица пустая.
-- Добавляем комментарий к колонке для документации
COMMENT ON COLUMN products.colors IS 'Array of color objects: [{name, sku, icon, photos[]}]';
COMMENT ON COLUMN products.images IS 'General product photos shown by default';
COMMENT ON COLUMN products.fabric IS 'Array of fabric/material options e.g. ["Велюр", "Рогожка"]';
