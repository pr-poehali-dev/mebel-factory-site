import { useState, useMemo, useEffect } from 'react';
import Icon from '@/components/ui/icon';

const API = "https://functions.poehali.dev/1de099ca-e246-4fde-a95d-707c71ea4702";

interface ColorVariant {
  name: string;
  sku: string;
  icon?: string;
  swatch?: string;
  photos?: string[];
  images?: string[];
}

interface Product {
  id: number;
  name: string;
  category: string;
  tag: string;
  img: string;
  description: string;
  price: number | null;
  old_price: number | null;
  angle_type: string;
  fabric: string[];
  specs: Record<string, string>;
  colors: ColorVariant[];
  images: string[];
  sku: string;
}

const CATEGORIES = [
  { id: 'all', label: 'Все изделия' },
  { id: 'sofa', label: 'Диваны' },
  { id: 'armchair', label: 'Кресла' },
  { id: 'bed', label: 'Кровати' },
  { id: 'garden', label: 'Садовая мебель' },
  { id: 'cocoon', label: 'Коконы' },
  { id: 'fabric', label: 'Ткань' },
];

// Парсит строку Python-формата в массив объектов
function parseColors(raw: unknown): ColorVariant[] {
  let data = raw;
  // Если массив с одним строковым элементом — распарсить его
  if (Array.isArray(data) && data.length === 1 && typeof data[0] === 'string') {
    try {
      const fixed = (data[0] as string)
        .replace(/'/g, '"')
        .replace(/None/g, 'null')
        .replace(/True/g, 'true')
        .replace(/False/g, 'false');
      data = JSON.parse(fixed);
    } catch { return []; }
  }
  if (!Array.isArray(data)) return [];
  return (data as ColorVariant[]).map(c =>
    typeof c === 'string' ? { name: c, sku: '' } : c
  );
}

function parseImages(raw: unknown): string[] {
  if (Array.isArray(raw) && raw.length === 1 && typeof raw[0] === 'string') {
    try {
      const fixed = (raw[0] as string).replace(/'/g, '"');
      const parsed = JSON.parse(fixed);
      if (Array.isArray(parsed)) return parsed;
    } catch { /**/ }
  }
  if (Array.isArray(raw)) return raw as string[];
  return [];
}

function ProductModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const colors = parseColors(product.colors);
  const generalImages = parseImages(product.images);

  const [selectedColor, setSelectedColor] = useState(0);

  const colorPhotos = useMemo(() => {
    const c = colors[selectedColor];
    if (!c) return [];
    return c.images?.length ? c.images : c.photos?.length ? c.photos : [];
  }, [selectedColor, colors]);

  const allPhotos = useMemo(() => {
    if (colorPhotos.length) return colorPhotos;
    const imgs = generalImages;
    return product.img ? [product.img, ...imgs.filter(i => i !== product.img)] : imgs;
  }, [colorPhotos, generalImages, product.img]);

  const [activePhoto, setActivePhoto] = useState(() => allPhotos[0] || product.img || '');
  const [photoIdx, setPhotoIdx] = useState(0);

  useEffect(() => {
    setPhotoIdx(0);
    setActivePhoto(allPhotos[0] || product.img || '');
  }, [selectedColor]);

  function goPhoto(dir: 1 | -1) {
    const next = (photoIdx + dir + allPhotos.length) % allPhotos.length;
    setPhotoIdx(next);
    setActivePhoto(allPhotos[next]);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPhoto(-1);
      if (e.key === 'ArrowRight') goPhoto(1);
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [photoIdx, allPhotos]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, []);

  // specs приходит как объект где ключ — начало Python-строки, значение — продолжение
  // Например: {"[{'label'": "'Размер...', ...}]"}
  const specsList: { label: string; value: string }[] = (() => {
    const raw = product.specs;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw as { label: string; value: string }[];
    if (typeof raw === 'object') {
      // Склеиваем все ключи и значения в одну строку и парсим
      const entries = Object.entries(raw as Record<string, string>);
      try {
        const fullStr = entries.map(([k, v]) => k + ': ' + v).join(', ');
        const fixed = fullStr
          .replace(/'/g, '"')
          .replace(/None/g, 'null')
          .replace(/True/g, 'true')
          .replace(/False/g, 'false');
        const parsed = JSON.parse(fixed);
        if (Array.isArray(parsed)) return parsed as { label: string; value: string }[];
      } catch { /**/ }
    }
    return [];
  })();

  const swatchUrl = (c: ColorVariant) => c.swatch || c.icon || c.images?.[0] || c.photos?.[0] || '';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
        >
          <Icon name="X" size={16} className="text-gray-600" />
        </button>

        <div className="flex flex-col md:flex-row overflow-y-auto md:overflow-hidden h-full">
          {/* Левая часть — галерея */}
          <div className="md:w-[55%] flex shrink-0 md:h-full">
            {/* Миниатюры слева */}
            {allPhotos.length > 1 && (
              <div className="flex flex-col gap-2 p-3 overflow-y-auto w-20 shrink-0">
                {allPhotos.map((photo, i) => (
                  <button
                    key={i}
                    onClick={() => { setPhotoIdx(i); setActivePhoto(photo); }}
                    className={`shrink-0 w-full aspect-square rounded overflow-hidden border-2 transition-all ${
                      photoIdx === i ? 'border-gray-800' : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            {/* Главное фото + стрелки */}
            <div className="flex-1 relative bg-white flex items-center justify-center min-h-[280px]">
              {activePhoto
                ? <img src={activePhoto} alt={product.name} className="w-full h-full object-contain p-4 max-h-[500px]" />
                : <div className="text-gray-300"><Icon name="Image" size={48} /></div>
              }
              {allPhotos.length > 1 && (
                <>
                  <button onClick={() => goPhoto(-1)} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 shadow-sm">
                    <Icon name="ChevronLeft" size={16} className="text-gray-600" />
                  </button>
                  <button onClick={() => goPhoto(1)} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 shadow-sm">
                    <Icon name="ChevronRight" size={16} className="text-gray-600" />
                  </button>
                  <div className="absolute bottom-3 right-3 text-xs text-gray-400 bg-white/80 px-2 py-1 rounded">
                    {photoIdx + 1} / {allPhotos.length}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Правая часть — инфо */}
          <div className="md:w-[45%] flex flex-col overflow-y-auto p-6 md:p-8 border-l border-gray-100">
            {product.category && (
              <p className="text-xs tracking-widest uppercase text-gray-400 mb-2">{product.category}</p>
            )}
            <h2 className="font-display text-3xl text-gray-900 mb-2">{product.name}</h2>

            {product.price && (
              <div className="flex items-baseline gap-3 mb-4">
                <span className="text-2xl font-semibold text-gray-900">{product.price.toLocaleString('ru-RU')} ₽</span>
                {product.old_price && (
                  <span className="text-gray-400 line-through text-base">{product.old_price.toLocaleString('ru-RU')} ₽</span>
                )}
              </div>
            )}

            {product.description && (
              <p className="text-sm text-gray-500 leading-relaxed mb-5">{product.description}</p>
            )}

            {/* Цвет обивки */}
            {colors.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs tracking-widest uppercase text-gray-400">Цвет обивки</p>
                  <span className="text-sm text-gray-700">{colors[selectedColor]?.name}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {colors.map((c, i) => {
                    const sw = swatchUrl(c);
                    return (
                      <button
                        key={i}
                        title={c.name}
                        onClick={() => setSelectedColor(i)}
                        className={`w-14 h-12 rounded overflow-hidden border-2 transition-all ${
                          selectedColor === i ? 'border-gray-800' : 'border-gray-200 hover:border-gray-400'
                        }`}
                      >
                        {sw
                          ? <img src={sw} alt={c.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full bg-gray-100 flex items-center justify-center text-[9px] text-gray-400 text-center px-1">{c.name}</div>
                        }
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Характеристики */}
            {specsList.length > 0 && (
              <div>
                <p className="text-xs tracking-widest uppercase text-gray-400 mb-3">Характеристики</p>
                <div className="flex flex-col divide-y divide-gray-100">
                  {specsList.map((s, i) => (
                    <div key={i} className="flex justify-between py-2 text-sm">
                      <span className="text-gray-500">{s.label}</span>
                      <span className="text-gray-900 font-medium text-right ml-4">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {product.sku && (
              <p className="text-xs text-gray-400 mt-4">Артикул: {product.sku}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const Index = () => {
  const [active, setActive] = useState('all');
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetch(API)
      .then(r => r.json())
      .then(d => setProducts(d.products || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const byCategory = active === 'all' ? products : products.filter((p) => p.category === active);
    const q = search.trim().toLowerCase();
    return q ? byCategory.filter((p) => p.name.toLowerCase().includes(q)) : byCategory;
  }, [active, search, products]);

  return (
    <div className="min-h-screen bg-background bg-grain text-foreground">
      {/* HEADER */}
      <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-background/70 border-b border-border/60">
        <div className="container flex items-center justify-between h-20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-sm border border-gold/50 flex items-center justify-center overflow-hidden">
              <img src="https://cdn.poehali.dev/projects/b868189f-856e-402d-ac84-8be0d1c2cc04/bucket/8c435106-11a8-4f69-9bac-e649551a8a4e.png" alt="Логотип" className="w-full h-full object-contain p-0.5" />
            </div>
            <div className="leading-tight">
              <p className="font-display text-lg tracking-wide">Волжская мебельная мануфактура</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#catalog" className="hover:text-gold transition-colors">Каталог</a>
            <a href="#about" className="hover:text-gold transition-colors">О фабрике</a>
            <a href="#contacts" className="hover:text-gold transition-colors">Контакты</a>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="relative pt-44 pb-24 overflow-hidden">
        <div className="container">
          <p className="animate-fade-in text-gold text-xs tracking-mega uppercase mb-8" style={{ animationDelay: '0.05s' }}>
            Электронный каталог
          </p>
          <h1 className="animate-fade-in font-display text-6xl md:text-8xl lg:text-9xl leading-[0.9] mb-10" style={{ animationDelay: '0.15s' }}>
            Мягкая и садовая
            <br />
            <span className="not-italic text-gold">мебель</span>
          </h1>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 max-w-5xl">
            <a
              href="#catalog"
              className="animate-fade-in group flex items-center gap-3 text-sm tracking-widest uppercase shrink-0"
              style={{ animationDelay: '0.3s' }}
            >
              <span className="border-b border-gold/40 pb-1 group-hover:border-gold transition-colors">Смотреть каталог</span>
              <Icon name="ArrowDown" size={16} className="text-gold" />
            </a>
          </div>
        </div>
      </section>

      {/* CATALOG */}
      <section id="catalog" className="py-24">
        <div className="container">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
            <div>
              <p className="text-gold text-xs tracking-mega uppercase mb-4">Коллекция</p>
              <h2 className="font-display text-5xl md:text-7xl">Наши изделия</h2>
            </div>
            <p className="text-muted-foreground max-w-xs text-sm">
              Все товары производятся на собственной фабрике полного цикла.
            </p>
          </div>

          {/* Search */}
          <div className="relative mb-6 max-w-sm">
            <Icon name="Search" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по названию..."
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-full border border-border bg-background focus:outline-none focus:border-gold/60 transition-colors"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-14">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setActive(c.id)}
                className={`px-5 py-2.5 text-sm tracking-wide rounded-full border transition-all duration-300 ${
                  active === c.id
                    ? 'bg-gold text-white border-gold'
                    : 'border-border text-foreground hover:border-gold/60 hover:text-foreground'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Grid */}
          {loading ? (
            <div className="py-20 text-center text-muted-foreground">Загрузка каталога...</div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">Товары не найдены</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((p, i) => (
                <article
                  key={p.id}
                  onClick={() => setSelectedProduct(p)}
                  className="group animate-fade-in cursor-pointer"
                  style={{ animationDelay: `${i * 0.06}s` }}
                >
                  <div className="relative overflow-hidden rounded-sm bg-white aspect-[16/10] mb-4 border border-border/30">
                    {p.img ? (
                      <img
                        src={p.img}
                        alt={p.name}
                        className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Icon name="Image" size={40} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    {p.tag && (
                      <span className="absolute top-3 left-3 text-[10px] tracking-widest uppercase px-3 py-1.5 rounded-full bg-background/70 backdrop-blur-sm border border-border/60 text-gold">
                        {p.tag}
                      </span>
                    )}
                    <div className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-gold text-primary-foreground flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500">
                      <Icon name="ArrowUpRight" size={16} />
                    </div>
                  </div>
                  <h3 className="font-display text-xl mb-1 group-hover:text-gold transition-colors">{p.name}</h3>
                  {p.price && (
                    <p className="text-gold font-medium text-sm">
                      {p.price.toLocaleString('ru-RU')} ₽
                      {p.old_price && (
                        <span className="ml-2 text-muted-foreground line-through font-normal">
                          {p.old_price.toLocaleString('ru-RU')} ₽
                        </span>
                      )}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="py-24 border-y border-border/60 bg-card/40">
        <div className="container grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-gold text-xs tracking-mega uppercase mb-6">О фабрике</p>
            <h2 className="font-display text-4xl md:text-6xl leading-tight mb-8">
              Полный цикл —<br />от нити до изделия
            </h2>
            <p className="text-muted-foreground text-lg mb-10 max-w-lg">
              С 2016 года мы создаём мягкую и садовую мебель. Сами производим нить,
              ткань-рогожку, металлические каркасы, декоры, пластиковые опоры и лозу
              для искусственного ротанга.
            </p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-6">
              {[
                { icon: 'Spool', t: 'Своя нить и ткань' },
                { icon: 'Frame', t: 'Металлокаркасы' },
                { icon: 'Sparkles', t: 'Декоры и опоры' },
                { icon: 'TreePine', t: 'Лоза и ротанг' },
              ].map((f) => (
                <div key={f.t} className="flex items-center gap-3">
                  <Icon name={f.icon} fallback="Check" size={22} className="text-gold shrink-0" />
                  <span className="text-sm">{f.t}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <img
              src="https://cdn.poehali.dev/projects/b868189f-856e-402d-ac84-8be0d1c2cc04/files/aa9ad76b-c7d2-4fbe-a6c0-8803d89da6d4.jpg"
              alt="Производство мебели"
              className="rounded-sm w-full aspect-square object-cover"
            />
            <div className="absolute -bottom-6 -left-6 bg-gold text-primary-foreground px-8 py-6 rounded-sm hidden sm:block">
              <p className="font-display text-4xl">550</p>
              <p className="text-xs tracking-widest uppercase">диванов ежедневно</p>
            </div>
          </div>
        </div>
      </section>

      {/* CONTACTS */}
      <section id="contacts" className="py-28">
        <div className="container text-center">
          <p className="text-gold text-xs tracking-mega uppercase mb-6">Сотрудничество</p>
          <h2 className="font-display text-4xl md:text-7xl mb-8 max-w-3xl mx-auto leading-tight">
            Работаем с крупными торговыми сетями
          </h2>
          <p className="text-muted-foreground text-lg mb-12 max-w-xl mx-auto">
            Хотите узнать больше о продукции или условиях поставки — свяжитесь с нами.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a className="px-8 py-4 rounded-full bg-gold text-primary-foreground text-sm tracking-widest uppercase hover:opacity-90 transition-opacity">
              Связаться с нами
            </a>
            <a href="mailto:info@vmm24.com" className="flex items-center gap-2 px-8 py-4 rounded-full border border-border text-sm tracking-widest hover:border-gold/60 transition-colors">
              <Icon name="Mail" size={15} className="text-gold shrink-0" />
              info@vmm24.com
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 py-10">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p className="font-display text-base text-foreground">Волжская мебельная мануфактура</p>
          <p>© 2024 ВММ. Все права защищены.</p>
        </div>
      </footer>

      {/* Модальное окно товара */}
      {selectedProduct && (
        <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}
    </div>
  );
};

export default Index;