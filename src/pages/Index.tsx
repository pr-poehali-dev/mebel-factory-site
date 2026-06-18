import { useState, useMemo } from 'react';
import Icon from '@/components/ui/icon';

interface Product {
  id: number;
  name: string;
  category: string;
  tag: string;
  image: string;
  desc: string;
}

const CATEGORIES = [
  { id: 'all', label: 'Все изделия' },
  { id: 'sofa', label: 'Диваны' },
  { id: 'armchair', label: 'Кресла' },
  { id: 'bed', label: 'Кровати' },
  { id: 'garden', label: 'Садовая мебель' },
  { id: 'cocoon', label: 'Коконы' },
];

const PRODUCTS: Product[] = [
  {
    id: 1,
    name: 'Прямой диван «Рогожка»',
    category: 'sofa',
    tag: 'Мягкая мебель',
    image: 'https://cdn.poehali.dev/projects/b868189f-856e-402d-ac84-8be0d1c2cc04/files/aa9ad76b-c7d2-4fbe-a6c0-8803d89da6d4.jpg',
    desc: 'Обивка из ткани рогожки собственного производства, металлический каркас.',
  },
  {
    id: 2,
    name: 'Модульный угловой диван',
    category: 'sofa',
    tag: 'Мягкая мебель',
    image: 'https://cdn.poehali.dev/projects/b868189f-856e-402d-ac84-8be0d1c2cc04/files/17a152a5-2f44-4088-97ca-10c0769b0157.jpg',
    desc: 'Просторная L-форма, прочный каркас и пластиковые опоры собственного производства.',
  },
  {
    id: 3,
    name: 'Кресло акцентное',
    category: 'armchair',
    tag: 'Мягкая мебель',
    image: 'https://cdn.poehali.dev/projects/b868189f-856e-402d-ac84-8be0d1c2cc04/files/b5fcf403-6aaa-499a-93fa-a544420b878f.jpg',
    desc: 'Фактурная ткань, выразительный силуэт и фирменные декоры.',
  },
  {
    id: 4,
    name: 'Кровать с мягким изголовьем',
    category: 'bed',
    tag: 'Спальня',
    image: 'https://cdn.poehali.dev/projects/b868189f-856e-402d-ac84-8be0d1c2cc04/files/6b644bf1-8acb-46aa-82f0-4c6af28f1e2b.jpg',
    desc: 'Мягкое изголовье, обивка из ткани рогожки, надёжный каркас.',
  },
  {
    id: 5,
    name: 'Комплект садовой мебели',
    category: 'garden',
    tag: 'Искусственный ротанг',
    image: 'https://cdn.poehali.dev/projects/b868189f-856e-402d-ac84-8be0d1c2cc04/files/495b1587-8c26-4b33-8f00-3aca3e86b22c.jpg',
    desc: 'Плетение из лозы собственного производства, устойчивость к погоде.',
  },
  {
    id: 6,
    name: 'Подвесной кокон',
    category: 'cocoon',
    tag: 'Новинка',
    image: 'https://cdn.poehali.dev/projects/b868189f-856e-402d-ac84-8be0d1c2cc04/files/93e1187e-d784-4c99-b52e-2dc3ff3b6368.jpg',
    desc: 'Уютное кресло-кокон из искусственного ротанга с мягкими подушками.',
  },
];

const Index = () => {
  const [active, setActive] = useState('all');

  const filtered = useMemo(
    () => (active === 'all' ? PRODUCTS : PRODUCTS.filter((p) => p.category === active)),
    [active]
  );

  return (
    <div className="min-h-screen bg-background bg-grain text-foreground">
      {/* HEADER */}
      <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-background/70 border-b border-border/60">
        <div className="container flex items-center justify-between h-20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-sm border border-gold/50 flex items-center justify-center">
              <span className="font-display text-gold text-2xl leading-none">М</span>
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
            <span className="italic text-gold">мебель</span>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map((p, i) => (
              <article
                key={p.id}
                className="group animate-fade-in cursor-pointer"
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                <div className="relative overflow-hidden rounded-sm bg-secondary aspect-[4/5] mb-5">
                  <img
                    src={p.image}
                    alt={p.name}
                    className="catalog-card-img w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <span className="absolute top-4 left-4 text-[10px] tracking-widest uppercase px-3 py-1.5 rounded-full bg-background/70 backdrop-blur-sm border border-border/60 text-gold">
                    {p.tag}
                  </span>
                  <div className="absolute bottom-4 right-4 w-11 h-11 rounded-full bg-gold text-primary-foreground flex items-center justify-center opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500">
                    <Icon name="ArrowUpRight" size={18} />
                  </div>
                </div>
                <h3 className="font-display text-2xl mb-1 group-hover:text-gold transition-colors">{p.name}</h3>
                <p className="text-sm text-muted-foreground">{p.desc}</p>
              </article>
            ))}
          </div>
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

      {/* CONTACTS / CTA */}
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
            <a href="mailto:info@vmm24.com" className="px-8 py-4 rounded-full border border-border text-sm tracking-widest hover:border-gold/60 transition-colors">
              info@vmm24.com
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border/60 py-12">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p className="font-display text-lg text-foreground">МЕБЕЛЬ · Фабрика полного цикла</p>
          <p>© 2026 · Все права защищены</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;