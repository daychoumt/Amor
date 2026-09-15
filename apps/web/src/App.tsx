import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { createProduct, getProducts, moveStock } from './api';
import type { NewProduct, Product } from './types';

const money = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const emptyForm: NewProduct = {
  sku: '',
  name: '',
  costPrice: 0,
  salePrice: 0,
  minimumStock: 0,
};

export function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewProduct>(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadProducts = useCallback(async (term = '') => {
    setLoading(true);
    setError('');
    try {
      setProducts(await getProducts(term));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Erro ao carregar produtos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadProducts(search), 300);
    return () => window.clearTimeout(timeout);
  }, [search, loadProducts]);

  const metrics = useMemo(() => {
    const stockUnits = products.reduce((sum, product) => sum + product.currentStock, 0);
    const lowStock = products.filter((product) => product.currentStock <= product.minimumStock).length;
    const costValue = products.reduce(
      (sum, product) => sum + Number(product.costPrice) * product.currentStock,
      0,
    );

    return {
      products: products.length,
      stockUnits,
      lowStock,
      costValue,
    };
  }, [products]);

  async function handleCreateProduct(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      await createProduct(form);
      setForm(emptyForm);
      setShowForm(false);
      await loadProducts(search);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Erro ao cadastrar produto.');
    } finally {
      setSaving(false);
    }
  }

  async function handleMovement(product: Product, direction: 1 | -1) {
    const raw = window.prompt(
      direction > 0
        ? `Quantidade de entrada para ${product.name}:`
        : `Quantidade de saída para ${product.name}:`,
      '1',
    );

    if (!raw) return;

    const quantity = Number(raw);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      window.alert('Informe uma quantidade inteira maior que zero.');
      return;
    }

    try {
      await moveStock(
        product.id,
        quantity * direction,
        direction > 0 ? 'Entrada manual pelo dashboard' : 'Saída manual pelo dashboard',
      );
      await loadProducts(search);
    } catch (requestError) {
      window.alert(requestError instanceof Error ? requestError.message : 'Erro ao movimentar estoque.');
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">SF</span>
          <div>
            <strong>StockFlow</strong>
            <small>Inventory OS</small>
          </div>
        </div>

        <nav className="nav-list" aria-label="Navegação principal">
          <button className="nav-item active">▦ <span>Dashboard</span></button>
          <button className="nav-item">◫ <span>Produtos</span></button>
          <button className="nav-item">⇄ <span>Movimentações</span></button>
          <button className="nav-item">⌂ <span>Fornecedores</span></button>
          <button className="nav-item">◌ <span>Relatórios</span></button>
        </nav>

        <div className="sidebar-foot">
          <div className="status-dot" />
          <span>Ambiente local</span>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Visão operacional</p>
            <h1>Controle de estoque</h1>
            <p>Produtos, níveis de estoque e alertas em um único painel.</p>
          </div>
          <button className="primary-button" onClick={() => setShowForm((value) => !value)}>
            {showForm ? 'Fechar cadastro' : '+ Novo produto'}
          </button>
        </header>

        {error && <div className="error-banner">{error}</div>}

        {showForm && (
          <form className="product-form" onSubmit={handleCreateProduct}>
            <div className="form-heading">
              <div>
                <strong>Novo produto</strong>
                <span>Cadastre o item antes de registrar entradas e saídas.</span>
              </div>
            </div>

            <label>
              SKU
              <input
                required
                value={form.sku}
                onChange={(event) => setForm({ ...form, sku: event.target.value })}
                placeholder="EX: CAM-001"
              />
            </label>
            <label className="wide-field">
              Produto
              <input
                required
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Nome do produto"
              />
            </label>
            <label>
              Custo
              <input
                required
                min="0"
                step="0.01"
                type="number"
                value={form.costPrice}
                onChange={(event) => setForm({ ...form, costPrice: Number(event.target.value) })}
              />
            </label>
            <label>
              Venda
              <input
                required
                min="0"
                step="0.01"
                type="number"
                value={form.salePrice}
                onChange={(event) => setForm({ ...form, salePrice: Number(event.target.value) })}
              />
            </label>
            <label>
              Estoque mínimo
              <input
                required
                min="0"
                step="1"
                type="number"
                value={form.minimumStock}
                onChange={(event) => setForm({ ...form, minimumStock: Number(event.target.value) })}
              />
            </label>
            <button className="primary-button form-submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Cadastrar produto'}
            </button>
          </form>
        )}

        <section className="metrics-grid" aria-label="Indicadores do estoque">
          <article className="metric-card">
            <span>Produtos ativos</span>
            <strong>{metrics.products}</strong>
            <small>SKUs cadastrados</small>
          </article>
          <article className="metric-card">
            <span>Unidades em estoque</span>
            <strong>{metrics.stockUnits}</strong>
            <small>Saldo físico atual</small>
          </article>
          <article className={`metric-card ${metrics.lowStock > 0 ? 'warning-card' : ''}`}>
            <span>Estoque baixo</span>
            <strong>{metrics.lowStock}</strong>
            <small>Itens no limite ou abaixo</small>
          </article>
          <article className="metric-card">
            <span>Valor em custo</span>
            <strong>{money.format(metrics.costValue)}</strong>
            <small>Capital estimado em estoque</small>
          </article>
        </section>

        <section className="table-card">
          <div className="table-toolbar">
            <div>
              <h2>Produtos</h2>
              <p>Acompanhe saldo, margem e necessidade de reposição.</p>
            </div>
            <input
              className="search-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome ou SKU..."
              aria-label="Buscar produtos"
            />
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>SKU</th>
                  <th>Categoria</th>
                  <th>Estoque</th>
                  <th>Preço</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="empty-state">Carregando estoque...</td></tr>
                ) : products.length === 0 ? (
                  <tr><td colSpan={7} className="empty-state">Nenhum produto encontrado.</td></tr>
                ) : (
                  products.map((product) => {
                    const isLow = product.currentStock <= product.minimumStock;
                    const margin = Number(product.salePrice) - Number(product.costPrice);

                    return (
                      <tr key={product.id}>
                        <td>
                          <div className="product-name">
                            <span className="product-avatar">{product.name.slice(0, 2).toUpperCase()}</span>
                            <div>
                              <strong>{product.name}</strong>
                              <small>Margem unitária {money.format(margin)}</small>
                            </div>
                          </div>
                        </td>
                        <td><code>{product.sku}</code></td>
                        <td>{product.category?.name ?? 'Sem categoria'}</td>
                        <td>
                          <strong>{product.currentStock}</strong>
                          <small className="stock-minimum"> mín. {product.minimumStock}</small>
                        </td>
                        <td>{money.format(Number(product.salePrice))}</td>
                        <td>
                          <span className={`badge ${isLow ? 'badge-warning' : 'badge-ok'}`}>
                            {isLow ? 'Repor' : 'Saudável'}
                          </span>
                        </td>
                        <td>
                          <div className="action-row">
                            <button title="Registrar entrada" onClick={() => void handleMovement(product, 1)}>+ Entrada</button>
                            <button title="Registrar saída" onClick={() => void handleMovement(product, -1)}>− Saída</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
