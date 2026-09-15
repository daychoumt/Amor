import type {
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

function dateOffset(days: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

const seedProducts: SnackProduct[] = [
  {
    id: 'prd-coxinha',
    name: 'Coxinha de frango',
    category: 'Fritos',
    saleUnit: 'HUNDRED',
    salePrice: 95,
    estimatedCost: 48,
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prd-kibe',
    name: 'Kibe tradicional',
    category: 'Árabes',
    saleUnit: 'HUNDRED',
    salePrice: 105,
    estimatedCost: 54,
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prd-esfiha',
    name: 'Mini esfiha de carne',
    category: 'Árabes',
    saleUnit: 'HUNDRED',
    salePrice: 120,
    estimatedCost: 62,
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prd-bolinha',
    name: 'Bolinha de queijo',
    category: 'Fritos',
    saleUnit: 'HUNDRED',
    salePrice: 98,
    estimatedCost: 50,
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prd-bandeja',
    name: 'Bandeja festa mista',
    category: 'Combos',
    saleUnit: 'TRAY',
    salePrice: 72,
    estimatedCost: 38,
    active: true,
    createdAt: new Date().toISOString(),
  },
];

const seedCustomers: Customer[] = [
  {
    id: 'cli-1',
    name: 'Mariana Souza',
    phone: '(11) 99999-1200',
    neighborhood: 'Tatuapé',
    notes: 'Prefere contato por WhatsApp.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cli-2',
    name: 'Carlos Lima',
    phone: '(11) 98888-4400',
    neighborhood: 'Penha',
    notes: 'Cliente recorrente de festas.',
    createdAt: new Date().toISOString(),
  },
];

function seedOrders(): Order[] {
  return [
    {
      id: 'ord-1',
      code: '#001',
      customerId: 'cli-1',
      customerName: 'Mariana Souza',
      customerPhone: '(11) 99999-1200',
      orderKind: 'PARTY',
      fulfillment: 'DELIVERY',
      deliveryDate: dateOffset(1),
      deliveryTime: '16:30',
      address: 'Tatuapé, São Paulo',
      notes: 'Aniversário de 30 pessoas.',
      items: [
        {
          id: 'itm-1',
          productId: 'prd-coxinha',
          productName: 'Coxinha de frango',
          saleUnit: 'HUNDRED',
          quantity: 2,
          unitPrice: 95,
          lineTotal: 190,
        },
        {
          id: 'itm-2',
          productId: 'prd-kibe',
          productName: 'Kibe tradicional',
          saleUnit: 'HUNDRED',
          quantity: 1,
          unitPrice: 105,
          lineTotal: 105,
        },
      ],
      total: 295,
      paidAmount: 150,
      status: 'CONFIRMED',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'ord-2',
      code: '#002',
      customerId: 'cli-2',
      customerName: 'Carlos Lima',
      customerPhone: '(11) 98888-4400',
      orderKind: 'DIRECT',
      fulfillment: 'PICKUP',
      deliveryDate: dateOffset(0),
      deliveryTime: '19:00',
      address: '',
      notes: 'Retirada no balcão.',
      items: [
        {
          id: 'itm-3',
          productId: 'prd-bandeja',
          productName: 'Bandeja festa mista',
          saleUnit: 'TRAY',
          quantity: 2,
          unitPrice: 72,
          lineTotal: 144,
        },
      ],
      total: 144,
      paidAmount: 144,
      status: 'READY',
      createdAt: new Date().toISOString(),
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
  try {
    return JSON.parse(raw) as T;
  } catch {
    const value = fallback();
    localStorage.setItem(key, JSON.stringify(value));
    return value;
  }
}

function writeStorage<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getStoredProducts() {
  return readStorage<SnackProduct[]>(PRODUCTS_KEY, () => structuredClone(seedProducts));
}

function getStoredCustomers() {
  return readStorage<Customer[]>(CUSTOMERS_KEY, () => structuredClone(seedCustomers));
}

function getStoredOrders() {
  return readStorage<Order[]>(ORDERS_KEY, seedOrders);
}

export function getProducts() {
  return Promise.resolve(getStoredProducts());
}

export function createProduct(input: NewSnackProduct) {
  const products = getStoredProducts();
  const name = input.name.trim();
  if (!name) throw new Error('Informe o nome do salgado.');
  if (products.some((item) => item.name.toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR'))) {
    throw new Error('Já existe um produto com esse nome.');
  }

  const product: SnackProduct = {
    ...input,
    id: crypto.randomUUID(),
    name,
    category: input.category.trim() || 'Outros',
    salePrice: Math.max(0, Number(input.salePrice)),
    estimatedCost: Math.max(0, Number(input.estimatedCost)),
    createdAt: new Date().toISOString(),
  };
  products.unshift(product);
  writeStorage(PRODUCTS_KEY, products);
  return Promise.resolve(product);
}

export function toggleProduct(productId: string) {
  const products = getStoredProducts();
  const index = products.findIndex((item) => item.id === productId);
  if (index < 0) throw new Error('Produto não encontrado.');
  products[index] = { ...products[index], active: !products[index].active };
  writeStorage(PRODUCTS_KEY, products);
  return Promise.resolve(products[index]);
}

export function deleteProduct(productId: string) {
  const orders = getStoredOrders();
  if (orders.some((order) => order.items.some((item) => item.productId === productId))) {
    throw new Error('Esse produto já foi usado em pedidos. Desative-o em vez de excluir.');
  }
  writeStorage(PRODUCTS_KEY, getStoredProducts().filter((item) => item.id !== productId));
  return Promise.resolve();
}

export function getCustomers() {
  return Promise.resolve(getStoredCustomers());
}

export function createCustomer(input: NewCustomer) {
  const customers = getStoredCustomers();
  const name = input.name.trim();
  if (!name) throw new Error('Informe o nome do cliente.');
  const customer: Customer = {
    ...input,
    id: crypto.randomUUID(),
    name,
    phone: input.phone.trim(),
    neighborhood: input.neighborhood.trim(),
    notes: input.notes.trim(),
    createdAt: new Date().toISOString(),
  };
  customers.unshift(customer);
  writeStorage(CUSTOMERS_KEY, customers);
  return Promise.resolve(customer);
}

export function deleteCustomer(customerId: string) {
  const orders = getStoredOrders();
  if (orders.some((order) => order.customerId === customerId)) {
    throw new Error('Esse cliente possui pedidos e não pode ser excluído.');
  }
  writeStorage(CUSTOMERS_KEY, getStoredCustomers().filter((item) => item.id !== customerId));
  return Promise.resolve();
}

export function getOrders() {
  return Promise.resolve(getStoredOrders().sort((a, b) => {
    const left = `${a.deliveryDate}T${a.deliveryTime || '23:59'}`;
    const right = `${b.deliveryDate}T${b.deliveryTime || '23:59'}`;
    return left.localeCompare(right);
  }));
}

function nextOrderCode(orders: Order[]) {
  const max = orders.reduce((current, order) => {
    const numeric = Number(order.code.replace(/\D/g, ''));
    return Number.isFinite(numeric) ? Math.max(current, numeric) : current;
  }, 0);
  return `#${String(max + 1).padStart(3, '0')}`;
}

export function createOrder(input: NewOrder) {
  const customers = getStoredCustomers();
  const customer = customers.find((item) => item.id === input.customerId);
  if (!customer) throw new Error('Selecione um cliente.');
  if (input.items.length === 0) throw new Error('Adicione ao menos um item ao pedido.');
  if (!input.deliveryDate) throw new Error('Informe a data de entrega.');

  const orders = getStoredOrders();
  const total = input.items.reduce((sum, item) => sum + item.lineTotal, 0);
  const paidAmount = Math.max(0, Math.min(total, Number(input.paidAmount) || 0));
  const order: Order = {
    id: crypto.randomUUID(),
    code: nextOrderCode(orders),
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.phone,
    orderKind: input.orderKind,
    fulfillment: input.fulfillment,
    deliveryDate: input.deliveryDate,
    deliveryTime: input.deliveryTime,
    address: input.address.trim(),
    notes: input.notes.trim(),
    items: input.items.map((item) => ({ ...item, id: item.id || crypto.randomUUID() })),
    total,
    paidAmount,
    status: 'CONFIRMED',
    createdAt: new Date().toISOString(),
  };
  orders.push(order);
  writeStorage(ORDERS_KEY, orders);
  return Promise.resolve(order);
}

export function updateOrderStatus(orderId: string, status: OrderStatus) {
  const orders = getStoredOrders();
  const index = orders.findIndex((item) => item.id === orderId);
  if (index < 0) throw new Error('Pedido não encontrado.');
  orders[index] = { ...orders[index], status };
  writeStorage(ORDERS_KEY, orders);
  return Promise.resolve(orders[index]);
}

export function registerPayment(orderId: string, amount: number) {
  const orders = getStoredOrders();
  const index = orders.findIndex((item) => item.id === orderId);
  if (index < 0) throw new Error('Pedido não encontrado.');
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Informe um valor válido.');
  const order = orders[index];
  const nextPaid = Math.min(order.total, order.paidAmount + amount);
  orders[index] = { ...order, paidAmount: nextPaid };
  writeStorage(ORDERS_KEY, orders);
  return Promise.resolve(orders[index]);
}

export function deleteOrder(orderId: string) {
  const orders = getStoredOrders();
  const order = orders.find((item) => item.id === orderId);
  if (!order) return Promise.resolve();
  if (order.status === 'DELIVERED') throw new Error('Pedidos entregues devem permanecer no histórico.');
  writeStorage(ORDERS_KEY, orders.filter((item) => item.id !== orderId));
  return Promise.resolve();
}

export function resetDemoData() {
  localStorage.removeItem(PRODUCTS_KEY);
  localStorage.removeItem(CUSTOMERS_KEY);
  localStorage.removeItem(ORDERS_KEY);
}
