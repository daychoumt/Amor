import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  createCustomer,
  createOrder,
  createProduct,
  deleteCustomer,
  deleteOrder,
  deleteProduct,
  getCustomers,
  getOrders,
  getProducts,
  registerPayment,
  resetDemoData,
  toggleProduct,
  updateOrderStatus,
} from './api';
import type {
  Customer,
  NewCustomer,
  NewOrder,
  NewSnackProduct,
  Order,
  OrderItem,
  OrderStatus,
  SaleUnit,
  SnackProduct,
} from './types';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dateLabel = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

type Section = 'dashboard' | 'products' | 'customers' | 'orders' | 'production' | 'finance';

const emptyProduct: NewSnackProduct = {
  name: '',
  category: 'Fritos',
  saleUnit: 'HUNDRED',
  salePrice: 0,
  estimatedCost: 0,
  active: true,
};

const emptyCustomer: NewCustomer = { name: '', phone: '', neighborhood: '', notes: '' };

function todayIso(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

function parseLocalDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

function unitLabel(unit: SaleUnit, quantity = 1) {
  if (unit === 'HUNDRED') return quantity === 1 ? 'cento' : 'centos';
  if (unit === 'TRAY') return quantity === 1 ? 'bandeja' : 'bandejas';
  return quantity === 1 ? 'unidade' : 'unidades';
}

function unitShort(unit: SaleUnit) {
  if (unit === 'HUNDRED') return '/ cento';
  if (unit === 'TRAY') return '/ bandeja';
  return '/ un.';
}

const statusMeta: Record<OrderStatus, { label: string; className: string }> = {
  QUOTE: { label: 'Orçamento', className: 'status-quote' },
  CONFIRMED: { label: 'Confirmado', className: 'status-confirmed' },
  PRODUCTION: { label: 'Em produção', className: 'status-production' },
  READY: { label: 'Pronto', className: 'status-ready' },
  DELIVERED: { label: 'Entregue', className: 'status-delivered' },
  CANCELLED: { label: 'Cancelado', className: 'status-cancelled' },
};

const sectionMeta: Record<Section, { title: string; subtitle: string }> = {
  dashboard: { title: 'Visão do dia', subtitle: 'Encomendas, produção e recebimentos em um só lugar.' },
  products: { title: 'Cardápio', subtitle: 'Cadastre os salgados, combos e valores de venda.' },
  customers: { title: 'Clientes', subtitle: 'Guarde os contatos de quem compra e volta a comprar.' },
  orders: { title: 'Pedidos', subtitle: 'Controle festas, encomendas avulsas, retirada e entrega.' },
  production: { title: 'Produção', subtitle: 'Veja exatamente o que precisa ser preparado por data.' },
  finance: { title: 'Financeiro', subtitle: 'Acompanhe vendas, valores recebidos e pendências.' },
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
  const [products, setProducts] = useState<SnackProduct[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showProductForm, setShowProductForm] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [productForm, setProductForm] = useState<NewSnackProduct>(emptyProduct);
  const [customerForm, setCustomerForm] = useState<NewCustomer>(emptyCustomer);
  const [productionDate, setProductionDate] = useState(todayIso());
  const [saving, setSaving] = useState(false);

  const [orderForm, setOrderForm] = useState<Omit<NewOrder, 'items'>>({
    customerId: '',
    orderKind: 'PARTY',
    fulfillment: 'PICKUP',
    deliveryDate: todayIso(1),
    deliveryTime: '15:00',
    address: '',
    notes: '',
    paidAmount: 0,
  });
  const [draftItems, setDraftItems] = useState<OrderItem[]>([]);
  const [itemForm, setItemForm] = useState({ productId: '', quantity: 1 });

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [nextProducts, nextCustomers, nextOrders] = await Promise.all([
        getProducts(),
        getCustomers(),
        getOrders(),
      ]);
      setProducts(nextProducts);
      setCustomers(nextCustomers);
      setOrders(nextOrders);
      setItemForm((current) => ({
        ...current,
        productId: current.productId || nextProducts.find((item) => item.active)?.id || '',
      }));
      setOrderForm((current) => ({
        ...current,
        customerId: current.customerId || nextCustomers[0]?.id || '',
      }));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar os dados.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadAll(); }, [loadAll]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    if (!term) return products;
    return products.filter((item) => `${item.name} ${item.category}`.toLocaleLowerCase('pt-BR').includes(term));
  }, [products, search]);

  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    if (!term) return customers;
    return customers.filter((item) => `${item.name} ${item.phone} ${item.neighborhood}`.toLocaleLowerCase('pt-BR').includes(term));
  }, [customers, search]);

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    if (!term) return orders;
    return orders.filter((order) =>
      `${order.code} ${order.customerName} ${order.customerPhone} ${order.items.map((item) => item.productName).join(' ')}`
        .toLocaleLowerCase('pt-BR')
        .includes(term),
    );
  }, [orders, search]);

  const metrics = useMemo(() => {
    const valid = orders.filter((order) => order.status !== 'CANCELLED');
    const today = todayIso();
    const weekLimit = todayIso(7);
    const todayOrders = valid.filter((order) => order.deliveryDate === today);
    const weekOrders = valid.filter((order) => order.deliveryDate >= today && order.deliveryDate <= weekLimit);
    const weekSales = weekOrders.reduce((sum, order) => sum + order.total, 0);
    const receivable = valid.reduce((sum, order) => sum + Math.max(0, order.total - order.paidAmount), 0);
    const inProduction = valid.filter((order) => order.status === 'CONFIRMED' || order.status === 'PRODUCTION').length;
    return { todayOrders, weekOrders, weekSales, receivable, inProduction };
  }, [orders]);

  const productionOrders = useMemo(() => orders.filter((order) =>
    order.deliveryDate === productionDate &&
    order.status !== 'CANCELLED' &&
    order.status !== 'DELIVERED',
  ), [orders, productionDate]);

  const productionSummary = useMemo(() => {
    const map = new Map<string, { productId: string; name: string; saleUnit: SaleUnit; quantity: number; orders: number }>();
    for (const order of productionOrders) {
      for (const item of order.items) {
        const current = map.get(item.productId) ?? {
          productId: item.productId,
          name: item.productName,
          saleUnit: item.saleUnit,
          quantity: 0,
          orders: 0,
        };
        current.quantity += item.quantity;
        current.orders += 1;
        map.set(item.productId, current);
      }
    }
    return [...map.values()].sort((a, b) => b.quantity - a.quantity);
  }, [productionOrders]);

  const finance = useMemo(() => {
    const valid = orders.filter((order) => order.status !== 'CANCELLED');
    const totalSales = valid.reduce((sum, order) => sum + order.total, 0);
    const received = valid.reduce((sum, order) => sum + order.paidAmount, 0);
    const receivable = totalSales - received;
    const productMap = new Map(products.map((product) => [product.id, product]));
    const estimatedCost = valid.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => {
      const product = productMap.get(item.productId);
      return itemSum + (product?.estimatedCost ?? 0) * item.quantity;
    }, 0), 0);
    const estimatedProfit = totalSales - estimatedCost;
    return { totalSales, received, receivable, estimatedCost, estimatedProfit };
  }, [orders, products]);

  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; quantity: number; revenue: number }>();
    for (const order of orders.filter((item) => item.status !== 'CANCELLED')) {
      for (const item of order.items) {
        const current = map.get(item.productId) ?? { name: item.productName, quantity: 0, revenue: 0 };
        current.quantity += item.quantity;
        current.revenue += item.lineTotal;
        map.set(item.productId, current);
      }
    }
    return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [orders]);

  const topCustomers = useMemo(() => {
    const map = new Map<string, { name: string; orders: number; total: number }>();
    for (const order of orders.filter((item) => item.status !== 'CANCELLED')) {
      const current = map.get(order.customerId) ?? { name: order.customerName, orders: 0, total: 0 };
      current.orders += 1;
      current.total += order.total;
      map.set(order.customerId, current);
    }
    return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 5);
  }, [orders]);

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

  async function handleCreateCustomer(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await createCustomer(customerForm);
      setCustomerForm(emptyCustomer);
      setShowCustomerForm(false);
      await loadAll();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Erro ao cadastrar cliente.');
    } finally { setSaving(false); }
  }

  function addDraftItem() {
    const product = products.find((item) => item.id === itemForm.productId && item.active);
    const quantity = Math.max(1, Math.trunc(Number(itemForm.quantity)));
    if (!product) return;
    const existing = draftItems.find((item) => item.productId === product.id);
    if (existing) {
      setDraftItems((items) => items.map((item) => item.productId === product.id
        ? { ...item, quantity: item.quantity + quantity, lineTotal: (item.quantity + quantity) * item.unitPrice }
        : item));
    } else {
      setDraftItems((items) => [...items, {
        id: crypto.randomUUID(),
        productId: product.id,
        productName: product.name,
        saleUnit: product.saleUnit,
        quantity,
        unitPrice: product.salePrice,
        lineTotal: quantity * product.salePrice,
      }]);
    }
    setItemForm((current) => ({ ...current, quantity: 1 }));
  }

  async function handleCreateOrder(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await createOrder({ ...orderForm, items: draftItems });
      setDraftItems([]);
      setOrderForm((current) => ({
        ...current,
        orderKind: 'PARTY',
        fulfillment: 'PICKUP',
        deliveryDate: todayIso(1),
        deliveryTime: '15:00',
        address: '',
        notes: '',
        paidAmount: 0,
      }));
      setShowOrderForm(false);
      await loadAll();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Erro ao criar pedido.');
    } finally { setSaving(false); }
  }

  async function handleStatus(order: Order, status: OrderStatus) {
    try { await updateOrderStatus(order.id, status); await loadAll(); }
    catch (requestError) { window.alert(requestError instanceof Error ? requestError.message : 'Erro ao atualizar pedido.'); }
  }

  async function handlePayment(order: Order) {
    const pending = Math.max(0, order.total - order.paidAmount);
    if (pending <= 0) return window.alert('Esse pedido já está totalmente pago.');
    const raw = window.prompt(`Valor recebido de ${order.customerName}:`, pending.toFixed(2).replace('.', ','));
    if (!raw) return;
    const amount = Number(raw.replace(',', '.'));
    try { await registerPayment(order.id, amount); await loadAll(); }
    catch (requestError) { window.alert(requestError instanceof Error ? requestError.message : 'Erro ao registrar pagamento.'); }
  }

  async function handleDeleteOrder(order: Order) {
    if (!window.confirm(`Excluir o pedido ${order.code}?`)) return;
    try { await deleteOrder(order.id); await loadAll(); }
    catch (requestError) { window.alert(requestError instanceof Error ? requestError.message : 'Erro ao excluir pedido.'); }
  }

  function exportOrders() {
    downloadCsv('noor-salgados-pedidos.csv', [
      ['Pedido', 'Cliente', 'Telefone', 'Entrega', 'Horário', 'Tipo', 'Forma', 'Status', 'Total', 'Pago', 'Pendente'],
      ...orders.map((order) => [
        order.code,
        order.customerName,
        order.customerPhone,
        order.deliveryDate,
        order.deliveryTime,
        order.orderKind === 'PARTY' ? 'Festa' : 'Avulso',
        order.fulfillment === 'DELIVERY' ? 'Entrega' : 'Retirada',
        statusMeta[order.status].label,
        order.total.toFixed(2),
        order.paidAmount.toFixed(2),
        Math.max(0, order.total - order.paidAmount).toFixed(2),
      ]),
    ]);
  }

  function restoreDemo() {
    if (!window.confirm('Restaurar os dados iniciais? Os testes feitos neste navegador serão apagados.')) return;
    resetDemoData();
    void loadAll();
  }

  const draftTotal = draftItems.reduce((sum, item) => sum + item.lineTotal, 0);

  const navItems: Array<{ id: Section; icon: string; label: string }> = [
    { id: 'dashboard', icon: '⌂', label: 'Início' },
    { id: 'products', icon: '◈', label: 'Cardápio' },
    { id: 'customers', icon: '♙', label: 'Clientes' },
    { id: 'orders', icon: '▤', label: 'Pedidos' },
    { id: 'production', icon: '✦', label: 'Produção' },
    { id: 'finance', icon: '◇', label: 'Financeiro' },
  ];

  const pageAction = section === 'products' ? (
    <button className="primary-button" onClick={() => setShowProductForm((value) => !value)}>{showProductForm ? 'Fechar' : '+ Novo item'}</button>
  ) : section === 'customers' ? (
    <button className="primary-button" onClick={() => setShowCustomerForm((value) => !value)}>{showCustomerForm ? 'Fechar' : '+ Novo cliente'}</button>
  ) : section === 'orders' ? (
    <button className="primary-button" onClick={() => setShowOrderForm((value) => !value)}>{showOrderForm ? 'Fechar pedido' : '+ Nova encomenda'}</button>
  ) : null;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">ن</span>
          <div><strong>Noor Salgados</strong><small>encomendas & festas</small></div>
        </div>
        <nav className="nav-list" aria-label="Navegação principal">
          {navItems.map((item) => (
            <button key={item.id} className={`nav-item ${section === item.id ? 'active' : ''}`} onClick={() => { setSection(item.id); setSearch(''); }}>
              <b>{item.icon}</b><span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-foot"><span className="status-dot" /><span>Demo salva neste aparelho</span></div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div><p className="eyebrow">Noor Salgados · gestão simples</p><h1>{sectionMeta[section].title}</h1><p>{sectionMeta[section].subtitle}</p></div>
          {pageAction}
        </header>

        <div className="demo-banner"><span>Esta versão salva tudo somente neste navegador. O banco online entra na próxima etapa.</span><button onClick={restoreDemo}>Restaurar exemplo</button></div>
        {error && <div className="error-banner">{error}</div>}

        {section === 'dashboard' && (
          <>
            <section className="metrics-grid">
              <Metric label="Pedidos de hoje" value={metrics.todayOrders.length} hint="entregas e retiradas" />
              <Metric label="Vendas da semana" value={money.format(metrics.weekSales)} hint={`${metrics.weekOrders.length} pedidos programados`} />
              <Metric label="A receber" value={money.format(metrics.receivable)} hint="saldo pendente" warning={metrics.receivable > 0} />
              <Metric label="Em produção" value={metrics.inProduction} hint="confirmados ou produzindo" />
            </section>

            <div className="dashboard-grid">
              <section className="panel-card">
                <PanelHeading title="Agenda de hoje" subtitle="Pedidos com entrega ou retirada para hoje." action="Ver pedidos" onClick={() => setSection('orders')} />
                <div className="compact-list">
                  {metrics.todayOrders.length === 0 ? <Empty text="Nenhum pedido para hoje." /> : metrics.todayOrders.map((order) => (
                    <button className="compact-row compact-button" key={order.id} onClick={() => setSection('orders')}>
                      <span className="time-pill">{order.deliveryTime || '--:--'}</span>
                      <div><strong>{order.code} · {order.customerName}</strong><small>{order.fulfillment === 'DELIVERY' ? 'Entrega' : 'Retirada'} · {order.items.length} itens</small></div>
                      <StatusBadge status={order.status} />
                    </button>
                  ))}
                </div>
              </section>

              <section className="panel-card">
                <PanelHeading title="Próximas encomendas" subtitle="O que está chegando nos próximos dias." action="Produção" onClick={() => setSection('production')} />
                <div className="compact-list">
                  {orders.filter((order) => order.deliveryDate >= todayIso() && order.status !== 'CANCELLED' && order.status !== 'DELIVERED').slice(0, 6).map((order) => (
                    <div className="compact-row" key={order.id}>
                      <span className="date-tile"><b>{parseLocalDate(order.deliveryDate).getDate()}</b><small>{parseLocalDate(order.deliveryDate).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</small></span>
                      <div><strong>{order.customerName}</strong><small>{order.items.map((item) => item.productName).join(', ')}</small></div>
                      <b className="money-small">{money.format(order.total)}</b>
                    </div>
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
                <div className="form-heading"><strong>Novo item do cardápio</strong><span>Cadastre salgado, combo ou bandeja com preço e custo estimado.</span></div>
                <Field label="Nome" wide><input required value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} placeholder="Ex: Mini esfiha de carne" /></Field>
                <Field label="Categoria"><input required value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })} placeholder="Ex: Árabes" /></Field>
                <Field label="Venda por"><select value={productForm.saleUnit} onChange={(e) => setProductForm({ ...productForm, saleUnit: e.target.value as SaleUnit })}><option value="HUNDRED">Cento</option><option value="TRAY">Bandeja</option><option value="UNIT">Unidade</option></select></Field>
                <Field label="Preço de venda"><input required min="0" step="0.01" type="number" value={productForm.salePrice} onChange={(e) => setProductForm({ ...productForm, salePrice: Number(e.target.value) })} /></Field>
                <Field label="Custo estimado"><input required min="0" step="0.01" type="number" value={productForm.estimatedCost} onChange={(e) => setProductForm({ ...productForm, estimatedCost: Number(e.target.value) })} /></Field>
                <button className="primary-button form-submit" disabled={saving}>{saving ? 'Salvando...' : 'Cadastrar item'}</button>
              </form>
            )}
            <section className="table-card">
              <div className="table-toolbar"><div><h2>Seu cardápio</h2><p>{products.filter((item) => item.active).length} itens disponíveis para venda.</p></div><Search value={search} onChange={setSearch} placeholder="Buscar salgado..." /></div>
              <div className="product-grid">
                {filteredProducts.map((product) => (
                  <article className={`product-card ${!product.active ? 'muted-card' : ''}`} key={product.id}>
                    <div className="product-card-top"><span className="food-icon">{product.category === 'Árabes' ? '◈' : '✦'}</span><span className={`availability ${product.active ? 'available' : ''}`}>{product.active ? 'Ativo' : 'Pausado'}</span></div>
                    <h3>{product.name}</h3><p>{product.category} · vendido por {unitLabel(product.saleUnit)}</p>
                    <div className="price-row"><strong>{money.format(product.salePrice)}</strong><span>{unitShort(product.saleUnit)}</span></div>
                    <div className="cost-row"><span>Custo estimado</span><b>{money.format(product.estimatedCost)}</b></div>
                    <div className="card-actions"><button onClick={() => void toggleProduct(product.id).then(loadAll)}>{product.active ? 'Pausar' : 'Ativar'}</button><button className="danger-link" onClick={() => void deleteProduct(product.id).then(loadAll).catch((err) => window.alert(err instanceof Error ? err.message : 'Erro'))}>Excluir</button></div>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}

        {section === 'customers' && (
          <>
            {showCustomerForm && (
              <form className="form-card customer-form" onSubmit={handleCreateCustomer}>
                <div className="form-heading"><strong>Novo cliente</strong><span>Dados rápidos para facilitar pedidos futuros.</span></div>
                <Field label="Nome" wide><input required value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} /></Field>
                <Field label="Telefone / WhatsApp"><input value={customerForm.phone} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} placeholder="(11) 99999-9999" /></Field>
                <Field label="Bairro"><input value={customerForm.neighborhood} onChange={(e) => setCustomerForm({ ...customerForm, neighborhood: e.target.value })} /></Field>
                <Field label="Observações" wide><input value={customerForm.notes} onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })} placeholder="Preferências, referência, contato..." /></Field>
                <button className="primary-button form-submit" disabled={saving}>Salvar cliente</button>
              </form>
            )}
            <section className="table-card">
              <div className="table-toolbar"><div><h2>Clientes</h2><p>{customers.length} contatos cadastrados.</p></div><Search value={search} onChange={setSearch} placeholder="Buscar cliente..." /></div>
              <div className="customer-grid">
                {filteredCustomers.map((customer) => {
                  const history = orders.filter((order) => order.customerId === customer.id && order.status !== 'CANCELLED');
                  const spent = history.reduce((sum, order) => sum + order.total, 0);
                  return (
                    <article className="customer-card" key={customer.id}>
                      <div className="avatar">{customer.name.slice(0, 2).toUpperCase()}</div>
                      <div className="customer-main"><h3>{customer.name}</h3><p>{customer.phone || 'Sem telefone'} · {customer.neighborhood || 'Bairro não informado'}</p>{customer.notes && <small>{customer.notes}</small>}</div>
                      <div className="customer-stats"><div><span>Pedidos</span><b>{history.length}</b></div><div><span>Total</span><b>{money.format(spent)}</b></div></div>
                      <button className="danger-link" onClick={() => void deleteCustomer(customer.id).then(loadAll).catch((err) => window.alert(err instanceof Error ? err.message : 'Erro'))}>Excluir</button>
                    </article>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {section === 'orders' && (
          <>
            {showOrderForm && (
              <form className="order-builder" onSubmit={handleCreateOrder}>
                <div className="form-heading"><strong>Nova encomenda</strong><span>Monte o pedido e registre o sinal recebido.</span></div>
                <div className="order-fields">
                  <Field label="Cliente"><select required value={orderForm.customerId} onChange={(e) => setOrderForm({ ...orderForm, customerId: e.target.value })}><option value="">Selecione</option>{customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.name}</option>)}</select></Field>
                  <Field label="Tipo"><select value={orderForm.orderKind} onChange={(e) => setOrderForm({ ...orderForm, orderKind: e.target.value as 'PARTY' | 'DIRECT' })}><option value="PARTY">Festa / evento</option><option value="DIRECT">Venda avulsa</option></select></Field>
                  <Field label="Data de entrega"><input required type="date" value={orderForm.deliveryDate} onChange={(e) => setOrderForm({ ...orderForm, deliveryDate: e.target.value })} /></Field>
                  <Field label="Horário"><input type="time" value={orderForm.deliveryTime} onChange={(e) => setOrderForm({ ...orderForm, deliveryTime: e.target.value })} /></Field>
                  <Field label="Forma"><select value={orderForm.fulfillment} onChange={(e) => setOrderForm({ ...orderForm, fulfillment: e.target.value as 'PICKUP' | 'DELIVERY' })}><option value="PICKUP">Retirada</option><option value="DELIVERY">Entrega</option></select></Field>
                  {orderForm.fulfillment === 'DELIVERY' && <Field label="Endereço" wide><input value={orderForm.address} onChange={(e) => setOrderForm({ ...orderForm, address: e.target.value })} placeholder="Rua, número, bairro" /></Field>}
                  <Field label="Observações" wide><input value={orderForm.notes} onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })} placeholder="Festa, sabores, horário, referências..." /></Field>
                </div>

                <div className="item-builder">
                  <select value={itemForm.productId} onChange={(e) => setItemForm({ ...itemForm, productId: e.target.value })}>{products.filter((item) => item.active).map((product) => <option key={product.id} value={product.id}>{product.name} · {money.format(product.salePrice)} {unitShort(product.saleUnit)}</option>)}</select>
                  <input min="1" type="number" value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: Number(e.target.value) })} />
                  <button type="button" onClick={addDraftItem}>+ Adicionar</button>
                </div>

                <div className="draft-items">
                  {draftItems.length === 0 ? <Empty text="Adicione os salgados deste pedido." /> : draftItems.map((item) => (
                    <div className="draft-row" key={item.id}><div><strong>{item.productName}</strong><small>{item.quantity} {unitLabel(item.saleUnit, item.quantity)} × {money.format(item.unitPrice)}</small></div><b>{money.format(item.lineTotal)}</b><button type="button" onClick={() => setDraftItems((items) => items.filter((current) => current.id !== item.id))}>×</button></div>
                  ))}
                </div>

                <div className="order-total"><div><span>Total do pedido</span><strong>{money.format(draftTotal)}</strong></div><Field label="Sinal / valor já pago"><input min="0" max={draftTotal} step="0.01" type="number" value={orderForm.paidAmount} onChange={(e) => setOrderForm({ ...orderForm, paidAmount: Number(e.target.value) })} /></Field><button className="primary-button" disabled={saving || draftItems.length === 0}>{saving ? 'Salvando...' : 'Confirmar pedido'}</button></div>
              </form>
            )}

            <section className="table-card">
              <div className="table-toolbar"><div><h2>Encomendas</h2><p>Do orçamento à entrega final.</p></div><Search value={search} onChange={setSearch} placeholder="Pedido ou cliente..." /></div>
              <div className="orders-list">
                {loading ? <Empty text="Carregando pedidos..." /> : filteredOrders.length === 0 ? <Empty text="Nenhum pedido encontrado." /> : filteredOrders.map((order) => (
                  <article className="order-card" key={order.id}>
                    <div className="order-date"><b>{parseLocalDate(order.deliveryDate).getDate()}</b><span>{parseLocalDate(order.deliveryDate).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span><small>{order.deliveryTime}</small></div>
                    <div className="order-info"><div className="order-title"><strong>{order.code} · {order.customerName}</strong><StatusBadge status={order.status} /></div><p>{order.orderKind === 'PARTY' ? 'Festa / evento' : 'Venda avulsa'} · {order.fulfillment === 'DELIVERY' ? `Entrega ${order.address ? `em ${order.address}` : ''}` : 'Retirada'}</p><div className="item-tags">{order.items.map((item) => <span key={item.id}>{item.quantity} {unitLabel(item.saleUnit, item.quantity)} · {item.productName}</span>)}</div>{order.notes && <small className="order-note">{order.notes}</small>}</div>
                    <div className="order-money"><strong>{money.format(order.total)}</strong><span className={order.paidAmount >= order.total ? 'paid' : 'pending'}>{order.paidAmount >= order.total ? 'Pago' : `Falta ${money.format(order.total - order.paidAmount)}`}</span></div>
                    <div className="order-actions"><select value={order.status} onChange={(e) => void handleStatus(order, e.target.value as OrderStatus)}>{Object.entries(statusMeta).map(([value, meta]) => <option value={value} key={value}>{meta.label}</option>)}</select><button onClick={() => void handlePayment(order)}>+ Pagamento</button><button className="danger-link" onClick={() => void handleDeleteOrder(order)}>Excluir</button></div>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}

        {section === 'production' && (
          <>
            <div className="production-toolbar"><div><button className={productionDate === todayIso() ? 'active' : ''} onClick={() => setProductionDate(todayIso())}>Hoje</button><button className={productionDate === todayIso(1) ? 'active' : ''} onClick={() => setProductionDate(todayIso(1))}>Amanhã</button></div><input type="date" value={productionDate} onChange={(e) => setProductionDate(e.target.value)} /></div>
            <section className="production-hero"><div><span>Produção para</span><strong>{dateLabel.format(parseLocalDate(productionDate))}</strong><small>{productionOrders.length} pedidos programados</small></div><div className="production-count"><strong>{productionSummary.reduce((sum, item) => sum + (item.saleUnit === 'HUNDRED' ? item.quantity * 100 : item.quantity), 0)}</strong><span>unidades / volumes</span></div></section>
            <div className="production-grid">
              {productionSummary.length === 0 ? <div className="panel-card"><Empty text="Nada para produzir nesta data." /></div> : productionSummary.map((item) => (
                <article className="production-card" key={item.productId}><span className="production-symbol">✦</span><div><h3>{item.name}</h3><p>{item.orders} pedido(s)</p></div><div className="production-qty"><strong>{item.quantity}</strong><span>{unitLabel(item.saleUnit, item.quantity)}</span>{item.saleUnit === 'HUNDRED' && <small>{item.quantity * 100} unidades</small>}</div></article>
              ))}
            </div>
            <section className="panel-card production-orders"><PanelHeading title="Pedidos desta produção" subtitle="Use os status para acompanhar a cozinha." /><div className="compact-list">{productionOrders.map((order) => <div className="compact-row" key={order.id}><span className="time-pill">{order.deliveryTime}</span><div><strong>{order.code} · {order.customerName}</strong><small>{order.items.map((item) => `${item.quantity} ${unitLabel(item.saleUnit, item.quantity)} ${item.productName}`).join(' · ')}</small></div><select value={order.status} onChange={(e) => void handleStatus(order, e.target.value as OrderStatus)}>{Object.entries(statusMeta).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}</select></div>)}</div></section>
          </>
        )}

        {section === 'finance' && (
          <>
            <section className="metrics-grid finance-metrics"><Metric label="Vendas registradas" value={money.format(finance.totalSales)} hint="pedidos não cancelados" /><Metric label="Já recebido" value={money.format(finance.received)} hint="sinais + pagamentos" /><Metric label="A receber" value={money.format(finance.receivable)} hint="saldo dos clientes" warning={finance.receivable > 0} /><Metric label="Lucro estimado" value={money.format(finance.estimatedProfit)} hint={`custo estimado ${money.format(finance.estimatedCost)}`} /></section>
            <div className="dashboard-grid">
              <section className="panel-card"><PanelHeading title="Mais vendidos" subtitle="Ranking pelo valor vendido." /><div className="rank-list">{topProducts.map((item, index) => <div className="rank-row" key={item.name}><span>{index + 1}</span><div><strong>{item.name}</strong><small>{item.quantity} volumes vendidos</small></div><b>{money.format(item.revenue)}</b></div>)}</div></section>
              <section className="panel-card"><PanelHeading title="Melhores clientes" subtitle="Quem mais comprou no período." /><div className="rank-list">{topCustomers.map((item, index) => <div className="rank-row" key={item.name}><span>{index + 1}</span><div><strong>{item.name}</strong><small>{item.orders} pedido(s)</small></div><b>{money.format(item.total)}</b></div>)}</div></section>
            </div>
            <section className="export-card"><div><h2>Relatório de pedidos</h2><p>Baixe a lista com totais, pagamentos, datas e status em CSV.</p></div><button onClick={exportOrders}>Exportar para Excel</button></section>
          </>
        )}
      </main>

      <nav className="mobile-nav">{navItems.map((item) => <button key={item.id} className={section === item.id ? 'active' : ''} onClick={() => { setSection(item.id); setSearch(''); }}><b>{item.icon}</b><span>{item.label}</span></button>)}</nav>
    </div>
  );
}

function Metric({ label, value, hint, warning = false }: { label: string; value: string | number; hint: string; warning?: boolean }) {
  return <article className={`metric-card ${warning ? 'warning-card' : ''}`}><span>{label}</span><strong>{value}</strong><small>{hint}</small></article>;
}

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return <label className={wide ? 'wide-field' : ''}>{label}{children}</label>;
}

function Search({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <input className="search-input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />;
}

function Empty({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const meta = statusMeta[status];
  return <span className={`status-badge ${meta.className}`}>{meta.label}</span>;
}

function PanelHeading({ title, subtitle, action, onClick }: { title: string; subtitle: string; action?: string; onClick?: () => void }) {
  return <div className="panel-heading"><div><h2>{title}</h2><p>{subtitle}</p></div>{action && <button className="text-button" onClick={onClick}>{action}</button>}</div>;
}
