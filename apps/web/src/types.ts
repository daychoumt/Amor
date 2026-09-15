export type Supplier = {
  id: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  createdAt: string;
};

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
  categoryName?: string;
  supplierId?: string;
  initialStock?: number;
};

export type NewSupplier = {
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
};

export type MovementType = 'ENTRY' | 'EXIT';

export type StockMovement = {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  type: MovementType;
  quantity: number;
  reason: string;
  stockBefore: number;
  stockAfter: number;
  createdAt: string;
};
