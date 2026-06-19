import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import Icon from "@/components/ui/icon";

const API = "https://functions.poehali.dev/1de099ca-e246-4fde-a95d-707c71ea4702";

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
  colors: string[];
  images: string[];
  is_active: boolean;
  created_at: string;
  sku: string;
}

const empty: Omit<Product, "id" | "created_at"> = {
  name: "", category: "", price: null, old_price: null,
  img: "", tag: "", angle_type: "", fabric: [],
  description: "", specs: {}, colors: [], images: [],
  is_active: true, sku: "",
};

export default function Admin() {
  const [token, setToken] = useState(() => sessionStorage.getItem("admin_token") || "");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<Omit<Product, "id" | "created_at">>(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [specsText, setSpecsText] = useState("");
  const [imagesText, setImagesText] = useState("");
  const [fabricText, setFabricText] = useState("");
  const [colorsText, setColorsText] = useState("");
  const [search, setSearch] = useState("");
  const csvRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  async function login() {
    setLoginLoading(true);
    const res = await fetch(`${API}?action=login`, {
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
    const res = await fetch(`${API}?action=all`, {
      headers: { "X-Admin-Token": token },
    });
    const data = await res.json();
    setProducts(data.products || []);
    setLoading(false);
  }

  useEffect(() => { if (token) loadProducts(); }, [token]);

  function openCreate() {
    setEditId(null);
    setForm(empty);
    setSpecsText(""); setImagesText(""); setFabricText(""); setColorsText("");
    setDialogOpen(true);
  }

  function openEdit(p: Product) {
    setEditId(p.id);
    setForm({
      name: p.name, category: p.category, price: p.price, old_price: p.old_price,
      img: p.img, tag: p.tag, angle_type: p.angle_type, fabric: p.fabric || [],
      description: p.description, specs: p.specs || {}, colors: p.colors || [],
      images: p.images || [], is_active: p.is_active, sku: p.sku,
    });
    setSpecsText(Object.entries(p.specs || {}).map(([k, v]) => `${k}: ${v}`).join("\n"));
    setImagesText((p.images || []).join("\n"));
    setFabricText((p.fabric || []).join("\n"));
    setColorsText((p.colors || []).join("\n"));
    setDialogOpen(true);
  }

  function parseSpecs(text: string): Record<string, string> {
    const result: Record<string, string> = {};
    text.split("\n").forEach((line) => {
      const idx = line.indexOf(":");
      if (idx > 0) result[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    });
    return result;
  }

  async function save() {
    if (!form.name.trim()) { toast({ title: "Укажите название", variant: "destructive" }); return; }
    setSaving(true);
    const payload = {
      ...form,
      images: imagesText.split("\n").map(s => s.trim()).filter(Boolean),
      fabric: fabricText.split("\n").map(s => s.trim()).filter(Boolean),
      colors: colorsText.split("\n").map(s => s.trim()).filter(Boolean),
      specs: parseSpecs(specsText),
    };
    const url = editId ? `${API}?action=update&id=${editId}` : `${API}?action=create`;
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
    await fetch(`${API}?action=delete&id=${id}`, {
      method: "DELETE",
      headers: { "X-Admin-Token": token },
    });
    toast({ title: "Удалено" });
    loadProducts();
  }

  async function toggleActive(p: Product) {
    await fetch(`${API}?action=update&id=${p.id}`, {
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
    const res = await fetch(`${API}?action=import_csv`, {
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
      {/* Шапка */}
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
        {/* Панель поиска и импорта */}
        <div className="flex gap-3 items-center">
          <div className="relative flex-1 max-w-sm">
            <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Поиск по названию или категории..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => csvRef.current?.click()} disabled={csvLoading} className="gap-2">
            <Icon name="Upload" size={16} />
            {csvLoading ? "Загрузка..." : "Импорт CSV"}
          </Button>
          <input ref={csvRef} type="file" accept=".csv" className="hidden" onChange={handleCsv} />
        </div>

        {/* Таблица */}
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
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-gray-400">
                      Товары не найдены
                    </td>
                  </tr>
                )}
                {filtered.map(p => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      {p.img ? (
                        <img src={p.img} alt={p.name} className="w-12 h-10 object-cover rounded-lg bg-gray-100" />
                      ) : (
                        <div className="w-12 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <Icon name="Image" size={16} className="text-gray-300" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">{p.name}</span>
                      {p.tag && (
                        <span className="ml-2 text-xs text-orange-500 font-medium">{p.tag}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{p.category || "—"}</td>
                    <td className="px-4 py-3">
                      {p.price ? (
                        <span className="font-medium text-gray-900">
                          {p.price.toLocaleString("ru-RU")} ₽
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={p.is_active ? "default" : "secondary"}
                        className="cursor-pointer select-none"
                        onClick={() => toggleActive(p)}
                      >
                        {p.is_active ? "Активен" : "Скрыт"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => openEdit(p)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                        >
                          <Icon name="Pencil" size={16} />
                        </button>
                        <button
                          onClick={() => toggleActive(p)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                        >
                          <Icon name={p.is_active ? "EyeOff" : "Eye"} size={16} />
                        </button>
                        <button
                          onClick={() => del(p.id, p.name)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        >
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

        {filtered.length > 0 && (
          <p className="text-sm text-gray-400">Всего товаров: {filtered.length}</p>
        )}
      </div>

      {/* Диалог добавления/редактирования */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Редактировать товар" : "Добавить товар"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="col-span-2 flex flex-col gap-1">
              <Label>Название *</Label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Диван Лилерти" />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Категория</Label>
              <Input value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="sofa, garden..." />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Тип (angle_type)</Label>
              <Input value={form.angle_type} onChange={e => setForm({...form, angle_type: e.target.value})} placeholder="угловой, прямой..." />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Цена</Label>
              <Input type="number" value={form.price ?? ""} onChange={e => setForm({...form, price: e.target.value ? +e.target.value : null})} placeholder="15999" />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Старая цена</Label>
              <Input type="number" value={form.old_price ?? ""} onChange={e => setForm({...form, old_price: e.target.value ? +e.target.value : null})} placeholder="19999" />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Тег</Label>
              <Input value={form.tag} onChange={e => setForm({...form, tag: e.target.value})} placeholder="Акция, Новинка..." />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Артикул (SKU)</Label>
              <Input value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} placeholder="SKU-001" />
            </div>
            <div className="col-span-2 flex flex-col gap-1">
              <Label>Главное фото (img)</Label>
              <Input value={form.img} onChange={e => setForm({...form, img: e.target.value})} placeholder="https://..." />
            </div>
            <div className="col-span-2 flex flex-col gap-1">
              <Label>Фото товара (images) — каждое с новой строки</Label>
              <Textarea value={imagesText} onChange={e => setImagesText(e.target.value)} rows={3} placeholder={"https://фото1.jpg\nhttps://фото2.jpg"} />
            </div>
            <div className="col-span-2 flex flex-col gap-1">
              <Label>Цвета — каждый с новой строки</Label>
              <Textarea value={colorsText} onChange={e => setColorsText(e.target.value)} rows={2} placeholder={"Серый\nБежевый"} />
            </div>
            <div className="col-span-2 flex flex-col gap-1">
              <Label>Ткань / Материал — каждый с новой строки</Label>
              <Textarea value={fabricText} onChange={e => setFabricText(e.target.value)} rows={2} placeholder={"Велюр\nРогожка"} />
            </div>
            <div className="col-span-2 flex flex-col gap-1">
              <Label>Описание</Label>
              <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} placeholder="Краткое описание товара" />
            </div>
            <div className="col-span-2 flex flex-col gap-1">
              <Label>Характеристики — каждая с новой строки: Ключ: Значение</Label>
              <Textarea value={specsText} onChange={e => setSpecsText(e.target.value)} rows={4} placeholder={"Ширина: 240 см\nГлубина: 90 см"} />
            </div>
            <div className="col-span-2 flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={v => setForm({...form, is_active: v})} />
              <Label>Показывать на сайте</Label>
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-3">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Сохраняем..." : "Сохранить"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
