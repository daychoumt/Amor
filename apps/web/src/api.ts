import type {
  BackupPayload,
  BusinessSettings,
  Customer,
  NewCustomer,
  NewOrder,
  NewSnackProduct,
  Order,
  OrderStatus,
  SnackProduct,
} from './types';

const PRODUCTS_KEY = 'noor-salgados:products';
const CUSTOMERS_KEY = 'noor-salgados:customers';
const ORDERS_KEY = 'noor-salgados:orders';
const SETTINGS_KEY = 'noor-salgados:settings';

function dateOffset(days: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

const defaultSettings: BusinessSettings = {
  businessName: 'Noor Salgados',
  whatsapp: '5511999999999',
  dailyCapacity: 1500,
};

const seedProducts: SnackProduct[] = [
  {
    id: 'prd-coxinha', name: 'Coxinha de frango', category: 'Fritos', kind: 'SNACK', saleUnit: 'HUNDRED',
    salePrice: 95, estimatedCost: 48, active: true, preparationNotes: 'Fritar próximo do horário de saída.',
    recipe: [
      { id: 'ing-c1', name: 'Frango', quantity: 2.2, unit: 'kg', estimatedCost: 24 },
      { id: 'ing-c2', name: 'Farinha de trigo', quantity: 1.8, unit: 'kg', estimatedCost: 9 },
      { id: 'ing-c3', name: 'Óleo', quantity: 1.2, unit: 'l', estimatedCost: 8 },
    ], comboItems: [], createdAt: new Date().toISOString(),
  },
  {
    id: 'prd-kibe', name: 'Kibe tradicional', category: 'Árabes', kind: 'SNACK', saleUnit: 'HUNDRED',
    salePrice: 105, estimatedCost: 54, active: true, preparationNotes: 'Hidratar o trigo com antecedência.',
    recipe: [
      { id: 'ing-k1', name: 'Carne moída', quantity: 2, unit: 'kg', estimatedCost: 34 },
      { id: 'ing-k2', name: 'Trigo para kibe', quantity: 1.4, unit: 'kg', estimatedCost: 12 },
    ], comboItems: [], createdAt: new Date().toISOString(),
  },
  {
    id: 'prd-esfiha', name: 'Mini esfiha de carne', category: 'Árabes', kind: 'SNACK', saleUnit: 'HUNDRED',
    salePrice: 120, estimatedCost: 62, active: true, preparationNotes: 'Assar em lotes para manter padrão de cor.',
    recipe: [
      { id: 'ing-e1', name: 'Carne moída', quantity: 2, unit: 'kg', estimatedCost: 34 },
      { id: 'ing-e2', name: 'Farinha de trigo', quantity: 2.1, unit: 'kg', estimatedCost: 11 },
      { id: 'ing-e3', name: 'Tomate', quantity: 0.8, unit: 'kg', estimatedCost: 7 },
    ], comboItems: [], createdAt: new Date().toISOString(),
  },
  {
    id: 'prd-bolinha', name: 'Bolinha de queijo', category: 'Fritos', kind: 'SNACK', saleUnit: 'HUNDRED',
    salePrice: 98, estimatedCost: 50, active: true, preparationNotes: '', recipe: [], comboItems: [], createdAt: new Date().toISOString(),
  },
  {
    id: 'prd-combo', name: 'Kit Festa 300', category: 'Combos', kind: 'COMBO', saleUnit: 'KIT',
    salePrice: 315, estimatedCost: 155, active: true, preparationNotes: 'Separar em caixas identificadas.', recipe: [],
    comboItems: [
      { id: 'cmp-1', productId: 'prd-coxinha', productName: 'Coxinha de frango', quantity: 1 },
      { id: 'cmp-2', productId: 'prd-kibe', productName: 'Kibe tradicional', quantity: 1 },
      { id: 'cmp-3', productId: 'prd-esfiha', productName: 'Mini esfiha de carne', quantity: 1 },
    ], createdAt: new Date().toISOString(),
  },
];

const seedCustomers: Customer[] = [
  { id: 'cli-1', name: 'Mariana Souza', phone: '(11) 99999-1200', neighborhood: 'Tatuapé', address: 'Rua das Flores, 120', notes: 'Prefere contato por WhatsApp.', createdAt: new Date().toISOString() },
  { id: 'cli-2', name: 'Carlos Lima', phone: '(11) 98888-4400', neighborhood: 'Penha', address: '', notes: 'Cliente recorrente de festas.', createdAt: new Date().toISOString() },
];

function seedOrders(): Order[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'ord-1', code: '#001', customerId: 'cli-1', customerName: 'Mariana Souza', customerPhone: '(11) 99999-1200',
      eventName: 'Aniversário 30 pessoas', orderKind: 'PARTY', fulfillment: 'DELIVERY', deliveryDate: dateOffset(1), deliveryTime: '16:30',
      address: 'Rua das Flores, 120 - Tatuapé', notes: 'Entregar pela portaria.',
      items: [
        { id: 'itm-1', productId: 'prd-coxinha', productName: 'Coxinha de frango', saleUnit: 'HUNDRED', quantity: 2, unitPrice: 95, lineTotal: 190 },
        { id: 'itm-2', productId: 'prd-kibe', productName: 'Kibe tradicional', saleUnit: 'HUNDRED', quantity: 1, unitPrice: 105, lineTotal: 105 },
      ], subtotal: 295, discount: 0, deliveryFee: 20, total: 315, paidAmount: 150, paymentMethod: 'PIX', status: 'CONFIRMED', createdAt: now, updatedAt: now,
    },
    {
      id: 'ord-2', code: '#002', customerId: 'cli-2', customerName: 'Carlos Lima', customerPhone: '(11) 98888-4400',
      eventName: 'Pedido avulso', orderKind: 'DIRECT', fulfillment: 'PICKUP', deliveryDate: dateOffset(0), deliveryTime: '19:00',
      address: '', notes: 'Retirada no balcão.',
      items: [{ id: 'itm-3', productId: 'prd-combo', productName: 'Kit Festa 300', saleUnit: 'KIT', quantity: 1, unitPrice: 315, lineTotal: 315 }],
      subtotal: 315, discount: 15, deliveryFee: 0, total: 300, paidAmount: 300, paymentMethod: 'CASH', status: 'READY', createdAt: now, updatedAt: now,
    },
  ];
}

function readStorage<T>(key: string, fallback: () => T): T {
  const raw = localStorage.getItem(key);
  if (!raw) {
    const value = fallback();
    localStorage.setItem(key, JSON.stringify(value));
    return value;
  }
  try { return JSON.parse(raw) as T; }
  catch {
    const value = fallback();
    localStorage.setItem(key, JSON.stringify(value));
    return value;
  }
}

function writeStorage<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function normalizeProduct(product: Partial<SnackProduct> & Pick<SnackProduct, 'id' | 'name'>): SnackProduct {
  return {
    id: product.id,
    name: product.name,
    category: product.category ?? 'Outros',
    kind: product.kind ?? 'SNACK',
    saleUnit: product.saleUnit ?? 'HUNDRED',
    salePrice: Number(product.salePrice ?? 0),
    estimatedCost: Number(product.estimatedCost ?? 0),
    active: product.active ?? true,
    preparationNotes: product.preparationNotes ?? '',
    recipe: product.recipe ?? [],
    comboItems: product.comboItems ?? [],
    createdAt: product.createdAt ?? new Date().toISOString(),
  };
}

function normalizeCustomer(customer: Partial<Customer> & Pick<Customer, 'id' | 'name'>): Customer {
  return {
    id: customer.id, name: customer.name, phone: customer.phone ?? '', neighborhood: customer.neighborhood ?? '',
    address: customer.address ?? '', notes: customer.notes ?? '', createdAt: customer.createdAt ?? new Date().toISOString(),
  };
}

function normalizeOrder(order: Partial<Order> & Pick<Order, 'id' | 'code' | 'customerId' | 'customerName' | 'items'>): Order {
  const subtotal = Number(order.subtotal ?? order.items.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0));
  const discount = Number(order.discount ?? 0);
  const deliveryFee = Number(order.deliveryFee ?? 0);
  const total = Number(order.total ?? Math.max(0, subtotal - discount + deliveryFee));
  const now = new Date().toISOString();
  return {
    id: order.id, code: order.code, customerId: order.customerId, customerName: order.customerName,
    customerPhone: order.customerPhone ?? '', eventName: order.eventName ?? '', orderKind: order.orderKind ?? 'PARTY',
    fulfillment: order.fulfillment ?? 'PICKUP', deliveryDate: order.deliveryDate ?? dateOffset(1), deliveryTime: order.deliveryTime ?? '',
    address: order.address ?? '', notes: order.notes ?? '', items: order.items,
    subtotal, discount, deliveryFee, total, paidAmount: Math.min(total, Number(order.paidAmount ?? 0)),
    paymentMethod: order.paymentMethod ?? 'PIX', status: order.status ?? 'CONFIRMED',
    createdAt: order.createdAt ?? now, updatedAt: order.updatedAt ?? order.createdAt ?? now,
  };
}

function getStoredProducts() {
  const items = readStorage<SnackProduct[]>(PRODUCTS_KEY, () => structuredClone(seedProducts));
  const normalized = items.map((item) => normalizeProduct(item));
  writeStorage(PRODUCTS_KEY, normalized);
  return normalized;
}
function getStoredCustomers() {
  const items = readStorage<Customer[]>(CUSTOMERS_KEY, () => structuredClone(seedCustomers));
  const normalized = items.map((item) => normalizeCustomer(item));
  writeStorage(CUSTOMERS_KEY, normalized);
  return normalized;
}
function getStoredOrders() {
  const items = readStorage<Order[]>(ORDERS_KEY, seedOrders);
  const normalized = items.map((item) => normalizeOrder(item));
  writeStorage(ORDERS_KEY, normalized);
  return normalized;
}

export function getSettings() { return Promise.resolve(readStorage<BusinessSettings>(SETTINGS_KEY, () => ({ ...defaultSettings }))); }
export function updateSettings(settings: BusinessSettings) {
  const next = { ...settings, businessName: settings.businessName.trim() || 'Noor Salgados', whatsapp: settings.whatsapp.replace(/\D/g, ''), dailyCapacity: Math.max(100, Math.trunc(settings.dailyCapacity || 1500)) };
  writeStorage(SETTINGS_KEY, next);
  return Promise.resolve(next);
}

export function getProducts() { return Promise.resolve(getStoredProducts()); }
export function createProduct(input: NewSnackProduct) {
  const products = getStoredProducts();
  const name = input.name.trim();
  if (!name) throw new Error('Informe o nome do salgado ou combo.');
  if (products.some((item) => item.name.toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR'))) throw new Error('Já existe um produto com esse nome.');
  const product: SnackProduct = normalizeProduct({ ...input, id: crypto.randomUUID(), name, createdAt: new Date().toISOString() });
  products.unshift(product); writeStorage(PRODUCTS_KEY, products); return Promise.resolve(product);
}
export function updateProduct(productId: string, patch: Partial<SnackProduct>) {
  const products = getStoredProducts(); const index = products.findIndex((item) => item.id === productId);
  if (index < 0) throw new Error('Produto não encontrado.');
  products[index] = normalizeProduct({ ...products[index], ...patch, id: productId, name: (patch.name ?? products[index].name).trim() });
  writeStorage(PRODUCTS_KEY, products); return Promise.resolve(products[index]);
}
export function toggleProduct(productId: string) { const product = getStoredProducts().find((item) => item.id === productId); if (!product) throw new Error('Produto não encontrado.'); return updateProduct(productId, { active: !product.active }); }
export function deleteProduct(productId: string) {
  if (getStoredOrders().some((order) => order.items.some((item) => item.productId === productId))) throw new Error('Esse produto já foi usado em pedidos. Desative-o em vez de excluir.');
  writeStorage(PRODUCTS_KEY, getStoredProducts().filter((item) => item.id !== productId)); return Promise.resolve();
}

export function getCustomers() { return Promise.resolve(getStoredCustomers()); }
export function createCustomer(input: NewCustomer) {
  const customers = getStoredCustomers(); const name = input.name.trim(); if (!name) throw new Error('Informe o nome do cliente.');
  const customer: Customer = normalizeCustomer({ ...input, id: crypto.randomUUID(), name, createdAt: new Date().toISOString() });
  customers.unshift(customer); writeStorage(CUSTOMERS_KEY, customers); return Promise.resolve(customer);
}
export function updateCustomer(customerId: string, patch: Partial<Customer>) {
  const customers = getStoredCustomers(); const index = customers.findIndex((item) => item.id === customerId); if (index < 0) throw new Error('Cliente não encontrado.');
  customers[index] = normalizeCustomer({ ...customers[index], ...patch, id: customerId, name: (patch.name ?? customers[index].name).trim() });
  writeStorage(CUSTOMERS_KEY, customers); return Promise.resolve(customers[index]);
}
export function deleteCustomer(customerId: string) {
  if (getStoredOrders().some((order) => order.customerId === customerId)) throw new Error('Esse cliente possui pedidos e não pode ser excluído.');
  writeStorage(CUSTOMERS_KEY, getStoredCustomers().filter((item) => item.id !== customerId)); return Promise.resolve();
}

export function getOrders() {
  return Promise.resolve(getStoredOrders().sort((a, b) => `${a.deliveryDate}T${a.deliveryTime || '23:59'}`.localeCompare(`${b.deliveryDate}T${b.deliveryTime || '23:59'}`)));
}
function nextOrderCode(orders: Order[]) {
  const max = orders.reduce((current, order) => Math.max(current, Number(order.code.replace(/\D/g, '')) || 0), 0);
  return `#${String(max + 1).padStart(3, '0')}`;
}
export function createOrder(input: NewOrder) {
  const customer = getStoredCustomers().find((item) => item.id === input.customerId);
  if (!customer) throw new Error('Selecione um cliente.');
  if (!input.items.length) throw new Error('Adicione ao menos um item ao pedido.');
  if (!input.deliveryDate) throw new Error('Informe a data de entrega.');
  if (input.fulfillment === 'DELIVERY' && !input.address.trim()) throw new Error('Informe o endereço da entrega.');
  const orders = getStoredOrders();
  const subtotal = input.items.reduce((sum, item) => sum + item.lineTotal, 0);
  const discount = Math.max(0, Number(input.discount) || 0);
  const deliveryFee = input.fulfillment === 'DELIVERY' ? Math.max(0, Number(input.deliveryFee) || 0) : 0;
  const total = Math.max(0, subtotal - discount + deliveryFee);
  const now = new Date().toISOString();
  const order: Order = normalizeOrder({
    ...input, id: crypto.randomUUID(), code: nextOrderCode(orders), customerName: customer.name, customerPhone: customer.phone,
    subtotal, discount, deliveryFee, total, paidAmount: Math.max(0, Math.min(total, Number(input.paidAmount) || 0)), status: 'CONFIRMED', createdAt: now, updatedAt: now,
  });
  orders.push(order); writeStorage(ORDERS_KEY, orders); return Promise.resolve(order);
}
export function updateOrderStatus(orderId: string, status: OrderStatus) {
  const orders = getStoredOrders(); const index = orders.findIndex((item) => item.id === orderId); if (index < 0) throw new Error('Pedido não encontrado.');
  orders[index] = { ...orders[index], status, updatedAt: new Date().toISOString() }; writeStorage(ORDERS_KEY, orders); return Promise.resolve(orders[index]);
}
export function registerPayment(orderId: string, amount: number) {
  const orders = getStoredOrders(); const index = orders.findIndex((item) => item.id === orderId); if (index < 0) throw new Error('Pedido não encontrado.');
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Informe um valor válido.');
  orders[index] = { ...orders[index], paidAmount: Math.min(orders[index].total, orders[index].paidAmount + amount), updatedAt: new Date().toISOString() };
  writeStorage(ORDERS_KEY, orders); return Promise.resolve(orders[index]);
}
export function deleteOrder(orderId: string) {
  const order = getStoredOrders().find((item) => item.id === orderId); if (!order) return Promise.resolve();
  if (order.status === 'DELIVERED') throw new Error('Pedidos entregues devem permanecer no histórico.');
  writeStorage(ORDERS_KEY, getStoredOrders().filter((item) => item.id !== orderId)); return Promise.resolve();
}

export function exportBackup(): BackupPayload {
  return { version: 2, exportedAt: new Date().toISOString(), products: getStoredProducts(), customers: getStoredCustomers(), orders: getStoredOrders(), settings: readStorage<BusinessSettings>(SETTINGS_KEY, () => ({ ...defaultSettings })) };
}
export function importBackup(payload: BackupPayload) {
  if (!payload || payload.version !== 2 || !Array.isArray(payload.products) || !Array.isArray(payload.customers) || !Array.isArray(payload.orders)) throw new Error('Arquivo de backup inválido.');
  writeStorage(PRODUCTS_KEY, payload.products.map((item) => normalizeProduct(item)));
  writeStorage(CUSTOMERS_KEY, payload.customers.map((item) => normalizeCustomer(item)));
  writeStorage(ORDERS_KEY, payload.orders.map((item) => normalizeOrder(item)));
  writeStorage(SETTINGS_KEY, payload.settings ?? defaultSettings);
}
export function resetDemoData() {
  localStorage.removeItem(PRODUCTS_KEY); localStorage.removeItem(CUSTOMERS_KEY); localStorage.removeItem(ORDERS_KEY); localStorage.removeItem(SETTINGS_KEY);
}
