export const PRODUCTS_API = "https://functions.poehali.dev/1de099ca-e246-4fde-a95d-707c71ea4702";
export const UPLOAD_API = "https://functions.poehali.dev/5219b3ca-5238-4e07-b920-249a40248742";

export const FABRIC_OPTIONS = ["Велюр", "Рогожка", "Экокожа", "Жаккард", "Микровелюр", "Флок", "Шенилл"];
export const CATEGORY_OPTIONS = [
  { value: "sofa", label: "Диван" },
  { value: "armchair", label: "Кресло" },
  { value: "bed", label: "Кровать" },
  { value: "garden", label: "Садовая мебель" },
  { value: "cocoon", label: "Кокон" },
  { value: "fabric", label: "Ткань" },
];
export const ANGLE_OPTIONS = [
  { value: "", label: "Не указан" },
  { value: "straight", label: "Прямой" },
  { value: "corner", label: "Угловой" },
];

export interface ColorVariant {
  name: string;
  sku: string;
  icon: string;
  photos: string[];
}

export interface Product {
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

export type ProductForm = Omit<Product, "id" | "created_at">;

export const emptyColor = (): ColorVariant => ({ name: "", sku: "", icon: "", photos: [] });

export const emptyForm = (): ProductForm => ({
  name: "", category: "", price: null, old_price: null,
  img: "", tag: "", angle_type: "", fabric: [],
  description: "", specs: {}, colors: [], images: [],
  is_active: true, sku: "",
});
