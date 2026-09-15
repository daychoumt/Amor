import type { NewProduct, Product } from './types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3333';

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? 'Não foi possível concluir a operação.');
  }

  return response.json() as Promise<T>;
}

export async function getProducts(search = '') {
  const url = new URL('/products', API_URL);
  if (search) url.searchParams.set('search', search);

  const response = await fetch(url);
  return parseResponse<Product[]>(response);
}

export async function createProduct(input: NewProduct) {
  const response = await fetch(`${API_URL}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  return parseResponse<Product>(response);
}

export async function moveStock(productId: string, delta: number, reason: string) {
  const response = await fetch(`${API_URL}/products/${productId}/movements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: delta > 0 ? 'ENTRY' : 'EXIT',
      delta,
      reason,
    }),
  });

  return parseResponse<{ product: Product }>(response);
}
