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
  main_image: string;
  category: string;
  gallery: string[];
  product_type: string;
  material: string;
  description: string;
  specs: Record<string, string>;
  is_active: boolean;
  created_at: string;
}

const emptyProduct: Omit<Product, "id" | "created_at"> = {
  name: "",
  main_image: "",
  category: "",
  gallery: [],
  product_type: "",
  material: "",
  description: "",
  specs: {},
  is_active: true,
};

export default function Admin() {
  const [token, setToken] = useState(() => sessionStorage.getItem("admin_token") || "");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Omit<Product, "id" | "created_at">>(emptyProduct);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [specsText, setSpecsText] = useState("");
  const [galleryText, setGalleryText] = useState("");
  const [search, setSearch] = useState("");
  const csvRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const isLoggedIn = !!token;

  async function login() {
    setLoginLoading(true);
    const res = await fetch(`${API}?action=login`, {
      method: "POST",
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

  useEffect(() => {
    if (isLoggedIn) loadProducts();
  }, [isLoggedIn]);

  function openCreate() {
    setEditId(null);
    setEditProduct(emptyProduct);
    setSpecsText("");
    setGalleryText("");
    setDialogOpen(true);
  }

  function openEdit(p: Product) {
    setEditId(p.id);
    setEditProduct({
      name: p.name,
      main_image: p.main_image,
      category: p.category,
      gallery: p.gallery || [],
      product_type: p.product_type,
      material: p.material,
      description: p.description,
      specs: p.specs || {},
      is_active: p.is_active,
    });
    setSpecsText(
      Object.entries(p.specs || {})
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n")
    );
    setGalleryText((p.gallery || []).join("\n"));
    setDialogOpen(true);
  }

  function parseSpecs(text: string): Record<string, string> {
    const result: Record<string, string> = {};
    text.split("\n").forEach((line) => {
      const idx = line.indexOf(":");
      if (idx > 0) {
        result[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
      }
    });
    return result;
  }

  async function saveProduct() {
    if (!editProduct.name.trim()) {
      toast({ title: "Укажите название товара", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      ...editProduct,
      gallery: galleryText.split("\n").map((s) => s.trim()).filter(Boolean),
      specs: parseSpecs(specsText),
    };
    const url = editId
      ? `${API}?action=update&id=${editId}`
      : `${API}?action=create`;
    const method = editId ? "PUT" : "POST";
    await fetch(url, {
      method,
      headers: { "X-Admin-Token": token },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    setDialogOpen(false);
    toast({ title: editId ? "Товар обновлён" : "Товар добавлен" });
    loadProducts();
  }

  async function deleteProduct(id: number, name: string) {
    if (!confirm(`Удалить товар "${name}"?`)) return;
    await fetch(`${API}?action=delete&id=${id}`, {
      method: "DELETE",
      headers: { "X-Admin-Token": token },
    });
    toast({ title: "Товар удалён" });
    loadProducts();
  }

  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvLoading(true);
    const text = await file.text();
    const res = await fetch(`${API}?action=import_csv`, {
      method: "POST",
      headers: { "X-Admin-Token": token },
      body: JSON.stringify({ csv: text }),
    });
    const data = await res.json();
    setCsvLoading(false);
    toast({ title: `Импортировано ${data.imported} товаров` });
    loadProducts();
    if (csvRef.current) csvRef.current.value = "";
  }

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category || "").toLowerCase().includes(search.toLowerCase())
  );

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-sm flex flex-col gap-5">
          <h1 className="text-2xl font-bold text-center">Вход в админку</h1>
          <div className="flex flex-col gap-2">
            <Label>Пароль</Label>
            <Input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()}
              placeholder="Введите пароль"
            />
          </div>
          <Button onClick={login} disabled={loginLoading}>
            {loginLoading ? "Проверяем..." : "Войти"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Управление товарами</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { sessionStorage.removeItem("admin_token"); setToken(""); }}>
            <Icon name="LogOut" size={16} />
            Выйти
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <Input
            placeholder="Поиск по названию или категории..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => csvRef.current?.click()} disabled={csvLoading}>
              <Icon name="Upload" size={16} />
              {csvLoading ? "Загрузка..." : "Импорт CSV"}
            </Button>
            <input ref={csvRef} type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
            <Button size="sm" onClick={openCreate}>
              <Icon name="Plus" size={16} />
              Добавить товар
            </Button>
          </div>
        </div>

        {/* CSV подсказка */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700">
          <b>Формат CSV:</b> name, main_image, category, gallery, product_type, material, description, specs<br />
          gallery — ссылки через <code>|</code>, specs — пары <code>Ключ: Значение</code> через <code>;</code>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Загрузка...</div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Фото</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Название</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Категория</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Тип</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Статус</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-gray-400">
                      Товары не найдены
                    </td>
                  </tr>
                )}
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {p.main_image ? (
                        <img src={p.main_image} alt={p.name} className="w-12 h-12 object-cover rounded-lg" />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Icon name="Image" size={18} className="text-gray-400" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-gray-500">{p.category || "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{p.product_type || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={p.is_active ? "default" : "secondary"}>
                        {p.is_active ? "Активен" : "Скрыт"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                          <Icon name="Pencil" size={15} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteProduct(p.id, p.name)}>
                          <Icon name="Trash2" size={15} className="text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Диалог добавления/редактирования */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Редактировать товар" : "Добавить товар"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 flex flex-col gap-1">
                <Label>Название *</Label>
                <Input value={editProduct.name} onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })} placeholder="Диван Лилерти" />
              </div>
              <div className="flex flex-col gap-1">
                <Label>Категория</Label>
                <Input value={editProduct.category} onChange={(e) => setEditProduct({ ...editProduct, category: e.target.value })} placeholder="sofa, garden..." />
              </div>
              <div className="flex flex-col gap-1">
                <Label>Тип товара</Label>
                <Input value={editProduct.product_type} onChange={(e) => setEditProduct({ ...editProduct, product_type: e.target.value })} placeholder="угловой, прямой..." />
              </div>
              <div className="col-span-2 flex flex-col gap-1">
                <Label>Главное фото (ссылка)</Label>
                <Input value={editProduct.main_image} onChange={(e) => setEditProduct({ ...editProduct, main_image: e.target.value })} placeholder="https://..." />
              </div>
              <div className="col-span-2 flex flex-col gap-1">
                <Label>Фото с разных ракурсов (каждое с новой строки)</Label>
                <Textarea
                  value={galleryText}
                  onChange={(e) => setGalleryText(e.target.value)}
                  placeholder={"https://фото1.jpg\nhttps://фото2.jpg"}
                  rows={3}
                />
              </div>
              <div className="col-span-2 flex flex-col gap-1">
                <Label>Материал</Label>
                <Input value={editProduct.material} onChange={(e) => setEditProduct({ ...editProduct, material: e.target.value })} placeholder="велюр, рогожка..." />
              </div>
              <div className="col-span-2 flex flex-col gap-1">
                <Label>Описание</Label>
                <Textarea value={editProduct.description} onChange={(e) => setEditProduct({ ...editProduct, description: e.target.value })} rows={3} placeholder="Краткое описание товара" />
              </div>
              <div className="col-span-2 flex flex-col gap-1">
                <Label>Характеристики (каждая с новой строки: Ключ: Значение)</Label>
                <Textarea
                  value={specsText}
                  onChange={(e) => setSpecsText(e.target.value)}
                  placeholder={"Ширина: 240 см\nГлубина: 90 см\nВысота: 85 см"}
                  rows={4}
                />
              </div>
              <div className="col-span-2 flex items-center gap-3">
                <Switch
                  checked={editProduct.is_active}
                  onCheckedChange={(v) => setEditProduct({ ...editProduct, is_active: v })}
                />
                <Label>Показывать на сайте</Label>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
              <Button onClick={saveProduct} disabled={saving}>
                {saving ? "Сохраняем..." : "Сохранить"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
