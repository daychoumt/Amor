import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createCustomer,
  createOrder,
  createProduct,
  deleteCustomer,
  deleteOrder,
  deleteProduct,
  exportBackup,
  getCustomers,
  getOrders,
  getProducts,
  getSettings,
  importBackup,
  registerPayment,
  resetDemoData,
  toggleProduct,
  updateOrderStatus,
  updateSettings,
} from './api';
import type {
  BusinessSettings,
  Customer,
  IngredientUnit,
  NewCustomer,
  NewOrder,
  NewSnackProduct,
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  RecipeIngredient,
  SaleUnit,
  SnackProduct,
} from './types';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const shortDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });
const fullDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

type Section = 'dashboard' | 'products' | 'customers' | 'orders' | 'production' | 'calendar' | 'finance' | 'settings';
type ProductionRange = 'TODAY' | 'TOMORROW' | 'WEEK';

const emptyProduct: NewSnackProduct = {
  name: '', category: 'Fritos', kind: 'SNACK', saleUnit: 'HUNDRED', salePrice: 0, estimatedCost: 0,
  active: true, preparationNotes: '', recipe: [], comboItems: [],
};
const emptyCustomer: NewCustomer = { name: '', phone: '', neighborhood: '', address: '', notes: '' };

function todayIso(offset = 0) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}
function parseLocalDate(value: string) { return new Date(`${value}T12:00:00`); }
function unitLabel(unit: SaleUnit, quantity = 1) {
  if (unit === 'HUNDRED') return quantity === 1 ? 'cento' : 'centos';
  if (unit === 'TRAY') return quantity === 1 ? 'bandeja' : 'bandejas';
  if (unit === 'KIT') return quantity === 1 ? 'kit' : 'kits';
  return quantity === 1 ? 'unidade' : 'unidades';
}
function statusLabel(status: OrderStatus) {
  return ({ QUOTE: 'Orçamento', CONFIRMED: 'Confirmado', PRODUCTION: 'Em produção', READY: 'Pronto', DELIVERED: 'Entregue', CANCELLED: 'Cancelado' } as Record<OrderStatus, string>)[status];
}
function paymentLabel(value: PaymentMethod) {
  return ({ PIX: 'Pix', CASH: 'Dinheiro', CARD: 'Cartão', TRANSFER: 'Transferência', OTHER: 'Outro' } as Record<PaymentMethod, string>)[value];
}
function nextStatus(status: OrderStatus): OrderStatus | null {
  if (status === 'CONFIRMED') return 'PRODUCTION';
  if (status === 'PRODUCTION') return 'READY';
  if (status === 'READY') return 'DELIVERED';
  return null;
}
function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
}
function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\n');
  downloadFile(filename, `\uFEFF${csv}`, 'text/csv;charset=utf-8');
}
function digits(value: string) { return value.replace(/\D/g, ''); }

export function App() {
  const [section, setSection] = useState<Section>('dashboard');
  const [products, setProducts] = useState<SnackProduct[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<BusinessSettings>({ businessName: 'Noor Salgados', whatsapp: '', dailyCapacity: 1500 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showProductForm, setShowProductForm] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [productForm, setProductForm] = useState<NewSnackProduct>(emptyProduct);
  const [customerForm, setCustomerForm] = useState<NewCustomer>(emptyCustomer);
  const [recipeForm, setRecipeForm] = useState<{ name: string; quantity: number; unit: IngredientUnit; estimatedCost: number }>({ name: '', quantity: 1, unit: 'kg', estimatedCost: 0 });
  const [comboForm, setComboForm] = useState({ productId: '', quantity: 1 });
  const [productionRange, setProductionRange] = useState<ProductionRange>('TODAY');
  const [calendarMonth, setCalendarMonth] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(12, 0, 0, 0); return d; });
  const backupInputRef = useRef<HTMLInputElement>(null);

  const [orderForm, setOrderForm] = useState<Omit<NewOrder, 'items'>>({
    customerId: '', eventName: '', orderKind: 'PARTY', fulfillment: 'PICKUP', deliveryDate: todayIso(1), deliveryTime: '15:00',
    address: '', notes: '', discount: 0, deliveryFee: 0, paidAmount: 0, paymentMethod: 'PIX',
  });
  const [draftItems, setDraftItems] = useState<OrderItem[]>([]);
  const [itemForm, setItemForm] = useState({ productId: '', quantity: 1 });

  const loadAll = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [nextProducts, nextCustomers, nextOrders, nextSettings] = await Promise.all([getProducts(), getCustomers(), getOrders(), getSettings()]);
      setProducts(nextProducts); setCustomers(nextCustomers); setOrders(nextOrders); setSettings(nextSettings);
      setItemForm((current) => ({ ...current, productId: current.productId || nextProducts.find((item) => item.active)?.id || '' }));
      setComboForm((current) => ({ ...current, productId: current.productId || nextProducts.find((item) => item.active && item.kind === 'SNACK')?.id || '' }));
      setOrderForm((current) => ({ ...current, customerId: current.customerId || nextCustomers[0]?.id || '' }));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar os dados.');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void loadAll(); }, [loadAll]);

  const validOrders = useMemo(() => orders.filter((order) => order.status !== 'CANCELLED'), [orders]);
  const filteredProducts = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR'); if (!term) return products;
    return products.filter((item) => `${item.name} ${item.category}`.toLocaleLowerCase('pt-BR').includes(term));
  }, [products, search]);
  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR'); if (!term) return customers;
    return customers.filter((item) => `${item.name} ${item.phone} ${item.neighborhood}`.toLocaleLowerCase('pt-BR').includes(term));
  }, [customers, search]);
  const filteredOrders = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR'); if (!term) return orders;
    return orders.filter((order) => `${order.code} ${order.customerName} ${order.eventName} ${order.items.map((item) => item.productName).join(' ')}`.toLocaleLowerCase('pt-BR').includes(term));
  }, [orders, search]);

  const metrics = useMemo(() => {
    const today = todayIso(); const weekEnd = todayIso(7);
    const todayOrders = validOrders.filter((order) => order.deliveryDate === today);
    const weekOrders = validOrders.filter((order) => order.deliveryDate >= today && order.deliveryDate <= weekEnd);
    return {
      todayOrders,
      weekOrders,
      weekSales: weekOrders.reduce((sum, order) => sum + order.total, 0),
      receivable: validOrders.reduce((sum, order) => sum + Math.max(0, order.total - order.paidAmount), 0),
      activeProduction: validOrders.filter((order) => ['CONFIRMED', 'PRODUCTION'].includes(order.status)).length,
    };
  }, [validOrders]);

  const finance = useMemo(() => {
    const productMap = new Map(products.map((product) => [product.id, product]));
    const totalSales = validOrders.reduce((sum, order) => sum + order.total, 0);
    const received = validOrders.reduce((sum, order) => sum + order.paidAmount, 0);
    const estimatedCost = validOrders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + (productMap.get(item.productId)?.estimatedCost ?? 0) * item.quantity, 0), 0);
    return { totalSales, received, receivable: totalSales - received, estimatedCost, estimatedProfit: totalSales - estimatedCost };
  }, [validOrders, products]);

  const productionWindow = useMemo(() => {
    const start = productionRange === 'TOMORROW' ? todayIso(1) : todayIso();
    const end = productionRange === 'WEEK' ? todayIso(7) : start;
    return validOrders.filter((order) => order.deliveryDate >= start && order.deliveryDate <= end && ['CONFIRMED', 'PRODUCTION'].includes(order.status));
  }, [validOrders, productionRange]);

  const productionSummary = useMemo(() => {
    const productMap = new Map(products.map((product) => [product.id, product]));
    const map = new Map<string, { product: SnackProduct; quantity: number; orders: Set<string> }>();
    const add = (productId: string, quantity: number, orderCode: string) => {
      const product = productMap.get(productId); if (!product) return;
      if (product.kind === 'COMBO') {
        product.comboItems.forEach((component) => add(component.productId, component.quantity * quantity, orderCode));
        return;
      }
      const current = map.get(productId) ?? { product, quantity: 0, orders: new Set<string>() };
      current.quantity += quantity; current.orders.add(orderCode); map.set(productId, current);
    };
    productionWindow.forEach((order) => order.items.forEach((item) => add(item.productId, item.quantity, order.code)));
    return [...map.values()].sort((a, b) => b.quantity - a.quantity);
  }, [productionWindow, products]);

  const shoppingList = useMemo(() => {
    const ingredientMap = new Map<string, { name: string; unit: string; quantity: number; cost: number }>();
    productionSummary.forEach(({ product, quantity }) => product.recipe.forEach((ingredient) => {
      const key = `${ingredient.name.toLocaleLowerCase('pt-BR')}|${ingredient.unit}`;
      const current = ingredientMap.get(key) ?? { name: ingredient.name, unit: ingredient.unit, quantity: 0, cost: 0 };
      current.quantity += ingredient.quantity * quantity;
      current.cost += ingredient.estimatedCost * quantity;
      ingredientMap.set(key, current);
    }));
    return [...ingredientMap.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [productionSummary]);

  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; quantity: number; revenue: number }>();
    validOrders.forEach((order) => order.items.forEach((item) => {
      const current = map.get(item.productId) ?? { name: item.productName, quantity: 0, revenue: 0 };
      current.quantity += item.quantity; current.revenue += item.lineTotal; map.set(item.productId, current);
    }));
    return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [validOrders]);

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear(); const month = calendarMonth.getMonth();
    const first = new Date(year, month, 1, 12); const leading = first.getDay(); const lastDay = new Date(year, month + 1, 0, 12).getDate();
    const cells: Array<{ iso?: string; day?: number; orders?: Order[] }> = [];
    for (let i = 0; i < leading; i += 1) cells.push({});
    for (let day = 1; day <= lastDay; day += 1) {
      const iso = new Date(year, month, day, 12).toISOString().slice(0, 10);
      cells.push({ iso, day, orders: validOrders.filter((order) => order.deliveryDate === iso) });
    }
    return cells;
  }, [calendarMonth, validOrders]);

  function estimatePieces(order: Order) {
    const map = new Map(products.map((product) => [product.id, product]));
    const countItem = (productId: string, quantity: number): number => {
      const product = map.get(productId); if (!product) return 0;
      if (product.kind === 'COMBO') return product.comboItems.reduce((sum, item) => sum + countItem(item.productId, item.quantity * quantity), 0);
      if (product.saleUnit === 'HUNDRED') return quantity * 100;
      if (product.saleUnit === 'UNIT') return quantity;
      if (product.saleUnit === 'TRAY') return quantity * 50;
      return quantity;
    };
    return order.items.reduce((sum, item) => sum + countItem(item.productId, item.quantity), 0);
  }

  async function handleCreateProduct(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError('');
    try { await createProduct(productForm); setProductForm(emptyProduct); setShowProductForm(false); await loadAll(); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Erro ao cadastrar produto.'); }
    finally { setSaving(false); }
  }
  function addRecipeIngredient() {
    if (!recipeForm.name.trim() || recipeForm.quantity <= 0) return;
    const ingredient: RecipeIngredient = { id: crypto.randomUUID(), name: recipeForm.name.trim(), quantity: Number(recipeForm.quantity), unit: recipeForm.unit, estimatedCost: Math.max(0, Number(recipeForm.estimatedCost)) };
    setProductForm((current) => ({ ...current, recipe: [...current.recipe, ingredient], estimatedCost: Math.max(current.estimatedCost, current.recipe.reduce((sum, item) => sum + item.estimatedCost, 0) + ingredient.estimatedCost) }));
    setRecipeForm({ name: '', quantity: 1, unit: 'kg', estimatedCost: 0 });
  }
  function addComboItem() {
    const product = products.find((item) => item.id === comboForm.productId && item.kind === 'SNACK'); if (!product) return;
    const quantity = Math.max(1, Number(comboForm.quantity));
    setProductForm((current) => ({ ...current, comboItems: [...current.comboItems, { id: crypto.randomUUID(), productId: product.id, productName: product.name, quantity }] }));
    setComboForm((current) => ({ ...current, quantity: 1 }));
  }
  async function handleCreateCustomer(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError('');
    try { await createCustomer(customerForm); setCustomerForm(emptyCustomer); setShowCustomerForm(false); await loadAll(); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Erro ao cadastrar cliente.'); }
    finally { setSaving(false); }
  }
  function addDraftItem() {
    const product = products.find((item) => item.id === itemForm.productId && item.active); const quantity = Math.max(1, Math.trunc(Number(itemForm.quantity))); if (!product) return;
    const existing = draftItems.find((item) => item.productId === product.id);
    if (existing) setDraftItems((items) => items.map((item) => item.productId === product.id ? { ...item, quantity: item.quantity + quantity, lineTotal: (item.quantity + quantity) * item.unitPrice } : item));
    else setDraftItems((items) => [...items, { id: crypto.randomUUID(), productId: product.id, productName: product.name, saleUnit: product.saleUnit, quantity, unitPrice: product.salePrice, lineTotal: quantity * product.salePrice }]);
    setItemForm((current) => ({ ...current, quantity: 1 }));
  }
  const draftSubtotal = useMemo(() => draftItems.reduce((sum, item) => sum + item.lineTotal, 0), [draftItems]);
  const draftTotal = Math.max(0, draftSubtotal - Number(orderForm.discount || 0) + (orderForm.fulfillment === 'DELIVERY' ? Number(orderForm.deliveryFee || 0) : 0));

  async function handleCreateOrder(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError('');
    try {
      await createOrder({ ...orderForm, items: draftItems });
      setDraftItems([]); setShowOrderForm(false);
      setOrderForm((current) => ({ ...current, eventName: '', orderKind: 'PARTY', fulfillment: 'PICKUP', deliveryDate: todayIso(1), deliveryTime: '15:00', address: '', notes: '', discount: 0, deliveryFee: 0, paidAmount: 0, paymentMethod: 'PIX' }));
      await loadAll();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Erro ao criar pedido.'); }
    finally { setSaving(false); }
  }
  async function handleStatus(order: Order, status: OrderStatus) { try { await updateOrderStatus(order.id, status); await loadAll(); } catch (e) { window.alert(e instanceof Error ? e.message : 'Erro ao atualizar pedido.'); } }
  async function handlePayment(order: Order) {
    const pending = Math.max(0, order.total - order.paidAmount); if (!pending) return window.alert('Esse pedido já está totalmente pago.');
    const raw = window.prompt(`Valor recebido de ${order.customerName}:`, pending.toFixed(2).replace('.', ',')); if (!raw) return;
    try { await registerPayment(order.id, Number(raw.replace(',', '.'))); await loadAll(); } catch (e) { window.alert(e instanceof Error ? e.message : 'Erro ao registrar pagamento.'); }
  }
  async function handleDeleteOrder(order: Order) { if (!window.confirm(`Excluir o pedido ${order.code}?`)) return; try { await deleteOrder(order.id); await loadAll(); } catch (e) { window.alert(e instanceof Error ? e.message : 'Erro ao excluir pedido.'); } }

  function orderMessage(order: Order) {
    const items = order.items.map((item) => `• ${item.quantity} ${unitLabel(item.saleUnit, item.quantity)} de ${item.productName} — ${money.format(item.lineTotal)}`).join('\n');
    const pending = Math.max(0, order.total - order.paidAmount);
    return `Olá, ${order.customerName}! Segue o resumo da sua encomenda ${order.code}:\n\n${items}\n\nEntrega/retirada: ${fullDate.format(parseLocalDate(order.deliveryDate))} às ${order.deliveryTime || 'a combinar'}\nSubtotal: ${money.format(order.subtotal)}${order.discount ? `\nDesconto: -${money.format(order.discount)}` : ''}${order.deliveryFee ? `\nEntrega: ${money.format(order.deliveryFee)}` : ''}\nTotal: ${money.format(order.total)}\nPago: ${money.format(order.paidAmount)}\nPendente: ${money.format(pending)}\n\n${settings.businessName}`;
  }
  function openWhatsApp(order: Order) {
    const phone = digits(order.customerPhone); if (!phone) return window.alert('Cliente sem telefone cadastrado.');
    const normalized = phone.startsWith('55') ? phone : `55${phone}`;
    window.open(`https://wa.me/${normalized}?text=${encodeURIComponent(orderMessage(order))}`, '_blank', 'noopener,noreferrer');
  }
  function printOrder(order: Order) {
    const win = window.open('', '_blank', 'width=820,height=900'); if (!win) return window.alert('Permita pop-ups para imprimir o pedido.');
    const items = order.items.map((item) => `<tr><td>${item.productName}</td><td>${item.quantity} ${unitLabel(item.saleUnit, item.quantity)}</td><td>${money.format(item.lineTotal)}</td></tr>`).join('');
    win.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${order.code}</title><style>body{font-family:Arial,sans-serif;color:#1e2b22;padding:36px}h1{margin:0;color:#183d2c}.muted{color:#667268}table{width:100%;border-collapse:collapse;margin:24px 0}td,th{padding:10px;border-bottom:1px solid #ddd;text-align:left}.totals{margin-left:auto;width:300px}.totals div{display:flex;justify-content:space-between;padding:5px 0}.box{border:1px solid #ddd;border-radius:10px;padding:16px;margin-top:18px}@media print{button{display:none}}</style></head><body><h1>${settings.businessName}</h1><p class="muted">Pedido ${order.code}</p><div class="box"><strong>${order.customerName}</strong><br>${order.customerPhone}<br>${order.fulfillment === 'DELIVERY' ? order.address : 'Retirada'}<br>${fullDate.format(parseLocalDate(order.deliveryDate))} · ${order.deliveryTime || 'horário a combinar'}${order.eventName ? `<br>${order.eventName}` : ''}</div><table><thead><tr><th>Item</th><th>Quantidade</th><th>Total</th></tr></thead><tbody>${items}</tbody></table><div class="totals"><div><span>Subtotal</span><b>${money.format(order.subtotal)}</b></div><div><span>Desconto</span><b>-${money.format(order.discount)}</b></div><div><span>Entrega</span><b>${money.format(order.deliveryFee)}</b></div><div><span>Total</span><b>${money.format(order.total)}</b></div><div><span>Pago</span><b>${money.format(order.paidAmount)}</b></div><div><span>Pendente</span><b>${money.format(Math.max(0, order.total - order.paidAmount))}</b></div></div>${order.notes ? `<div class="box"><strong>Observações</strong><p>${order.notes}</p></div>` : ''}<button onclick="window.print()">Imprimir</button></body></html>`);
    win.document.close(); win.focus();
  }
  function repeatOrder(order: Order) {
    setSection('orders'); setShowOrderForm(true); setDraftItems(order.items.map((item) => ({ ...item, id: crypto.randomUUID() })));
    setOrderForm({ customerId: order.customerId, eventName: order.eventName, orderKind: order.orderKind, fulfillment: order.fulfillment, deliveryDate: todayIso(1), deliveryTime: order.deliveryTime, address: order.address, notes: order.notes, discount: order.discount, deliveryFee: order.deliveryFee, paidAmount: 0, paymentMethod: order.paymentMethod });
  }

  function exportOrdersCsv() {
    downloadCsv('pedidos-noor.csv', [['Pedido','Cliente','Data','Hora','Tipo','Forma','Status','Subtotal','Desconto','Entrega','Total','Pago','Pendente'], ...orders.map((order) => [order.code, order.customerName, order.deliveryDate, order.deliveryTime, order.orderKind === 'PARTY' ? 'Festa' : 'Avulso', order.fulfillment === 'DELIVERY' ? 'Entrega' : 'Retirada', statusLabel(order.status), order.subtotal, order.discount, order.deliveryFee, order.total, order.paidAmount, Math.max(0, order.total - order.paidAmount)])]);
  }
  function exportBackupFile() { downloadFile(`backup-noor-${todayIso()}.json`, JSON.stringify(exportBackup(), null, 2), 'application/json'); }
  async function importBackupFile(file: File) {
    try { const content = await file.text(); importBackup(JSON.parse(content)); await loadAll(); window.alert('Backup restaurado com sucesso.'); }
    catch (e) { window.alert(e instanceof Error ? e.message : 'Não foi possível importar o backup.'); }
  }

  const sectionMeta: Record<Section, { title: string; subtitle: string }> = {
    dashboard: { title: 'Visão do dia', subtitle: 'Encomendas, produção e recebimentos em um só lugar.' },
    products: { title: 'Cardápio', subtitle: 'Salgados, combos, ficha técnica e margem.' },
    customers: { title: 'Clientes', subtitle: 'Contatos e histórico prontos para novos pedidos.' },
    orders: { title: 'Pedidos', subtitle: 'Encomendas completas, pagamentos, impressão e WhatsApp.' },
    production: { title: 'Produção', subtitle: 'Consolidação automática e lista de compras.' },
    calendar: { title: 'Calendário', subtitle: 'Capacidade e encomendas distribuídas ao longo do mês.' },
    finance: { title: 'Financeiro', subtitle: 'Vendas, recebimentos, custos e margem estimada.' },
    settings: { title: 'Configurações', subtitle: 'Identidade do negócio, capacidade e segurança dos dados.' },
  };
  const nav: Array<{ id: Section; icon: string; label: string }> = [
    { id: 'dashboard', icon: '⌂', label: 'Início' }, { id: 'orders', icon: '▤', label: 'Pedidos' }, { id: 'production', icon: '◈', label: 'Produção' },
    { id: 'calendar', icon: '□', label: 'Calendário' }, { id: 'products', icon: '◇', label: 'Cardápio' }, { id: 'customers', icon: '○', label: 'Clientes' },
    { id: 'finance', icon: '◒', label: 'Financeiro' }, { id: 'settings', icon: '⚙', label: 'Config.' },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">ن</div><div><strong>{settings.businessName}</strong><small>encomendas & produção</small></div></div>
        <nav className="nav-list">{nav.map((item) => <button key={item.id} className={`nav-item ${section === item.id ? 'active' : ''}`} onClick={() => { setSection(item.id); setSearch(''); }}><b>{item.icon}</b><span>{item.label}</span></button>)}</nav>
        <div className="sidebar-foot"><span className="status-dot" /><span>Dados neste aparelho</span></div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div><p className="eyebrow">gestão artesanal · simples e organizada</p><h1>{sectionMeta[section].title}</h1><p>{sectionMeta[section].subtitle}</p></div>
          {(section === 'orders' || section === 'dashboard') && <button className="primary-button" onClick={() => { setSection('orders'); setShowOrderForm(true); }}>+ Nova encomenda</button>}
        </header>
        {error && <div className="error-banner">{error}</div>}
        {loading ? <div className="loading-card">Carregando dados…</div> : (
          <>
            {section === 'dashboard' && <>
              <section className="metrics-grid">
                <Metric label="Pedidos de hoje" value={metrics.todayOrders.length} hint="entregas e retiradas" />
                <Metric label="Semana" value={money.format(metrics.weekSales)} hint={`${metrics.weekOrders.length} encomendas`} />
                <Metric label="A receber" value={money.format(metrics.receivable)} hint="saldo pendente" warning={metrics.receivable > 0} />
                <Metric label="Em produção" value={metrics.activeProduction} hint="pedidos ativos" />
              </section>
              <div className="two-column">
                <Panel title="Agenda de hoje" subtitle="O que exige atenção agora">
                  {metrics.todayOrders.length ? metrics.todayOrders.map((order) => <OrderMini key={order.id} order={order} onOpen={() => setSection('orders')} />) : <Empty text="Nenhuma encomenda para hoje." />}
                </Panel>
                <Panel title="Próximas entregas" subtitle="Pedidos dos próximos dias">
                  {validOrders.filter((o) => o.deliveryDate >= todayIso()).slice(0, 5).map((order) => <OrderMini key={order.id} order={order} onOpen={() => setSection('orders')} />)}
                </Panel>
              </div>
            </>}

            {section === 'products' && <>
              <div className="section-actions"><input className="search-input" placeholder="Buscar no cardápio…" value={search} onChange={(e) => setSearch(e.target.value)} /><button className="primary-button" onClick={() => setShowProductForm((v) => !v)}>{showProductForm ? 'Fechar' : '+ Novo item'}</button></div>
              {showProductForm && <form className="form-card" onSubmit={handleCreateProduct}>
                <div className="form-title"><div><strong>Novo item do cardápio</strong><span>Cadastre salgado ou combo com custo e modo de preparo.</span></div></div>
                <div className="form-grid">
                  <Field label="Nome"><input required value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} /></Field>
                  <Field label="Categoria"><input value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })} /></Field>
                  <Field label="Tipo"><select value={productForm.kind} onChange={(e) => setProductForm({ ...productForm, kind: e.target.value as NewSnackProduct['kind'], saleUnit: e.target.value === 'COMBO' ? 'KIT' : productForm.saleUnit })}><option value="SNACK">Salgado</option><option value="COMBO">Combo / kit</option></select></Field>
                  <Field label="Venda por"><select value={productForm.saleUnit} onChange={(e) => setProductForm({ ...productForm, saleUnit: e.target.value as SaleUnit })}><option value="HUNDRED">Cento</option><option value="UNIT">Unidade</option><option value="TRAY">Bandeja</option><option value="KIT">Kit</option></select></Field>
                  <Field label="Preço"><input type="number" min="0" step="0.01" value={productForm.salePrice} onChange={(e) => setProductForm({ ...productForm, salePrice: Number(e.target.value) })} /></Field>
                  <Field label="Custo estimado"><input type="number" min="0" step="0.01" value={productForm.estimatedCost} onChange={(e) => setProductForm({ ...productForm, estimatedCost: Number(e.target.value) })} /></Field>
                  <Field label="Modo de preparo" wide><textarea value={productForm.preparationNotes} onChange={(e) => setProductForm({ ...productForm, preparationNotes: e.target.value })} placeholder="Observações de produção…" /></Field>
                </div>
                {productForm.kind === 'SNACK' ? <div className="builder-box"><div><strong>Ficha técnica</strong><span>Ingredientes necessários para 1 unidade de venda deste item.</span></div><div className="inline-builder"><input placeholder="Ingrediente" value={recipeForm.name} onChange={(e) => setRecipeForm({ ...recipeForm, name: e.target.value })} /><input type="number" min="0" step="0.01" value={recipeForm.quantity} onChange={(e) => setRecipeForm({ ...recipeForm, quantity: Number(e.target.value) })} /><select value={recipeForm.unit} onChange={(e) => setRecipeForm({ ...recipeForm, unit: e.target.value as IngredientUnit })}><option>kg</option><option>g</option><option>l</option><option>ml</option><option>un</option></select><input type="number" min="0" step="0.01" placeholder="Custo" value={recipeForm.estimatedCost} onChange={(e) => setRecipeForm({ ...recipeForm, estimatedCost: Number(e.target.value) })} /><button type="button" onClick={addRecipeIngredient}>Adicionar</button></div>{productForm.recipe.length > 0 && <div className="chips">{productForm.recipe.map((item) => <span key={item.id}>{item.name}: {item.quantity}{item.unit} · {money.format(item.estimatedCost)} <button type="button" onClick={() => setProductForm((current) => ({ ...current, recipe: current.recipe.filter((r) => r.id !== item.id) }))}>×</button></span>)}</div>}</div>
                : <div className="builder-box"><div><strong>Itens do combo</strong><span>Combine produtos já cadastrados.</span></div><div className="inline-builder"><select value={comboForm.productId} onChange={(e) => setComboForm({ ...comboForm, productId: e.target.value })}>{products.filter((p) => p.kind === 'SNACK' && p.active).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select><input type="number" min="1" step="1" value={comboForm.quantity} onChange={(e) => setComboForm({ ...comboForm, quantity: Number(e.target.value) })} /><button type="button" onClick={addComboItem}>Adicionar</button></div>{productForm.comboItems.length > 0 && <div className="chips">{productForm.comboItems.map((item) => <span key={item.id}>{item.quantity}× {item.productName} <button type="button" onClick={() => setProductForm((current) => ({ ...current, comboItems: current.comboItems.filter((r) => r.id !== item.id) }))}>×</button></span>)}</div>}</div>}
                <div className="form-footer"><button className="primary-button" disabled={saving}>{saving ? 'Salvando…' : 'Cadastrar item'}</button></div>
              </form>}
              <div className="product-grid">{filteredProducts.map((product) => <article className={`product-card ${!product.active ? 'inactive' : ''}`} key={product.id}><div className="product-card-top"><div><span className="category-pill">{product.category}</span><h3>{product.name}</h3><small>{product.kind === 'COMBO' ? 'Combo' : unitLabel(product.saleUnit)}</small></div><button className={`switch ${product.active ? 'on' : ''}`} onClick={() => void toggleProduct(product.id).then(loadAll)} aria-label="Ativar/desativar"><i /></button></div><div className="price-line"><strong>{money.format(product.salePrice)}</strong><span>Custo {money.format(product.estimatedCost)}</span></div><div className="margin-line"><span>Margem estimada</span><b>{money.format(product.salePrice - product.estimatedCost)}</b></div>{product.recipe.length > 0 && <p className="meta-line">{product.recipe.length} ingredientes na ficha técnica</p>}{product.comboItems.length > 0 && <p className="meta-line">{product.comboItems.length} itens no combo</p>}<button className="danger-link" onClick={() => window.confirm(`Excluir ${product.name}?`) && void deleteProduct(product.id).then(loadAll).catch((e) => window.alert(e.message))}>Excluir</button></article>)}</div>
            </>}

            {section === 'customers' && <>
              <div className="section-actions"><input className="search-input" placeholder="Buscar cliente…" value={search} onChange={(e) => setSearch(e.target.value)} /><button className="primary-button" onClick={() => setShowCustomerForm((v) => !v)}>+ Novo cliente</button></div>
              {showCustomerForm && <form className="form-card" onSubmit={handleCreateCustomer}><div className="form-title"><strong>Novo cliente</strong></div><div className="form-grid"><Field label="Nome"><input required value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} /></Field><Field label="Telefone"><input value={customerForm.phone} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} /></Field><Field label="Bairro"><input value={customerForm.neighborhood} onChange={(e) => setCustomerForm({ ...customerForm, neighborhood: e.target.value })} /></Field><Field label="Endereço"><input value={customerForm.address} onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })} /></Field><Field label="Observações" wide><textarea value={customerForm.notes} onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })} /></Field></div><div className="form-footer"><button className="primary-button">Cadastrar cliente</button></div></form>}
              <div className="table-card"><table><thead><tr><th>Cliente</th><th>Telefone</th><th>Bairro</th><th>Pedidos</th><th>Total comprado</th><th /></tr></thead><tbody>{filteredCustomers.map((customer) => { const customerOrders = validOrders.filter((o) => o.customerId === customer.id); return <tr key={customer.id}><td><strong>{customer.name}</strong><small className="block-muted">{customer.address || customer.notes || 'Sem observações'}</small></td><td>{customer.phone || '—'}</td><td>{customer.neighborhood || '—'}</td><td>{customerOrders.length}</td><td>{money.format(customerOrders.reduce((s, o) => s + o.total, 0))}</td><td><button className="table-action danger" onClick={() => window.confirm(`Excluir ${customer.name}?`) && void deleteCustomer(customer.id).then(loadAll).catch((e) => window.alert(e.message))}>Excluir</button></td></tr>; })}</tbody></table></div>
            </>}

            {section === 'orders' && <>
              <div className="section-actions"><input className="search-input" placeholder="Buscar pedido ou cliente…" value={search} onChange={(e) => setSearch(e.target.value)} /><button className="primary-button" onClick={() => setShowOrderForm((v) => !v)}>{showOrderForm ? 'Fechar pedido' : '+ Nova encomenda'}</button></div>
              {showOrderForm && <form className="form-card order-form" onSubmit={handleCreateOrder}><div className="form-title"><div><strong>Nova encomenda</strong><span>Monte o pedido completo e confirme o sinal.</span></div></div><div className="form-grid"><Field label="Cliente"><select required value={orderForm.customerId} onChange={(e) => { const customer = customers.find((c) => c.id === e.target.value); setOrderForm({ ...orderForm, customerId: e.target.value, address: orderForm.fulfillment === 'DELIVERY' ? customer?.address ?? '' : orderForm.address }); }}>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field><Field label="Evento"><input value={orderForm.eventName} onChange={(e) => setOrderForm({ ...orderForm, eventName: e.target.value })} placeholder="Ex: Aniversário 50 pessoas" /></Field><Field label="Tipo"><select value={orderForm.orderKind} onChange={(e) => setOrderForm({ ...orderForm, orderKind: e.target.value as NewOrder['orderKind'] })}><option value="PARTY">Festa / evento</option><option value="DIRECT">Venda avulsa</option></select></Field><Field label="Entrega"><select value={orderForm.fulfillment} onChange={(e) => setOrderForm({ ...orderForm, fulfillment: e.target.value as NewOrder['fulfillment'], deliveryFee: e.target.value === 'PICKUP' ? 0 : orderForm.deliveryFee })}><option value="PICKUP">Retirada</option><option value="DELIVERY">Entrega</option></select></Field><Field label="Data"><input type="date" required value={orderForm.deliveryDate} onChange={(e) => setOrderForm({ ...orderForm, deliveryDate: e.target.value })} /></Field><Field label="Horário"><input type="time" value={orderForm.deliveryTime} onChange={(e) => setOrderForm({ ...orderForm, deliveryTime: e.target.value })} /></Field>{orderForm.fulfillment === 'DELIVERY' && <Field label="Endereço" wide><input required value={orderForm.address} onChange={(e) => setOrderForm({ ...orderForm, address: e.target.value })} /></Field>}<Field label="Pagamento"><select value={orderForm.paymentMethod} onChange={(e) => setOrderForm({ ...orderForm, paymentMethod: e.target.value as PaymentMethod })}><option value="PIX">Pix</option><option value="CASH">Dinheiro</option><option value="CARD">Cartão</option><option value="TRANSFER">Transferência</option><option value="OTHER">Outro</option></select></Field><Field label="Desconto"><input type="number" min="0" step="0.01" value={orderForm.discount} onChange={(e) => setOrderForm({ ...orderForm, discount: Number(e.target.value) })} /></Field>{orderForm.fulfillment === 'DELIVERY' && <Field label="Taxa entrega"><input type="number" min="0" step="0.01" value={orderForm.deliveryFee} onChange={(e) => setOrderForm({ ...orderForm, deliveryFee: Number(e.target.value) })} /></Field>}<Field label="Sinal / pago"><input type="number" min="0" step="0.01" value={orderForm.paidAmount} onChange={(e) => setOrderForm({ ...orderForm, paidAmount: Number(e.target.value) })} /></Field><Field label="Observações" wide><textarea value={orderForm.notes} onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })} /></Field></div>
                <div className="builder-box"><strong>Itens do pedido</strong><div className="inline-builder"><select value={itemForm.productId} onChange={(e) => setItemForm({ ...itemForm, productId: e.target.value })}>{products.filter((p) => p.active).map((p) => <option key={p.id} value={p.id}>{p.name} · {money.format(p.salePrice)}</option>)}</select><input type="number" min="1" step="1" value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: Number(e.target.value) })} /><button type="button" onClick={addDraftItem}>Adicionar</button></div>{draftItems.length > 0 && <div className="draft-list">{draftItems.map((item) => <div key={item.id}><span><strong>{item.productName}</strong><small>{item.quantity} {unitLabel(item.saleUnit, item.quantity)} × {money.format(item.unitPrice)}</small></span><b>{money.format(item.lineTotal)}</b><button type="button" onClick={() => setDraftItems((items) => items.filter((x) => x.id !== item.id))}>×</button></div>)}</div>}</div>
                <div className="order-total"><span>Subtotal <b>{money.format(draftSubtotal)}</b></span><span>Desconto <b>-{money.format(orderForm.discount)}</b></span><span>Entrega <b>{money.format(orderForm.fulfillment === 'DELIVERY' ? orderForm.deliveryFee : 0)}</b></span><strong>Total {money.format(draftTotal)}</strong></div><div className="form-footer"><button className="primary-button" disabled={saving || !draftItems.length}>{saving ? 'Salvando…' : 'Confirmar encomenda'}</button></div>
              </form>}
              <div className="orders-list">{filteredOrders.map((order) => <OrderCard key={order.id} order={order} onStatus={handleStatus} onPayment={handlePayment} onDelete={handleDeleteOrder} onWhatsApp={openWhatsApp} onPrint={printOrder} onRepeat={repeatOrder} />)}</div>
            </>}

            {section === 'production' && <>
              <div className="segmented"><button className={productionRange === 'TODAY' ? 'active' : ''} onClick={() => setProductionRange('TODAY')}>Hoje</button><button className={productionRange === 'TOMORROW' ? 'active' : ''} onClick={() => setProductionRange('TOMORROW')}>Amanhã</button><button className={productionRange === 'WEEK' ? 'active' : ''} onClick={() => setProductionRange('WEEK')}>7 dias</button></div>
              <div className="production-hero"><div><span>Pedidos em produção</span><strong>{productionWindow.length}</strong></div><div><span>Itens consolidados</span><strong>{productionSummary.length}</strong></div><div><span>Capacidade diária</span><strong>{settings.dailyCapacity.toLocaleString('pt-BR')} un.</strong></div></div>
              <div className="two-column"><Panel title="Plano de produção" subtitle="Combos são desmembrados automaticamente">{productionSummary.length ? productionSummary.map(({ product, quantity, orders: codes }) => <div className="production-row" key={product.id}><div><strong>{product.name}</strong><small>{[...codes].join(', ')} · {product.preparationNotes || 'Sem observação de preparo'}</small></div><b>{quantity} {unitLabel(product.saleUnit, quantity)}</b></div>) : <Empty text="Nada para produzir nesse período." />}</Panel><Panel title="Lista de compras" subtitle="Calculada a partir das fichas técnicas">{shoppingList.length ? shoppingList.map((item) => <div className="production-row" key={`${item.name}-${item.unit}`}><div><strong>{item.name}</strong><small>Custo estimado {money.format(item.cost)}</small></div><b>{Number(item.quantity.toFixed(2))} {item.unit}</b></div>) : <Empty text="Cadastre fichas técnicas para gerar a lista automaticamente." />}</Panel></div>
              <Panel title="Pedidos do período" subtitle="Avance cada encomenda conforme a bancada evolui">{productionWindow.map((order) => <OrderMini key={order.id} order={order} onOpen={() => setSection('orders')} />)}</Panel>
            </>}

            {section === 'calendar' && <>
              <div className="calendar-toolbar"><button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1, 12))}>←</button><strong>{new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(calendarMonth)}</strong><button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1, 12))}>→</button></div>
              <div className="calendar-weekdays">{['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((d) => <span key={d}>{d}</span>)}</div><div className="calendar-grid">{calendarDays.map((cell, index) => { if (!cell.iso) return <div className="calendar-day empty" key={`e-${index}`} />; const pieces = (cell.orders ?? []).reduce((sum, order) => sum + estimatePieces(order), 0); const overloaded = pieces > settings.dailyCapacity; return <div className={`calendar-day ${cell.iso === todayIso() ? 'today' : ''} ${overloaded ? 'overloaded' : ''}`} key={cell.iso}><div className="calendar-date"><b>{cell.day}</b>{overloaded && <span>lotado</span>}</div>{cell.orders?.slice(0, 3).map((order) => <button key={order.id} onClick={() => setSection('orders')}><strong>{order.deliveryTime || '—'} {order.customerName}</strong><small>{order.code} · {money.format(order.total)}</small></button>)}{(cell.orders?.length ?? 0) > 3 && <small className="more-orders">+{(cell.orders?.length ?? 0) - 3} pedidos</small>}<div className="capacity-line"><i style={{ width: `${Math.min(100, settings.dailyCapacity ? (pieces / settings.dailyCapacity) * 100 : 0)}%` }} /></div></div>; })}</div>
            </>}

            {section === 'finance' && <>
              <section className="metrics-grid"><Metric label="Vendas" value={money.format(finance.totalSales)} hint="pedidos não cancelados" /><Metric label="Recebido" value={money.format(finance.received)} hint="entradas registradas" /><Metric label="A receber" value={money.format(finance.receivable)} hint="saldo em aberto" warning={finance.receivable > 0} /><Metric label="Lucro estimado" value={money.format(finance.estimatedProfit)} hint={`custos ${money.format(finance.estimatedCost)}`} /></section>
              <div className="two-column"><Panel title="Mais vendidos" subtitle="Por faturamento">{topProducts.map((item, index) => <div className="rank-row" key={item.name}><span>{index + 1}</span><div><strong>{item.name}</strong><small>{item.quantity} unidades de venda</small></div><b>{money.format(item.revenue)}</b></div>)}</Panel><Panel title="Saldos pendentes" subtitle="Pedidos com valor a receber">{validOrders.filter((o) => o.paidAmount < o.total).slice(0, 8).map((order) => <div className="rank-row" key={order.id}><span>•</span><div><strong>{order.customerName}</strong><small>{order.code} · {shortDate.format(parseLocalDate(order.deliveryDate))}</small></div><b>{money.format(order.total - order.paidAmount)}</b></div>)}</Panel></div>
              <div className="export-card"><div><h2>Relatórios e segurança</h2><p>Exporte para Excel ou gere um backup completo do navegador.</p></div><div><button onClick={exportOrdersCsv}>Pedidos CSV</button><button onClick={exportBackupFile}>Backup JSON</button></div></div>
            </>}

            {section === 'settings' && <form className="form-card settings-card" onSubmit={(e) => { e.preventDefault(); void updateSettings(settings).then((next) => { setSettings(next); window.alert('Configurações salvas.'); }); }}><div className="form-title"><div><strong>Negócio</strong><span>Esses dados aparecem nas mensagens e impressões.</span></div></div><div className="form-grid"><Field label="Nome do negócio"><input value={settings.businessName} onChange={(e) => setSettings({ ...settings, businessName: e.target.value })} /></Field><Field label="WhatsApp do negócio"><input value={settings.whatsapp} onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })} placeholder="5511999999999" /></Field><Field label="Capacidade diária (salgados)"><input type="number" min="100" step="50" value={settings.dailyCapacity} onChange={(e) => setSettings({ ...settings, dailyCapacity: Number(e.target.value) })} /></Field></div><div className="form-footer"><button className="primary-button">Salvar configurações</button></div><div className="settings-divider" /><div className="form-title"><div><strong>Dados locais</strong><span>Antes do backend, faça backup regularmente.</span></div></div><div className="settings-actions"><button type="button" onClick={exportBackupFile}>Baixar backup</button><button type="button" onClick={() => backupInputRef.current?.click()}>Restaurar backup</button><input ref={backupInputRef} hidden type="file" accept="application/json" onChange={(e) => { const file = e.target.files?.[0]; if (file) void importBackupFile(file); e.target.value = ''; }} /><button type="button" className="danger-button" onClick={() => { if (window.confirm('Apagar seus testes e restaurar dados de demonstração?')) { resetDemoData(); void loadAll(); } }}>Restaurar demonstração</button></div></form>}
          </>
        )}
      </main>

      <nav className="mobile-nav">{nav.slice(0, 5).map((item) => <button key={item.id} className={section === item.id ? 'active' : ''} onClick={() => setSection(item.id)}><b>{item.icon}</b><span>{item.label}</span></button>)}</nav>
    </div>
  );
}

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) { return <label className={wide ? 'wide' : ''}><span>{label}</span>{children}</label>; }
function Metric({ label, value, hint, warning = false }: { label: string; value: string | number; hint: string; warning?: boolean }) { return <article className={`metric-card ${warning ? 'warning' : ''}`}><span>{label}</span><strong>{value}</strong><small>{hint}</small></article>; }
function Empty({ text }: { text: string }) { return <div className="empty-state">{text}</div>; }
function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) { return <section className="panel-card"><div className="panel-heading"><div><h2>{title}</h2><p>{subtitle}</p></div></div><div className="panel-body">{children}</div></section>; }
function OrderMini({ order, onOpen }: { order: Order; onOpen: () => void }) { return <button className="order-mini" onClick={onOpen}><span className={`status-dot-large status-${order.status.toLowerCase()}`} /><div><strong>{order.deliveryTime || '—'} · {order.customerName}</strong><small>{order.code} · {order.items.length} itens · {statusLabel(order.status)}</small></div><b>{money.format(order.total)}</b></button>; }
function OrderCard({ order, onStatus, onPayment, onDelete, onWhatsApp, onPrint, onRepeat }: { order: Order; onStatus: (order: Order, status: OrderStatus) => void; onPayment: (order: Order) => void; onDelete: (order: Order) => void; onWhatsApp: (order: Order) => void; onPrint: (order: Order) => void; onRepeat: (order: Order) => void }) {
  const pending = Math.max(0, order.total - order.paidAmount); const next = nextStatus(order.status);
  return <article className="order-card"><div className="order-card-head"><div><span className={`status-pill status-${order.status.toLowerCase()}`}>{statusLabel(order.status)}</span><h3>{order.code} · {order.customerName}</h3><p>{fullDate.format(parseLocalDate(order.deliveryDate))} às {order.deliveryTime || 'a combinar'} · {order.fulfillment === 'DELIVERY' ? 'Entrega' : 'Retirada'} · {paymentLabel(order.paymentMethod)}</p></div><strong>{money.format(order.total)}</strong></div>{order.eventName && <div className="event-line">{order.eventName}</div>}<div className="order-items">{order.items.map((item) => <div key={item.id}><span>{item.quantity} {unitLabel(item.saleUnit, item.quantity)} · {item.productName}</span><b>{money.format(item.lineTotal)}</b></div>)}</div><div className="payment-progress"><div><span>Pago {money.format(order.paidAmount)}</span><span>Pendente {money.format(pending)}</span></div><i><b style={{ width: `${order.total ? Math.min(100, (order.paidAmount / order.total) * 100) : 100}%` }} /></i></div><div className="order-actions">{next && <button className="primary-small" onClick={() => onStatus(order, next)}>{next === 'PRODUCTION' ? 'Iniciar produção' : next === 'READY' ? 'Marcar pronto' : 'Marcar entregue'}</button>}{pending > 0 && <button onClick={() => onPayment(order)}>+ Pagamento</button>}<button onClick={() => onWhatsApp(order)}>WhatsApp</button><button onClick={() => onPrint(order)}>Imprimir</button><button onClick={() => onRepeat(order)}>Repetir</button>{!['DELIVERED','CANCELLED'].includes(order.status) && <button onClick={() => onStatus(order, 'CANCELLED')}>Cancelar</button>}<button className="danger" onClick={() => onDelete(order)}>Excluir</button></div></article>;
}
