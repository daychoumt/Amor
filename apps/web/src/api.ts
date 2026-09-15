import type {
  NewProduct,
  NewSupplier,
  Product,
  StockMovement,
  Supplier,
} from './types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3333';
const DEMO_MODE = import.meta.env.VITE_DEMO === 'true';

const PRODUCTS_KEY = 'stockflow:demo:products';
const SUPPLIERS_KEY = 'stockflow:demo:suppliers';
const MOVEMENTS_KEY = 'stockflow:demo:movements';

const seedSuppliers: Supplier[] = [
  {
    id: 'sup-1',
    name: 'Atacado Central',
    contactName: 'Mariana Lopes',
    phone: '(11) 99999-1200',
    email: 'comercial@atacadocentral.demo',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sup-2',
    name: 'Distribuidora Horizonte',
    contactName: 'Carlos Mendes',
    phone: '(11) 98888-4300',
    email: 'vendas@horizonte.demo',
    createdAt: new Date().toISOString(),
  },
];

const seedProducts: Product[] = [
  {
    id: 'demo-1',
    sku: 'CAF-001',
    name: 'Café Premium 500g',
    description: 'Produto demonstrativo',
    costPrice: '18.90',
    salePrice: '29.90',
    currentStock: 18,
    minimumStock: 8,
    category: { id: 'cat-alimentos', name: 'Alimentos' },
    supplier: { id: 'sup-1', name: 'Atacado Central' },
  },
  {
    id: 'demo-2',
    sku: 'AGU-002',
    name: 'Água Mineral 500ml',
    description: 'Produto demonstrativo',
    costPrice: '1.20',
    salePrice: '3.50',
    currentStock: 6,
    minimumStock: 10,
    category: { id: 'cat-bebidas', name: 'Bebidas' },
    supplier: { id: 'sup-1', name: 'Atacado Central' },
  },
  {
    id: 'demo-3',
    sku: 'CHO-003',
    name: 'Chocolate 90g',
    description: 'Produto demonstrativo',
    costPrice: '4.80',
    salePrice: '8.90',
    currentStock: 24,
    minimumStock: 6,
    category: { id: 'cat-doces', name: 'Doces' },
    supplier: { id: 'sup-2', name: 'Distribuidora Horizonte' },
  },
];

function seedMovements(): StockMovement[] {
  const now = Date.now();
  return [
    {
      id: 'mov-seed-1',
      productId: 'demo-1',
      productName: 'Café Premium 500g',
      productSku: 'CAF-001',
      type: 'ENTRY',
      quantity: 10,
      reason: 'Reposição do fornecedor',
      stockBefore: 8,
      stockAfter: 18,
      createdAt: new Date(now - 45 * 60 * 1000).toISOString(),
    },
    {
      id: 'mov-seed-2',
      productId: 'demo-2',
      productName: 'Água Mineral 500ml',
      productSku: 'AGU-002',
      type: 'EXIT',
      quantity: 4,
      reason: 'Venda balcão',
      stockBefore: 10,
      stockAfter: 6,
      createdAt: new Date(now - 4 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'mov-seed-3',
      productId: 'demo-3',
      productName: 'Chocolate 90g',
      productSku: 'CHO-003',
      type: 'ENTRY',
      quantity: 12,
      reason: 'Compra semanal',
      stockBefore: 12,
      stockAfter: 24,
      createdAt: new Date(now - 26 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

function readStorage<T>(key: string, fallback: () => T): T {
  const saved = localStorage.getItem(key);
  if (!saved) {
    const value = fallback();
    localStorage.setItem(key, JSON.stringify(value));
    return value;
  }

  try {
    return JSON.parse(saved) as T;
  } catch {
    const value = fallback();
    localStorage.setItem(key, JSON.stringify(value));
    return value;
  }
}

function writeStorage<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function readDemoProducts() {
  return readStorage<Product[]>(PRODUCTS_KEY, () => structuredClone(seedProducts));
}

function readDemoSuppliers() {
  return readStorage<Supplier[]>(SUPPLIERS_KEY, () => structuredClone(seedSuppliers));
}

function readDemoMovements() {
  return readStorage<StockMovement[]>(MOVEMENTS_KEY, seedMovements);
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? 'Não foi possível concluir a operação.');
  }
  return response.json() as Promise<T>;
}

export function isDemoMode() {
  return DEMO_MODE;
}

export async function getProducts(search = '') {
  if (DEMO_MODE) {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    const products = readDemoProducts();
    if (!term) return products;
    return products.filter((product) =>
      product.name.toLocaleLowerCase('pt-BR').includes(term) ||
      product.sku.toLocaleLowerCase('pt-BR').includes(term) ||
      product.category?.name.toLocaleLowerCase('pt-BR').includes(term) ||
      product.supplier?.name.toLocaleLowerCase('pt-BR').includes(term),
    );
  }

  const url = new URL('/products', API_URL);
  if (search) url.searchParams.set('search', search);
  return parseResponse<Product[]>(await fetch(url));
}

export async function createProduct(input: NewProduct) {
  if (DEMO_MODE) {
    const products = readDemoProducts();
    const suppliers = readDemoSuppliers();
    const normalizedSku = input.sku.trim().toUpperCase();

    if (products.some((product) => product.sku.toUpperCase() === normalizedSku)) {
      throw new Error('Já existe um produto com este SKU.');
    }

    const supplier = suppliers.find((item) => item.id === input.supplierId);
    const categoryName = input.categoryName?.trim();
    const initialStock = Math.max(0, Math.trunc(input.initialStock ?? 0));

    const product: Product = {
      id: crypto.randomUUID(),
      sku: normalizedSku,
      name: input.name.trim(),
      costPrice: input.costPrice.toFixed(2),
      salePrice: input.salePrice.toFixed(2),
      currentStock: initialStock,
      minimumStock: Math.max(0, Math.trunc(input.minimumStock)),
      category: categoryName
        ? { id: `cat-${categoryName.toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g, '-')}`, name: categoryName }
        : null,
      supplier: supplier ? { id: supplier.id, name: supplier.name } : null,
    };

    products.unshift(product);
    writeStorage(PRODUCTS_KEY, products);

    if (initialStock > 0) {
      const movements = readDemoMovements();
      movements.unshift({
        id: crypto.randomUUID(),
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        type: 'ENTRY',
        quantity: initialStock,
        reason: 'Estoque inicial',
        stockBefore: 0,
        stockAfter: initialStock,
        createdAt: new Date().toISOString(),
      });
      writeStorage(MOVEMENTS_KEY, movements);
    }

    return product;
  }

  const { categoryName: _categoryName, supplierId: _supplierId, initialStock: _initialStock, ...serverInput } = input;
  return parseResponse<Product>(await fetch(`${API_URL}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(serverInput),
  }));
}

export async function deleteProduct(productId: string) {
  if (DEMO_MODE) {
    const products = readDemoProducts();
    const product = products.find((item) => item.id === productId);
    if (!product) throw new Error('Produto não encontrado.');
    if (product.currentStock !== 0) {
      throw new Error('Zere o estoque antes de excluir este produto.');
    }
    writeStorage(PRODUCTS_KEY, products.filter((item) => item.id !== productId));
    return;
  }

  const response = await fetch(`${API_URL}/products/${productId}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Não foi possível excluir o produto.');
}

export async function moveStock(productId: string, delta: number, reason: string) {
  if (DEMO_MODE) {
    const products = readDemoProducts();
    const index = products.findIndex((product) => product.id === productId);
    if (index < 0) throw new Error('Produto não encontrado.');
    if (!Number.isInteger(delta) || delta === 0) throw new Error('Informe uma quantidade válida.');

    const stockBefore = products[index].currentStock;
    const stockAfter = stockBefore + delta;
    if (stockAfter < 0) throw new Error('A saída informada é maior que o estoque disponível.');

    const product = { ...products[index], currentStock: stockAfter };
    products[index] = product;
    writeStorage(PRODUCTS_KEY, products);

    const movements = readDemoMovements();
    movements.unshift({
      id: crypto.randomUUID(),
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      type: delta > 0 ? 'ENTRY' : 'EXIT',
      quantity: Math.abs(delta),
      reason: reason.trim() || (delta > 0 ? 'Entrada manual' : 'Saída manual'),
      stockBefore,
      stockAfter,
      createdAt: new Date().toISOString(),
    });
    writeStorage(MOVEMENTS_KEY, movements);
    return { product };
  }

  return parseResponse<{ product: Product }>(await fetch(`${API_URL}/products/${productId}/movements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: delta > 0 ? 'ENTRY' : 'EXIT', delta, reason }),
  }));
}

export async function getMovements() {
  if (DEMO_MODE) return readDemoMovements();
  return parseResponse<StockMovement[]>(await fetch(`${API_URL}/movements`));
}

export async function getSuppliers() {
  if (DEMO_MODE) return readDemoSuppliers();
  return parseResponse<Supplier[]>(await fetch(`${API_URL}/suppliers`));
}

export async function createSupplier(input: NewSupplier) {
  if (DEMO_MODE) {
    const suppliers = readDemoSuppliers();
    const name = input.name.trim();
    if (suppliers.some((supplier) => supplier.name.toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR'))) {
      throw new Error('Já existe um fornecedor com esse nome.');
    }

    const supplier: Supplier = {
      id: crypto.randomUUID(),
      name,
      contactName: input.contactName?.trim(),
      phone: input.phone?.trim(),
      email: input.email?.trim(),
      createdAt: new Date().toISOString(),
    };
    suppliers.unshift(supplier);
    writeStorage(SUPPLIERS_KEY, suppliers);
    return supplier;
  }

  return parseResponse<Supplier>(await fetch(`${API_URL}/suppliers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  }));
}

export async function deleteSupplier(supplierId: string) {
  if (DEMO_MODE) {
    const products = readDemoProducts();
    if (products.some((product) => product.supplier?.id === supplierId)) {
      throw new Error('Este fornecedor está vinculado a produtos e não pode ser excluído.');
    }
    writeStorage(SUPPLIERS_KEY, readDemoSuppliers().filter((supplier) => supplier.id !== supplierId));
    return;
  }

  const response = await fetch(`${API_URL}/suppliers/${supplierId}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Não foi possível excluir o fornecedor.');
}

export function resetDemoData() {
  if (!DEMO_MODE) return;
  localStorage.removeItem(PRODUCTS_KEY);
  localStorage.removeItem(SUPPLIERS_KEY);
  localStorage.removeItem(MOVEMENTS_KEY);
}
