import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import Icon from "@/components/ui/icon";

const PRODUCTS_API = "https://functions.poehali.dev/1de099ca-e246-4fde-a95d-707c71ea4702";
const UPLOAD_API = "https://functions.poehali.dev/5219b3ca-5238-4e07-b920-249a40248742";

const FABRIC_OPTIONS = ["Велюр", "Рогожка", "Экокожа", "Жаккард", "Микровелюр", "Флок", "Шенилл"];
const CATEGORY_OPTIONS = [
  { value: "sofa", label: "Диван" },
  { value: "armchair", label: "Кресло" },
  { value: "bed", label: "Кровать" },
  { value: "garden", label: "Садовая мебель" },
  { value: "cocoon", label: "Кокон" },
  { value: "fabric", label: "Ткань" },
];
const ANGLE_OPTIONS = [
  { value: "", label: "Не указан" },
  { value: "straight", label: "Прямой" },
  { value: "corner", label: "Угловой" },
];

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
  created_at: string;
  sku: string;
}

const emptyColor = (): ColorVariant => ({ name: "", sku: "", icon: "", photos: [] });

const emptyForm = (): Omit<Product, "id" | "created_at"> => ({
  name: "", category: "", price: null, old_price: null,
  img: "", tag: "", angle_type: "", fabric: [],
  description: "", specs: {}, colors: [], images: [],
  is_active: true, sku: "",
});

export default function Admin() {
  const [token, setToken] = useState(() => sessionStorage.getItem("admin_token") || "");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [specsText, setSpecsText] = useState("");
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState("");
  const csvRef = useRef<HTMLInputElement>(null);
  const mainPhotoRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  async function login() {
    setLoginLoading(true);
    const res = await fetch(`${PRODUCTS_API}?action=login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: passwordInput }),
    });
    setLoginLoading(false);
    if (res.ok) {
      sessionStorage.setItem("admin_token", passwordInput);
      setToken(passwordInput);
    } else {
      toast({ title: "Неверный пароль", variant: "destructive" });
    }
  }

  async function loadProducts() {
    setLoading(true);
    const res = await fetch(`${PRODUCTS_API}?action=all`, { headers: { "X-Admin-Token": token } });
    const data = await res.json();
    setProducts(data.products || []);
    setLoading(false);
  }

  useEffect(() => { if (token) loadProducts(); }, [token]);

  async function uploadFile(file: File, hint: string): Promise<string> {
    setUploading(hint);
    try {
      console.log("uploadFile start", hint, file.name, file.size);
      const reader = new FileReader();
      const base64: string = await new Promise(resolve => {
        reader.onload = e => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
      console.log("base64 ready, sending to", UPLOAD_API);
      const currentToken = sessionStorage.getItem("admin_token") || token;
      const res = await fetch(UPLOAD_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: base64, name: file.name, content_type: file.type, token: currentToken }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        toast({ title: `Ошибка загрузки: ${res.status} — ${data.error || JSON.stringify(data)}`, variant: "destructive" });
        return "";
      }
      return data.url || "";
    } finally {
      setUploading("");
    }
  }

  function openCreate() {
    setEditId(null);
    setForm(emptyForm());
    setSpecsText("");
    setUploading("");
    setDialogOpen(true);
  }

  function openEdit(p: Product) {
    setUploading("");
    setEditId(p.id);
    setForm({
      name: p.name, category: p.category, price: p.price, old_price: p.old_price,
      img: p.img, tag: p.tag, angle_type: p.angle_type,
      fabric: Array.isArray(p.fabric) ? p.fabric : [],
      description: p.description,
      specs: p.specs || {},
      colors: Array.isArray(p.colors)
        ? p.colors.map(c => typeof c === "string" ? { name: c, sku: "", icon: "", photos: [] } : c)
        : [],
      images: p.images || [],
      is_active: p.is_active, sku: p.sku,
    });
    setSpecsText(Object.entries(p.specs || {}).map(([k, v]) => `${k}: ${v}`).join("\n"));
    setDialogOpen(true);
  }

  function parseSpecs(text: string): Record<string, string> {
    const result: Record<string, string> = {};
    text.split("\n").forEach(line => {
      const idx = line.indexOf(":");
      if (idx > 0) result[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    });
    return result;
  }

  async function save() {
    if (!form.name.trim()) { toast({ title: "Укажите название", variant: "destructive" }); return; }
    setSaving(true);
    const payload = { ...form, specs: parseSpecs(specsText) };
    const url = editId ? `${PRODUCTS_API}?action=update&id=${editId}` : `${PRODUCTS_API}?action=create`;
    await fetch(url, {
      method: editId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json", "X-Admin-Token": token },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    setDialogOpen(false);
    toast({ title: editId ? "Товар обновлён" : "Товар добавлен" });
    loadProducts();
  }

  async function del(id: number, name: string) {
    if (!confirm(`Удалить "${name}"?`)) return;
    await fetch(`${PRODUCTS_API}?action=delete&id=${id}`, {
      method: "DELETE", headers: { "X-Admin-Token": token },
    });
    toast({ title: "Удалено" });
    loadProducts();
  }

  async function toggleActive(p: Product) {
    await fetch(`${PRODUCTS_API}?action=update&id=${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Admin-Token": token },
      body: JSON.stringify({ ...p, is_active: !p.is_active }),
    });
    loadProducts();
  }

  async function handleCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvLoading(true);
    const text = await file.text();
    const res = await fetch(`${PRODUCTS_API}?action=import_csv`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Admin-Token": token },
      body: JSON.stringify({ csv: text }),
    });
    const data = await res.json();
    setCsvLoading(false);
    toast({ title: `Импортировано: ${data.imported} товаров` });
    loadProducts();
    if (csvRef.current) csvRef.current.value = "";
  }

  function addColor() {
    setForm(f => ({ ...f, colors: [...f.colors, emptyColor()] }));
  }
  function removeColor(i: number) {
    setForm(f => ({ ...f, colors: f.colors.filter((_, idx) => idx !== i) }));
  }
  function updateColor(i: number, field: keyof ColorVariant, value: string | string[]) {
    setForm(f => {
      const colors = [...f.colors];
      colors[i] = { ...colors[i], [field]: value };
      return { ...f, colors };
    });
  }
  async function uploadColorIcon(i: number, file: File) {
    const url = await uploadFile(file, `icon-${i}`);
    if (url) updateColor(i, "icon", url);
  }
  async function uploadColorPhoto(i: number, file: File) {
    const url = await uploadFile(file, `color-photo-${i}`);
    if (url) {
      setForm(f => {
        const colors = [...f.colors];
        colors[i] = { ...colors[i], photos: [...colors[i].photos, url] };
        return { ...f, colors };
      });
    }
  }
  function removeColorPhoto(ci: number, pi: number) {
    setForm(f => {
      const colors = [...f.colors];
      colors[ci] = { ...colors[ci], photos: colors[ci].photos.filter((_, i) => i !== pi) };
      return { ...f, colors };
    });
  }

  async function uploadGeneralPhoto(file: File) {
    const url = await uploadFile(file, "general");
    if (url) setForm(f => ({ ...f, images: [...f.images, url] }));
  }
  function removeGeneralPhoto(i: number) {
    setForm(f => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }));
  }
  async function uploadMainPhoto(file: File) {
    const url = await uploadFile(file, "main");
    if (url) setForm(f => ({ ...f, img: url }));
  }

  const filtered = products.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    (p.category || "").toLowerCase().includes(search.toLowerCase())
  );

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-sm flex flex-col gap-5">
          <h1 className="text-2xl font-bold text-center">Вход в админку</h1>
          <div className="flex flex-col gap-2">
            <Label>Пароль</Label>
            <Input type="password" value={passwordInput}
              onChange={e => setPasswordInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && login()}
              placeholder="Введите пароль" />
          </div>
          <Button onClick={login} disabled={loginLoading}>
            {loginLoading ? "Проверяем..." : "Войти"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Управление каталогом</h1>
        <div className="flex gap-2">
          <Button onClick={openCreate} className="gap-2">
            <Icon name="Plus" size={16} />
            Добавить товар
          </Button>
          <Button variant="outline" onClick={() => { sessionStorage.removeItem("admin_token"); setToken(""); }} className="gap-2">
            <Icon name="LogOut" size={16} />
            Выйти
          </Button>
        </div>
      </div>

      <div className="px-6 py-5 flex flex-col gap-4">
        <div className="flex gap-3 items-center">
          <div className="relative flex-1 max-w-sm">
            <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Button variant="outline" size="sm" onClick={() => csvRef.current?.click()} disabled={csvLoading} className="gap-2">
            <Icon name="Upload" size={16} />
            {csvLoading ? "Загрузка..." : "Импорт CSV"}
          </Button>
          <input ref={csvRef} type="file" accept=".csv" className="hidden" onChange={handleCsv} />
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Загрузка...</div>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 w-16">Фото</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Название</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Категория</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Цена</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Статус</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-16 text-gray-400">Товары не найдены</td></tr>
                )}
                {filtered.map(p => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      {p.img
                        ? <img src={p.img} alt={p.name} className="w-12 h-10 object-cover rounded-lg bg-gray-100" />
                        : <div className="w-12 h-10 rounded-lg bg-gray-100 flex items-center justify-center"><Icon name="Image" size={16} className="text-gray-300" /></div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">{p.name}</span>
                      {p.tag && <span className="ml-2 text-xs text-orange-500 font-medium">{p.tag}</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{p.category || "—"}</td>
                    <td className="px-4 py-3">
                      {p.price ? <span className="font-medium">{p.price.toLocaleString("ru-RU")} ₽</span> : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={p.is_active ? "default" : "secondary"} className="cursor-pointer" onClick={() => toggleActive(p)}>
                        {p.is_active ? "Активен" : "Скрыт"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                          <Icon name="Pencil" size={16} />
                        </button>
                        <button onClick={() => toggleActive(p)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                          <Icon name={p.is_active ? "EyeOff" : "Eye"} size={16} />
                        </button>
                        <button onClick={() => del(p.id, p.name)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                          <Icon name="Trash2" size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filtered.length > 0 && <p className="text-sm text-gray-400">Всего товаров: {filtered.length}</p>}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Редактировать товар" : "Добавить товар"}</DialogTitle>
          </DialogHeader>

          {uploading && (
            <div className="bg-blue-50 text-blue-700 text-sm px-3 py-2 rounded-lg flex items-center gap-2">
              <Icon name="Loader" size={14} className="animate-spin" />
              Загружаем фото...
            </div>
          )}

          <div className="flex flex-col gap-5 mt-1">
            {/* Основное */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 flex flex-col gap-1">
                <Label>Название *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Диван Эссен левый" />
              </div>
              <div className="flex flex-col gap-1">
                <Label>Категория</Label>
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">— выберите —</option>
                  {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <Label>Тип угла</Label>
                <select
                  value={form.angle_type}
                  onChange={e => setForm({ ...form, angle_type: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {ANGLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <Label>Цена (₽) *</Label>
                <Input type="number" value={form.price ?? ""} onChange={e => setForm({ ...form, price: e.target.value ? +e.target.value : null })} placeholder="34999" />
              </div>
              <div className="flex flex-col gap-1">
                <Label>Старая цена (₽)</Label>
                <Input type="number" value={form.old_price ?? ""} onChange={e => setForm({ ...form, old_price: e.target.value ? +e.target.value : null })} placeholder="44999" />
              </div>
            </div>

            {/* Главное фото */}
            <div className="flex flex-col gap-2">
              <Label>Главное фото</Label>
              <div className="flex gap-2">
                <Input value={form.img} onChange={e => setForm({ ...form, img: e.target.value })} placeholder="https://..." className="flex-1" />
                <Button variant="outline" size="sm" className="gap-1" onClick={() => mainPhotoRef.current?.click()}>
                  <Icon name="Upload" size={14} />Загрузить
                </Button>
                <input ref={mainPhotoRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadMainPhoto(f); e.target.value = ""; }} />
              </div>
              {form.img && <img src={form.img} alt="" className="w-28 h-24 object-cover rounded-xl border" />}
            </div>

            {/* Тег */}
            <div className="flex flex-col gap-1">
              <Label>Тег</Label>
              <Input value={form.tag} onChange={e => setForm({ ...form, tag: e.target.value })} placeholder="Акция, Новинка..." />
            </div>

            {/* Тип угла уже выше, обивка */}
            <div className="flex flex-col gap-2">
              <Label>Обивка</Label>
              <div className="flex flex-wrap gap-4">
                {FABRIC_OPTIONS.map(opt => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={form.fabric.includes(opt)}
                      onCheckedChange={checked => setForm(f => ({
                        ...f,
                        fabric: checked ? [...f.fabric, opt] : f.fabric.filter(x => x !== opt),
                      }))}
                    />
                    <span className="text-sm">{opt}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Описание */}
            <div className="flex flex-col gap-1">
              <Label>Описание</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={4} placeholder="Описание товара..." />
            </div>

            {/* Характеристики */}
            <div className="flex flex-col gap-1">
              <Label>Характеристики <span className="text-gray-400 font-normal text-xs">(каждая с новой строки, формат: Название: Значение)</span></Label>
              <Textarea value={specsText} onChange={e => setSpecsText(e.target.value)} rows={5}
                placeholder={"Основа сиденья: ламели (латы);\nКаркас: металл;\nРазмеры: 218 x 90 x 152 см"} />
            </div>

            {/* Варианты цветов */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <Label>Варианты цветов</Label>
                <Button variant="outline" size="sm" onClick={addColor} className="gap-1">
                  <Icon name="Plus" size={14} />
                  Добавить цвет
                </Button>
              </div>

              {form.colors.map((color, i) => (
                <div key={i} className="border rounded-xl p-4 flex flex-col gap-3 bg-gray-50">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-500 w-5">{i + 1}.</span>
                    <Input value={color.name} onChange={e => updateColor(i, "name", e.target.value)} placeholder="Название цвета" className="flex-1 bg-white" />
                    <button onClick={() => removeColor(i)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                      <Icon name="Trash2" size={16} />
                    </button>
                  </div>

                  <Input value={color.sku} onChange={e => updateColor(i, "sku", e.target.value)} placeholder="Артикул (SKU)" className="bg-white" />

                  <div className="flex items-center gap-3">
                    {color.icon
                      ? <img src={color.icon} alt="" className="w-10 h-10 rounded-full object-cover border" />
                      : <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center"><Icon name="Image" size={14} className="text-gray-400" /></div>}
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-gray-500">Иконка цвета (маленькое круглое фото)</span>
                      <label className="cursor-pointer">
                        <Button variant="outline" size="sm" className="gap-1 pointer-events-none h-7 text-xs bg-white" asChild>
                          <span><Icon name="Upload" size={12} />Загрузить иконку</span>
                        </Button>
                        <input type="file" accept="image/*" className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) uploadColorIcon(i, f); e.target.value = ""; }} />
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Фото для этого цвета</span>
                      <label className="cursor-pointer">
                        <Button variant="outline" size="sm" className="gap-1 pointer-events-none h-7 text-xs bg-white" asChild>
                          <span><Icon name="Upload" size={12} />Загрузить фото</span>
                        </Button>
                        <input type="file" accept="image/*" className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) uploadColorPhoto(i, f); e.target.value = ""; }} />
                      </label>
                    </div>
                    {color.photos.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {color.photos.map((photo, pi) => (
                          <div key={pi} className="relative group">
                            <img src={photo} alt="" className="w-16 h-14 object-cover rounded-lg border" />
                            <button onClick={() => removeColorPhoto(i, pi)}
                              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Icon name="X" size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Общие фото */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>Общие фото товара <span className="text-gray-400 font-normal text-xs">(показываются по умолчанию)</span></Label>
                <label className="cursor-pointer">
                  <Button variant="outline" size="sm" className="gap-1 pointer-events-none" asChild>
                    <span><Icon name="Upload" size={14} />Загрузить фото</span>
                  </Button>
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadGeneralPhoto(f); e.target.value = ""; }} />
                </label>
              </div>
              <Textarea
                value={form.images.join("\n")}
                onChange={e => setForm({ ...form, images: e.target.value.split("\n").map(s => s.trim()).filter(Boolean) })}
                rows={3} placeholder={"https://...\nhttps://..."}
              />
              {form.images.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.images.map((photo, i) => (
                    <div key={i} className="relative group">
                      <img src={photo} alt="" className="w-16 h-14 object-cover rounded-lg border" />
                      <button onClick={() => removeGeneralPhoto(i)}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Icon name="X" size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
              <Label>Показывать на сайте</Label>
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t mt-2">
            <Button onClick={save} disabled={saving || !!uploading} className="flex-1">
              {saving ? "Сохраняем..." : "Сохранить изменения"}
            </Button>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}