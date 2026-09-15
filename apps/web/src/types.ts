export type Product = {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  costPrice: string;
  salePrice: string;
  currentStock: number;
  minimumStock: number;
  category?: { id: string; name: string } | null;
  supplier?: { id: string; name: string } | null;
};

export type NewProduct = {
  sku: string;
  name: string;
  costPrice: number;
  salePrice: number;
  minimumStock: number;
};
