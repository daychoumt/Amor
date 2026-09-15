export type SaleUnit = 'UNIT' | 'HUNDRED' | 'TRAY';

export type SnackProduct = {
  id: string;
  name: string;
  category: string;
  saleUnit: SaleUnit;
  salePrice: number;
  estimatedCost: number;
  active: boolean;
  createdAt: string;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  neighborhood: string;
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
  orderKind: OrderKind;
  fulfillment: FulfillmentType;
  deliveryDate: string;
  deliveryTime: string;
  address: string;
  notes: string;
  items: OrderItem[];
  total: number;
  paidAmount: number;
  status: OrderStatus;
  createdAt: string;
};

export type NewSnackProduct = Omit<SnackProduct, 'id' | 'createdAt'>;
export type NewCustomer = Omit<Customer, 'id' | 'createdAt'>;

export type NewOrder = {
  customerId: string;
  orderKind: OrderKind;
  fulfillment: FulfillmentType;
  deliveryDate: string;
  deliveryTime: string;
  address: string;
  notes: string;
  items: OrderItem[];
  paidAmount: number;
};
