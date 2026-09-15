export type SaleUnit = 'UNIT' | 'HUNDRED' | 'TRAY' | 'KIT';
export type ProductKind = 'SNACK' | 'COMBO';
export type IngredientUnit = 'g' | 'kg' | 'ml' | 'l' | 'un';

export type RecipeIngredient = {
  id: string;
  name: string;
  quantity: number;
  unit: IngredientUnit;
  estimatedCost: number;
};

export type ComboItem = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
};

export type SnackProduct = {
  id: string;
  name: string;
  category: string;
  kind: ProductKind;
  saleUnit: SaleUnit;
  salePrice: number;
  estimatedCost: number;
  active: boolean;
  preparationNotes: string;
  recipe: RecipeIngredient[];
  comboItems: ComboItem[];
  createdAt: string;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  neighborhood: string;
  address: string;
  notes: string;
  createdAt: string;
};

export type OrderStatus =
  | 'QUOTE'
  | 'CONFIRMED'
  | 'PRODUCTION'
  | 'READY'
  | 'DELIVERED'
  | 'CANCELLED';

export type OrderKind = 'PARTY' | 'DIRECT';
export type FulfillmentType = 'PICKUP' | 'DELIVERY';
export type PaymentMethod = 'PIX' | 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER';

export type OrderItem = {
  id: string;
  productId: string;
  productName: string;
  saleUnit: SaleUnit;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type Order = {
  id: string;
  code: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  eventName: string;
  orderKind: OrderKind;
  fulfillment: FulfillmentType;
  deliveryDate: string;
  deliveryTime: string;
  address: string;
  notes: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  paidAmount: number;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
};

export type NewSnackProduct = Omit<SnackProduct, 'id' | 'createdAt'>;
export type NewCustomer = Omit<Customer, 'id' | 'createdAt'>;

export type NewOrder = {
  customerId: string;
  eventName: string;
  orderKind: OrderKind;
  fulfillment: FulfillmentType;
  deliveryDate: string;
  deliveryTime: string;
  address: string;
  notes: string;
  items: OrderItem[];
  discount: number;
  deliveryFee: number;
  paidAmount: number;
  paymentMethod: PaymentMethod;
};

export type BusinessSettings = {
  businessName: string;
  whatsapp: string;
  dailyCapacity: number;
};

export type BackupPayload = {
  version: 2;
  exportedAt: string;
  products: SnackProduct[];
  customers: Customer[];
  orders: Order[];
  settings: BusinessSettings;
};
