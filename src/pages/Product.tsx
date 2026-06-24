import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';

const API = "https://functions.poehali.dev/1de099ca-e246-4fde-a95d-707c71ea4702";

const CATEGORY_LABEL: Record<string, string> = {
  sofa: 'Диван',
  armchair: 'Кресло',
  bed: 'Кровать',
  garden: 'Садовая мебель',
  cocoon: 'Кокон',
  fabric: 'Ткань',
};

interface ColorVariant {
  name: string;
  sku: string;
  icon: string;
  photos: string[];
}

interface Product {
  id: number;
  name: string;
  category: string;
  price: number | null;
  old_price: number | null;
  img: string;
  tag: string;
  angle_type: string;
  fabric: string[];
  description: string;
  specs: Record<string, string>;
  colors: ColorVariant[];
  images: string[];
  is_active: boolean;
  sku: string;
}

export default function Product() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedColor, setSelectedColor] = useState<number>(0);
  const [activePhoto, setActivePhoto] = useState<string>('');

  useEffect(() => {
    fetch(API)
      .then(r => r.json())
      .then(d => {
        const found = (d.products || []).find((p: Product) => String(p.id) === String(id));
        setProduct(found || null);
        if (found) {
          const firstPhoto = found.img || found.images?.[0] || '';
          setActivePhoto(firstPhoto);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!product) return;
    const colors = Array.isArray(product.colors) ? product.colors : [];
    const color = colors[selectedColor];
    const firstPhoto = color?.photos?.length
      ? color.photos[0]
      : product.img || product.images?.[0] || '';
    setActivePhoto(firstPhoto);
  }, [selectedColor, product]);

  const allPhotos = (() => {
    if (!product) return [];
    const colors = product.colors || [];
    const color = colors[selectedColor];
    if (color?.photos?.length) return color.photos;
    const imgs = product.images || [];
    return product.img ? [product.img, ...imgs.filter(i => i !== product.img)] : imgs;
  })();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Загрузка...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Товар не найден</p>
        <button onClick={() => navigate('/')} className="text-gold underline text-sm">На главную</button>
      </div>
    );
  }

  const colors = Array.isArray(product.colors)
    ? product.colors.map(c => typeof c === 'string' ? { name: c, sku: '', icon: '', photos: [] } : c)
    : [];

  const specs = product.specs && typeof product.specs === 'object' ? product.specs : {};

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Шапка */}
      <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-background/70 border-b border-border/60">
        <div className="container flex items-center h-20 gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-gold transition-colors"
          >
            <Icon name="ArrowLeft" size={16} />
            Назад
          </button>
          <span className="text-border/60">|</span>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-sm border border-gold/50 flex items-center justify-center overflow-hidden">
              <img src="https://cdn.poehali.dev/projects/b868189f-856e-402d-ac84-8be0d1c2cc04/bucket/8c435106-11a8-4f69-9bac-e649551a8a4e.png" alt="Логотип" className="w-full h-full object-contain p-0.5" />
            </div>
            <span className="font-display text-base tracking-wide">Волжская мебельная мануфактура</span>
          </div>
        </div>
      </header>

      <div className="container pt-28 pb-20">
        {/* Хлебные крошки */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-8">
          <button onClick={() => navigate('/')} className="hover:text-gold transition-colors">Каталог</button>
          <span>/</span>
          <span className="text-foreground">{product.name}</span>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Галерея */}
          <div className="flex flex-col gap-3">
            <div className="relative rounded-sm overflow-hidden bg-secondary aspect-[4/3]">
              {activePhoto ? (
                <img src={activePhoto} alt={product.name} className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <Icon name="Image" size={48} />
                </div>
              )}
              {product.tag && (
                <span className="absolute top-4 left-4 text-[10px] tracking-widest uppercase px-3 py-1.5 rounded-full bg-background/70 backdrop-blur-sm border border-border/60 text-gold">
                  {product.tag}
                </span>
              )}
            </div>
            {/* Миниатюры */}
            {allPhotos.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {allPhotos.map((photo, i) => (
                  <button
                    key={i}
                    onClick={() => setActivePhoto(photo)}
                    className={`w-16 h-14 rounded-sm overflow-hidden border-2 transition-all ${
                      activePhoto === photo ? 'border-gold' : 'border-transparent hover:border-border'
                    }`}
                  >
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Инфо */}
          <div className="flex flex-col gap-6">
            {product.category && (
              <p className="text-gold text-xs tracking-mega uppercase">{CATEGORY_LABEL[product.category] || product.category}</p>
            )}
            <h1 className="font-display text-4xl md:text-5xl leading-tight">{product.name}</h1>

            {/* Цена */}
            {product.price && (
              <div className="flex items-baseline gap-3">
                <span className="font-display text-3xl text-gold">{product.price.toLocaleString('ru-RU')} ₽</span>
                {product.old_price && (
                  <span className="text-muted-foreground line-through text-lg">{product.old_price.toLocaleString('ru-RU')} ₽</span>
                )}
              </div>
            )}

            {/* Варианты цветов */}
            {colors.length > 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-sm font-medium">
                  Варианты цветов:
                  <span className="text-gold ml-2">{colors[selectedColor]?.name}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {colors.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedColor(i)}
                      title={c.name}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition-all ${
                        selectedColor === i
                          ? 'border-gold text-gold bg-gold/10'
                          : 'border-border hover:border-gold/50'
                      }`}
                    >
                      {c.icon && (
                        <img src={c.icon} alt={c.name} className="w-5 h-5 rounded-full object-cover" />
                      )}
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Обивка */}
            {Array.isArray(product.fabric) && product.fabric.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Обивка:</p>
                <div className="flex flex-wrap gap-2">
                  {product.fabric.map((f, i) => (
                    <span key={i} className="px-3 py-1 text-sm border border-border rounded-full text-muted-foreground">{f}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Описание */}
            {product.description && (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Описание:</p>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{product.description}</p>
              </div>
            )}

            {/* Артикул */}
            {product.sku && (
              <p className="text-xs text-muted-foreground">Артикул: {product.sku}</p>
            )}
          </div>
        </div>

        {/* Характеристики */}
        {Object.keys(specs).length > 0 && (
          <div className="mt-16">
            <p className="text-gold text-xs tracking-mega uppercase mb-6">Технические данные</p>
            <h2 className="font-display text-3xl mb-8">Характеристики</h2>
            <div className="grid md:grid-cols-2 gap-0 border border-border rounded-sm overflow-hidden">
              {Object.entries(specs).map(([key, val], i) => (
                <div key={i} className={`flex justify-between px-5 py-3.5 text-sm border-b border-border/60 ${i % 2 === 0 ? 'bg-card/30' : ''}`}>
                  <span className="text-muted-foreground">{key}</span>
                  <span className="font-medium text-right max-w-[60%]">{val}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}