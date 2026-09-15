import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  createProduct,
  createSupplier,
  deleteProduct,
  deleteSupplier,
  getMovements,
  getProducts,
  getSuppliers,
  isDemoMode,
  moveStock,
  resetDemoData,
} from './api';
import type { NewProduct, NewSupplier, Product, StockMovement, Supplier } from './types';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

type Section = 'dashboard' | 'products' | 'movements' | 'suppliers' | 'reports';

const emptyProduct: NewProduct = {
  sku: '',
  name: '',
  costPrice: 0,
  salePrice: 0,
  minimumStock: 0,
  categoryName: '',
  supplierId: '',
  initialStock: 0,
};

const emptySupplier: NewSupplier = { name: '', contactName: '', phone: '', email: '' };

const sectionMeta: Record<Section, { title: string; subtitle: string }> = {
  dashboard: { title: 'Visão geral', subtitle: 'Saúde do estoque e atividades recentes.' },
  products: { title: 'Produtos', subtitle: 'Cadastre, pesquise e acompanhe todos os itens.' },
  movements: { title: 'Movimentações', subtitle: 'Registre entradas e saídas com histórico completo.' },
  suppliers: { title: 'Fornecedores', subtitle: 'Organize contatos e vínculos de abastecimento.' },
  reports: { title: 'Relatórios', subtitle: 'Indicadores financeiros e operacionais do estoque.' },
};

function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
    .join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function App() {
  const [section, setSection] = useState<Section>('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showProductForm, setShowProductForm] = useState(false);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [productForm, setProductForm] = useState<NewProduct>(emptyProduct);
  const [supplierForm, setSupplierForm] = useState<NewSupplier>(emptySupplier);
  const [movementForm, setMovementForm] = useState({ productId: '', type: 'ENTRY' as 'ENTRY' | 'EXIT', quantity: 1, reason: '' });
  const [saving, setSaving] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [nextProducts, nextSuppliers, nextMovements] = await Promise.all([
        getProducts(),
        getSuppliers(),
        getMovements(),
      ]);
      setProducts(nextProducts);
      setSuppliers(nextSuppliers);
      setMovements(nextMovements);
      setMovementForm((current) => ({
        ...current,
        productId: current.productId || nextProducts[0]?.id || '',
      }));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Erro ao carregar o StockFlow.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadAll(); }, [loadAll]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    if (!term) return products;
    return products.filter((product) =>
      [product.name, product.sku, product.category?.name, product.supplier?.name]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase('pt-BR').includes(term)),
    );
  }, [products, search]);

  const metrics = useMemo(() => {
    const stockUnits = products.reduce((sum, product) => sum + product.currentStock, 0);
    const lowStock = products.filter((product) => product.currentStock <= product.minimumStock);
    const costValue = products.reduce((sum, product) => sum + Number(product.costPrice) * product.currentStock, 0);
    const saleValue = products.reduce((sum, product) => sum + Number(product.salePrice) * product.currentStock, 0);
    const totalEntries = movements.filter((movement) => movement.type === 'ENTRY').reduce((sum, movement) => sum + movement.quantity, 0);
    const totalExits = movements.filter((movement) => movement.type === 'EXIT').reduce((sum, movement) => sum + movement.quantity, 0);
    return { stockUnits, lowStock, costValue, saleValue, totalEntries, totalExits };
  }, [products, movements]);

  const supplierStats = useMemo(() => suppliers.map((supplier) => {
    const linked = products.filter((product) => product.supplier?.id === supplier.id);
    return {
      ...supplier,
      products: linked.length,
      units: linked.reduce((sum, product) => sum + product.currentStock, 0),
      costValue: linked.reduce((sum, product) => sum + Number(product.costPrice) * product.currentStock, 0),
    };
  }), [suppliers, products]);

  async function handleCreateProduct(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await createProduct(productForm);
      setProductForm(emptyProduct);
      setShowProductForm(false);
      await loadAll();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Erro ao cadastrar produto.');
    } finally { setSaving(false); }
  }

  async function handleCreateSupplier(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await createSupplier(supplierForm);
      setSupplierForm(emptySupplier);
      setShowSupplierForm(false);
      await loadAll();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Erro ao cadastrar fornecedor.');
    } finally { setSaving(false); }
  }

  async function handleMovement(event: FormEvent) {
    event.preventDefault();
    const quantity = Math.trunc(Number(movementForm.quantity));
    if (!movementForm.productId || quantity <= 0) return;
    setSaving(true);
    setError('');
    try {
      await moveStock(
        movementForm.productId,
        movementForm.type === 'ENTRY' ? quantity : -quantity,
        movementForm.reason,
      );
      setMovementForm((current) => ({ ...current, quantity: 1, reason: '' }));
      await loadAll();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Erro ao registrar movimentação.');
    } finally { setSaving(false); }
  }

  async function quickMovement(product: Product, direction: 1 | -1) {
    const raw = window.prompt(direction > 0 ? `Entrada para ${product.name}:` : `Saída para ${product.name}:`, '1');
    if (!raw) return;
    const quantity = Number(raw);
    if (!Number.isInteger(quantity) || quantity <= 0) return window.alert('Informe uma quantidade inteira maior que zero.');
    try {
      await moveStock(product.id, quantity * direction, direction > 0 ? 'Entrada rápida' : 'Saída rápida');
      await loadAll();
    } catch (requestError) {
      window.alert(requestError instanceof Error ? requestError.message : 'Erro ao movimentar estoque.');
    }
  }

  async function handleDeleteProduct(product: Product) {
    if (!window.confirm(`Excluir ${product.name}?`)) return;
    try { await deleteProduct(product.id); await loadAll(); }
    catch (requestError) { window.alert(requestError instanceof Error ? requestError.message : 'Erro ao excluir produto.'); }
  }

  async function handleDeleteSupplier(supplier: Supplier) {
    if (!window.confirm(`Excluir ${supplier.name}?`)) return;
    try { await deleteSupplier(supplier.id); await loadAll(); }
    catch (requestError) { window.alert(requestError instanceof Error ? requestError.message : 'Erro ao excluir fornecedor.'); }
  }

  function exportProducts() {
    downloadCsv('stockflow-produtos.csv', [
      ['SKU', 'Produto', 'Categoria', 'Fornecedor', 'Estoque', 'Mínimo', 'Custo', 'Venda'],
      ...products.map((product) => [
        product.sku, product.name, product.category?.name ?? '', product.supplier?.name ?? '',
        product.currentStock, product.minimumStock, product.costPrice, product.salePrice,
      ]),
    ]);
  }

  function exportMovements() {
    downloadCsv('stockflow-movimentacoes.csv', [
      ['Data', 'Tipo', 'SKU', 'Produto', 'Quantidade', 'Saldo anterior', 'Saldo novo', 'Motivo'],
      ...movements.map((movement) => [
        dateTime.format(new Date(movement.createdAt)), movement.type === 'ENTRY' ? 'Entrada' : 'Saída',
        movement.productSku, movement.productName, movement.quantity, movement.stockBefore, movement.stockAfter, movement.reason,
      ]),
    ]);
  }

  function restoreDemo() {
    if (!window.confirm('Restaurar os dados demonstrativos? Seus testes atuais serão apagados deste navegador.')) return;
    resetDemoData();
    void loadAll();
  }

  const navItems: Array<{ id: Section; icon: string; label: string }> = [
    { id: 'dashboard', icon: '▦', label: 'Dashboard' },
    { id: 'products', icon: '◫', label: 'Produtos' },
    { id: 'movements', icon: '⇄', label: 'Movimentações' },
    { id: 'suppliers', icon: '⌂', label: 'Fornecedores' },
    { id: 'reports', icon: '◌', label: 'Relatórios' },
  ];

  const pageAction = section === 'products' ? (
    <button className="primary-button" onClick={() => setShowProductForm((value) => !value)}>{showProductForm ? 'Fechar cadastro' : '+ Novo produto'}</button>
  ) : section === 'suppliers' ? (
    <button className="primary-button" onClick={() => setShowSupplierForm((value) => !value)}>{showSupplierForm ? 'Fechar cadastro' : '+ Novo fornecedor'}</button>
  ) : null;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">SF</span><div><strong>StockFlow</strong><small>Inventory OS</small></div></div>
        <nav className="nav-list" aria-label="Navegação principal">
          {navItems.map((item) => (
            <button key={item.id} className={`nav-item ${section === item.id ? 'active' : ''}`} onClick={() => setSection(item.id)}>
              <b>{item.icon}</b><span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-foot"><div className="status-dot" /><span>{isDemoMode() ? 'Demo online' : 'API conectada'}</span></div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div><p className="eyebrow">StockFlow · controle operacional</p><h1>{sectionMeta[section].title}</h1><p>{sectionMeta[section].subtitle}</p></div>
          {pageAction}
        </header>

        {isDemoMode() && <div className="demo-banner"><strong>Modo demonstração</strong><span>Os dados ficam salvos somente neste navegador.</span><button onClick={restoreDemo}>Restaurar dados</button></div>}
        {error && <div className="error-banner">{error}</div>}

        {section === 'dashboard' && (
          <>
            <section className="metrics-grid">
              <Metric label="Produtos ativos" value={products.length} hint="SKUs cadastrados" />
              <Metric label="Unidades em estoque" value={metrics.stockUnits} hint="Saldo físico atual" />
              <Metric label="Estoque baixo" value={metrics.lowStock.length} hint="Itens que exigem atenção" warning={metrics.lowStock.length > 0} />
              <Metric label="Valor em custo" value={money.format(metrics.costValue)} hint="Capital estimado" />
            </section>
            <div className="dashboard-grid">
              <section className="panel-card">
                <div className="panel-heading"><div><h2>Reposição necessária</h2><p>Produtos no estoque mínimo ou abaixo.</p></div><button className="text-button" onClick={() => setSection('products')}>Ver produtos</button></div>
                <div className="compact-list">
                  {metrics.lowStock.length === 0 ? <Empty text="Nenhum item precisa de reposição." /> : metrics.lowStock.slice(0, 6).map((product) => (
                    <div className="compact-row" key={product.id}><span className="product-avatar">{product.name.slice(0, 2).toUpperCase()}</span><div><strong>{product.name}</strong><small>{product.sku} · mínimo {product.minimumStock}</small></div><span className="danger-number">{product.currentStock}</span></div>
                  ))}
                </div>
              </section>
              <section className="panel-card">
                <div className="panel-heading"><div><h2>Atividade recente</h2><p>Últimas entradas e saídas.</p></div><button className="text-button" onClick={() => setSection('movements')}>Histórico</button></div>
                <div className="compact-list">
                  {movements.slice(0, 6).map((movement) => (
                    <div className="compact-row" key={movement.id}><span className={`movement-icon ${movement.type === 'ENTRY' ? 'entry' : 'exit'}`}>{movement.type === 'ENTRY' ? '↙' : '↗'}</span><div><strong>{movement.productName}</strong><small>{movement.reason} · {dateTime.format(new Date(movement.createdAt))}</small></div><span className={movement.type === 'ENTRY' ? 'positive-number' : 'danger-number'}>{movement.type === 'ENTRY' ? '+' : '−'}{movement.quantity}</span></div>
                  ))}
                </div>
              </section>
            </div>
          </>
        )}

        {section === 'products' && (
          <>
            {showProductForm && (
              <form className="form-card product-form" onSubmit={handleCreateProduct}>
                <div className="form-heading"><strong>Novo produto</strong><span>Cadastre o item, fornecedor e estoque inicial.</span></div>
                <Field label="SKU"><input required value={productForm.sku} onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })} placeholder="EX: CAM-001" /></Field>
                <Field label="Produto" wide><input required value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} placeholder="Nome do produto" /></Field>
                <Field label="Categoria"><input value={productForm.categoryName} onChange={(e) => setProductForm({ ...productForm, categoryName: e.target.value })} placeholder="Ex: Bebidas" /></Field>
                <Field label="Fornecedor"><select value={productForm.supplierId} onChange={(e) => setProductForm({ ...productForm, supplierId: e.target.value })}><option value="">Sem fornecedor</option>{suppliers.map((supplier) => <option value={supplier.id} key={supplier.id}>{supplier.name}</option>)}</select></Field>
                <Field label="Custo"><input required type="number" min="0" step="0.01" value={productForm.costPrice} onChange={(e) => setProductForm({ ...productForm, costPrice: Number(e.target.value) })} /></Field>
                <Field label="Venda"><input required type="number" min="0" step="0.01" value={productForm.salePrice} onChange={(e) => setProductForm({ ...productForm, salePrice: Number(e.target.value) })} /></Field>
                <Field label="Estoque inicial"><input required type="number" min="0" step="1" value={productForm.initialStock} onChange={(e) => setProductForm({ ...productForm, initialStock: Number(e.target.value) })} /></Field>
                <Field label="Estoque mínimo"><input required type="number" min="0" step="1" value={productForm.minimumStock} onChange={(e) => setProductForm({ ...productForm, minimumStock: Number(e.target.value) })} /></Field>
                <button className="primary-button form-submit" disabled={saving}>{saving ? 'Salvando...' : 'Cadastrar produto'}</button>
              </form>
            )}
            <section className="table-card">
              <div className="table-toolbar"><div><h2>Catálogo de produtos</h2><p>{products.length} produtos cadastrados.</p></div><input className="search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar nome, SKU, categoria..." /></div>
              <div className="table-wrap"><table><thead><tr><th>Produto</th><th>Categoria</th><th>Fornecedor</th><th>Estoque</th><th>Venda</th><th>Status</th><th>Ações</th></tr></thead><tbody>
                {loading ? <tr><td colSpan={7}><Empty text="Carregando estoque..." /></td></tr> : filteredProducts.length === 0 ? <tr><td colSpan={7}><Empty text="Nenhum produto encontrado." /></td></tr> : filteredProducts.map((product) => {
                  const low = product.currentStock <= product.minimumStock;
                  return <tr key={product.id}><td><div className="product-name"><span className="product-avatar">{product.name.slice(0,2).toUpperCase()}</span><div><strong>{product.name}</strong><small>{product.sku} · margem {money.format(Number(product.salePrice) - Number(product.costPrice))}</small></div></div></td><td>{product.category?.name ?? 'Sem categoria'}</td><td>{product.supplier?.name ?? 'Não vinculado'}</td><td><strong>{product.currentStock}</strong><small className="stock-minimum"> mín. {product.minimumStock}</small></td><td>{money.format(Number(product.salePrice))}</td><td><span className={`badge ${low ? 'badge-warning' : 'badge-ok'}`}>{low ? 'Repor' : 'Saudável'}</span></td><td><div className="action-row"><button onClick={() => void quickMovement(product,1)}>+ Entrada</button><button onClick={() => void quickMovement(product,-1)}>− Saída</button><button className="danger-action" onClick={() => void handleDeleteProduct(product)}>Excluir</button></div></td></tr>;
                })}
              </tbody></table></div>
            </section>
          </>
        )}

        {section === 'movements' && (
          <>
            <form className="form-card movement-form" onSubmit={handleMovement}>
              <div className="form-heading"><strong>Registrar movimentação</strong><span>Cada operação atualiza o saldo e gera histórico.</span></div>
              <Field label="Produto" wide><select required value={movementForm.productId} onChange={(e) => setMovementForm({ ...movementForm, productId: e.target.value })}><option value="">Selecione</option>{products.map((product) => <option value={product.id} key={product.id}>{product.sku} · {product.name} ({product.currentStock})</option>)}</select></Field>
              <Field label="Tipo"><select value={movementForm.type} onChange={(e) => setMovementForm({ ...movementForm, type: e.target.value as 'ENTRY' | 'EXIT' })}><option value="ENTRY">Entrada</option><option value="EXIT">Saída</option></select></Field>
              <Field label="Quantidade"><input required type="number" min="1" step="1" value={movementForm.quantity} onChange={(e) => setMovementForm({ ...movementForm, quantity: Number(e.target.value) })} /></Field>
              <Field label="Motivo" wide><input required value={movementForm.reason} onChange={(e) => setMovementForm({ ...movementForm, reason: e.target.value })} placeholder="Ex: venda, reposição, ajuste..." /></Field>
              <button className="primary-button form-submit" disabled={saving}>{saving ? 'Registrando...' : 'Registrar'}</button>
            </form>
            <section className="table-card"><div className="table-toolbar"><div><h2>Histórico</h2><p>{movements.length} movimentações registradas.</p></div></div><div className="table-wrap"><table><thead><tr><th>Data</th><th>Tipo</th><th>Produto</th><th>Qtd.</th><th>Saldo</th><th>Motivo</th></tr></thead><tbody>{movements.map((movement) => <tr key={movement.id}><td>{dateTime.format(new Date(movement.createdAt))}</td><td><span className={`badge ${movement.type === 'ENTRY' ? 'badge-ok' : 'badge-exit'}`}>{movement.type === 'ENTRY' ? 'Entrada' : 'Saída'}</span></td><td><strong>{movement.productName}</strong><small className="block-muted">{movement.productSku}</small></td><td>{movement.type === 'ENTRY' ? '+' : '−'}{movement.quantity}</td><td>{movement.stockBefore} → <strong>{movement.stockAfter}</strong></td><td>{movement.reason}</td></tr>)}</tbody></table></div></section>
          </>
        )}

        {section === 'suppliers' && (
          <>
            {showSupplierForm && <form className="form-card supplier-form" onSubmit={handleCreateSupplier}><div className="form-heading"><strong>Novo fornecedor</strong><span>Cadastre os principais dados de contato.</span></div><Field label="Empresa" wide><input required value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} placeholder="Nome do fornecedor" /></Field><Field label="Contato"><input value={supplierForm.contactName} onChange={(e) => setSupplierForm({ ...supplierForm, contactName: e.target.value })} /></Field><Field label="Telefone"><input value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} /></Field><Field label="E-mail" wide><input type="email" value={supplierForm.email} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })} /></Field><button className="primary-button form-submit" disabled={saving}>{saving ? 'Salvando...' : 'Cadastrar fornecedor'}</button></form>}
            <div className="supplier-grid">{supplierStats.map((supplier) => <article className="supplier-card" key={supplier.id}><div className="supplier-head"><span className="supplier-avatar">{supplier.name.slice(0,2).toUpperCase()}</span><div><h3>{supplier.name}</h3><p>{supplier.contactName || 'Sem contato responsável'}</p></div></div><dl><div><dt>Produtos</dt><dd>{supplier.products}</dd></div><div><dt>Unidades</dt><dd>{supplier.units}</dd></div><div><dt>Valor em custo</dt><dd>{money.format(supplier.costValue)}</dd></div></dl><div className="supplier-contact"><span>{supplier.phone || 'Telefone não informado'}</span><span>{supplier.email || 'E-mail não informado'}</span></div><button className="danger-link" onClick={() => void handleDeleteSupplier(supplier)}>Excluir fornecedor</button></article>)}</div>
          </>
        )}

        {section === 'reports' && (
          <>
            <section className="metrics-grid"><Metric label="Valor de custo" value={money.format(metrics.costValue)} hint="Capital parado em estoque" /><Metric label="Potencial de venda" value={money.format(metrics.saleValue)} hint="Receita se vender todo estoque" /><Metric label="Margem potencial" value={money.format(metrics.saleValue - metrics.costValue)} hint="Diferença venda menos custo" /><Metric label="Giro registrado" value={`${metrics.totalEntries} / ${metrics.totalExits}`} hint="Entradas / saídas em unidades" /></section>
            <div className="report-grid">
              <section className="panel-card"><div className="panel-heading"><div><h2>Produtos por valor em estoque</h2><p>Itens que concentram mais capital.</p></div></div><div className="rank-list">{[...products].sort((a,b) => Number(b.costPrice)*b.currentStock - Number(a.costPrice)*a.currentStock).slice(0,8).map((product,index) => <div className="rank-row" key={product.id}><span>{index+1}</span><div><strong>{product.name}</strong><small>{product.currentStock} unidades · {product.sku}</small></div><b>{money.format(Number(product.costPrice)*product.currentStock)}</b></div>)}</div></section>
              <section className="panel-card"><div className="panel-heading"><div><h2>Resumo por fornecedor</h2><p>Distribuição do estoque atual.</p></div></div><div className="rank-list">{supplierStats.map((supplier,index) => <div className="rank-row" key={supplier.id}><span>{index+1}</span><div><strong>{supplier.name}</strong><small>{supplier.products} produtos · {supplier.units} unidades</small></div><b>{money.format(supplier.costValue)}</b></div>)}</div></section>
            </div>
            <section className="export-card"><div><h2>Exportar dados</h2><p>Baixe arquivos CSV para abrir no Excel ou Google Sheets.</p></div><div className="export-actions"><button onClick={exportProducts}>Exportar produtos</button><button onClick={exportMovements}>Exportar movimentações</button></div></section>
          </>
        )}
      </main>

      <nav className="mobile-nav" aria-label="Navegação móvel">{navItems.map((item) => <button key={item.id} className={section === item.id ? 'active' : ''} onClick={() => setSection(item.id)}><b>{item.icon}</b><span>{item.label}</span></button>)}</nav>
    </div>
  );
}

function Metric({ label, value, hint, warning = false }: { label: string; value: string | number; hint: string; warning?: boolean }) {
  return <article className={`metric-card ${warning ? 'warning-card' : ''}`}><span>{label}</span><strong>{value}</strong><small>{hint}</small></article>;
}

function Empty({ text }: { text: string }) { return <div className="empty-state">{text}</div>; }

function Field({ label, wide = false, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return <label className={wide ? 'wide-field' : ''}><span>{label}</span>{children}</label>;
}
