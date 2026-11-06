import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Link, Navigate, NavLink, Route, Routes } from "react-router-dom";
import {
  Activity,
  Bell,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  Coins,
  FolderOpen,
  Gauge,
  Menu,
  Package,
  Pencil,
  Plus,
  Tag,
  Search,
  Settings,
  Shirt,
  ShoppingBag,
  Users,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { api, type AdminAppointment, type AdminOrder, type Campaign, type CartLine, type Product, type StoreSettings } from "./services/api";
import { toProductSlug } from "./utils/product";

const monthLabels = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const nav = [
  { label: "Overview", to: "/admin", icon: Gauge },
  { label: "Products", to: "/admin/products", icon: Package },
  { label: "Categories", to: "/admin/categories", icon: FolderOpen },
  { label: "Offers", to: "/admin/offers", icon: Tag },
  { label: "Orders", to: "/admin/orders", icon: ClipboardList },
  { label: "Customers", to: "/admin/customers", icon: Users },
  { label: "Appointments", to: "/admin/appointments", icon: CalendarDays },
  { label: "Media library", to: "/admin/media", icon: Activity },
];

type CartEntry = { key: string; product: Product; options: CartLine; quantity: number };
type CartContextValue = { cart: CartEntry[]; add: (product: Product, options: CartLine) => void; quantity: (key: string, delta: number) => void; remove: (key: string) => void; clear: () => void };
const CartContext = createContext<CartContextValue | null>(null);

function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem("rz_cart") ?? "[]") as CartEntry[]; } catch { return []; }
  });
  useEffect(() => { localStorage.setItem("rz_cart", JSON.stringify(cart)); }, [cart]);
  const value: CartContextValue = {
    cart,
    add: (product, options) => setCart(current => {
      const key = `${product.id}:${options.size ?? ""}:${options.color ?? ""}:${options.fabric ?? ""}:${options.fit ?? ""}`;
      const found = current.find(item => item.key === key);
      return found ? current.map(item => item.key === key ? { ...item, quantity: item.quantity + 1 } : item) : [...current, { key, product, options, quantity: 1 }];
    }),
    quantity: (key, delta) => setCart(current => current.map(item => item.key === key ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item)),
    remove: key => setCart(current => current.filter(item => item.key !== key)),
    clear: () => setCart([]),
  };
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}

function formatMoney(value: number | string, currency = "CAD") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(value));
}

function campaignApplies(offer:Campaign,product:Product){
  return !product.sale_price&&(offer.categories.includes(product.category)||offer.product_ids.includes(product.id))&&(offer.categories.length>0||offer.product_ids.length>0);
}
function campaignUnitDiscount(offer:Campaign,price:number){
  if(offer.discount_type==="none")return 0;
  const amount=offer.discount_type==="percent"?price*Number(offer.discount_value)/100:Number(offer.discount_value);
  return Math.min(price,Number(offer.maximum_discount?Math.min(amount,Number(offer.maximum_discount)):amount));
}
function previewCartCampaign(cart:CartEntry[],campaigns:Campaign[]){
  const subtotal=cart.reduce((sum,item)=>sum+Number(item.product.sale_price??item.product.price)*item.quantity,0);
  const available=campaigns.filter(offer=>offer.discount_type!=="none").map(offer=>{
    const eligible=cart.filter(item=>campaignApplies(offer,item.product));
    const eligibleSubtotal=eligible.reduce((sum,item)=>sum+Number(item.product.price)*item.quantity,0);
    const savings=eligibleSubtotal>=Number(offer.minimum_subtotal)?eligible.reduce((sum,item)=>sum+Math.round(campaignUnitDiscount(offer,Number(item.product.price))*100)/100*item.quantity,0):0;
    return {offer,savings};
  }).filter(row=>row.savings>0).sort((a,b)=>b.savings-a.savings||b.offer.priority-a.offer.priority||b.offer.id-a.offer.id);
  const chosen=available[0];return {subtotal,discount:chosen?.savings??0,total:subtotal-(chosen?.savings??0),offer:chosen?.offer??null};
}

const defaultSettings: StoreSettings = {
  store_name: "RZ Custom Tailor & Alteration", tagline: "Style · Fit · Confidence", hero_title: "RZ Custom Tailor & Alteration",
  hero_description: "Premium tailoring for modern you. Custom suits, shirts and more—designed to fit your style, body and personality.",
  phone: "+1 (437) 484-8836", secondary_phone: "+1 (437) 484-0482", email: "info@rzcustomtailor.com",
  address: "Unit # 211 B, 3028 Danforth Ave., Toronto, ON M4C 1N2", logo_url: "/images/rz-logo.png", hero_image_url: "/images/atelier-fitting.svg",
  map_url: "https://maps.google.com/?q=3028+Danforth+Ave+Toronto+ON+M4C+1N2", business_hours: {}, social_links: {}, seasonal_offers: {
    black_friday: {title:"Black Friday Offer",message:"",discount_text:"",cta_label:"Shop offers",cta_url:"/shop",active:false,starts_on:null,ends_on:null},
    christmas: {title:"Christmas Offer",message:"",discount_text:"",cta_label:"Shop offers",cta_url:"/shop",active:false,starts_on:null,ends_on:null},
  }, currency: "CAD",
};

function Shell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="brand">
          <img className="admin-brand-logo" src="/images/rz-logo.png" alt="RZ Custom Tailor" />
          <div>
            <b>RZ CUSTOM</b>
            <span>TAILOR & ALTERATION</span>
          </div>
          <button
            className="icon-button close-menu"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav">
          {nav.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/admin"}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
            >
              <Icon size={17} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <div className="note-gem">✦</div>
            <b>
              Made for the moments
              <br />
              that matter.
            </b>
            <span>Exceptional fit. Timeless style.</span>
            <Link to="/">
              View storefront <span>↗</span>
            </Link>
          </div>
          <NavLink
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            to="/admin/settings"
          >
            <Settings size={17} />
            <span>Store settings</span>
          </NavLink>
          <button
            className="profile logout-button"
            onClick={() => {
              localStorage.removeItem("rz_admin_token");
              window.location.href = "/admin/login";
            }}
          >
            <div className="avatar">RZ</div>
            <div className="profile-copy">
              <b>Store administrator</b>
              <span>Sign out</span>
            </div>
            <ChevronDown size={15} />
          </button>
        </div>
      </aside>
      {open && (
        <button
          aria-label="Close menu overlay"
          className="scrim"
          onClick={() => setOpen(false)}
        />
      )}
      <main className="main-area">
        <header className="topbar">
          <button
            className="icon-button menu-toggle"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
          <div className="breadcrumbs">
            RZ Custom <span>/</span> <b>Dashboard</b>
          </div>
          <div className="top-actions">
            <button className="search-box">
              <Search size={16} />
              <span>Search anything...</span>
              <kbd>⌘ K</kbd>
            </button>
            <button className="icon-button notify" aria-label="Notifications">
              <Bell size={18} />
              <i />
            </button>
            <div className="top-avatar">RZ</div>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  return localStorage.getItem("rz_admin_token") ? (
    children
  ) : (
    <Navigate to="/admin/login" replace />
  );
}

function Dashboard() {
  const [data, setData] = useState<Awaited<
    ReturnType<typeof api.dashboard>
  > | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api
      .dashboard()
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);
  const cards = [
    {
      label: "Total revenue",
      value: `$${Number(data?.revenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      icon: Coins,
    },
    {
      label: "Total orders",
      value: data?.total_orders ?? "—",
      icon: ShoppingBag,
    },
    {
      label: "Total products",
      value: data?.total_products ?? "—",
      icon: Shirt,
    },
    {
      label: "Total customers",
      value: data?.total_customers ?? "—",
      icon: Users,
    },
  ];
  const chartData =
    data?.monthly_revenue.map((x) => ({
      month: monthLabels[x.month - 1],
      sales: x.sales,
    })) ?? [];
  const statusColors: Record<string, string> = {
    completed: "#142640",
    processing: "#b99357",
    pending: "#d9c8a7",
    cancelled: "#e8e5de",
  };
  const statusData = Object.entries(data?.status_counts ?? {}).map(
    ([name, value]) => ({
      name: name.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase()),
      value,
      color: statusColors[name] ?? "#8d9cab",
    }),
  );
  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <div className="eyebrow">STORE OVERVIEW</div>
          <h1>
            Good morning <span>✦</span>
          </h1>
          <p>Here’s what’s happening at your store.</p>
        </div>
        <button className="button button-primary">
          <Plus size={16} /> Quick action <ChevronDown size={14} />
        </button>
      </div>
      {error && (
        <div className="inline-error" role="status">
          {error}. Dashboard figures are hidden until admin login is connected.
        </div>
      )}
      <section className="stat-grid">
        {cards.map(({ label, value, icon: Icon }) => (
          <article className="stat-card" key={label}>
            <div className="stat-top">
              <span>{label}</span>
              <div className="stat-icon">
                <Icon size={17} />
              </div>
            </div>
            <div className="stat-value">{value}</div>
            <div className="stat-foot">
              <span>From saved store records</span>
            </div>
          </article>
        ))}
      </section>
      <section className="analytics-grid">
        <article className="panel sales-panel">
          <div className="panel-head">
            <div>
              <h2>Sales overview</h2>
              <p>Paid order revenue by month</p>
            </div>
            <select aria-label="Sales date range">
              <option>Current year</option>
            </select>
          </div>
          <div className="chart-key">
            <i /> Revenue{" "}
            <strong>
              $
              {Number(data?.revenue ?? 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </strong>
          </div>
          <div className="sales-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 12, right: 8, left: -18, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c5a56b" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#c5a56b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#edeae4" vertical={false} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#92949a", fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#92949a", fontSize: 11 }}
                  tickFormatter={(v) => `$${v / 1000}k`}
                />
                <Tooltip
                  formatter={(v) => [
                    `$${Number(v).toLocaleString()}`,
                    "Revenue",
                  ]}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #e9e5dc",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#b38c4d"
                  strokeWidth={2.5}
                  fill="url(#fill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className="panel status-panel">
          <div className="panel-head">
            <div>
              <h2>Order status</h2>
              <p>Order fulfillment summary</p>
            </div>
            <button className="dots">···</button>
          </div>
          <div className="donut-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={62}
                  outerRadius={82}
                  paddingAngle={3}
                  stroke="none"
                >
                  {statusData.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center">
              <b>{data?.total_orders ?? "—"}</b>
              <span>Total orders</span>
            </div>
          </div>
          <div className="legend">
            {statusData.map((item) => (
              <div key={item.name}>
                <span>
                  <i style={{ background: item.color }} />
                  {item.name}
                </span>
                <b>{item.value}</b>
              </div>
            ))}
          </div>
        </article>
      </section>
      <section className="panel orders-panel">
        <div className="panel-head">
          <div>
            <h2>Recent orders</h2>
            <p>Latest saved orders</p>
          </div>
          <Link className="text-link" to="/admin/orders">
            View all orders <span>→</span>
          </Link>
        </div>
        <div className="table-wrap">
          {data?.recent_orders.length ? (
            <table>
              <thead>
                <tr>
                  <th>ORDER</th>
                  <th>CUSTOMER</th>
                  <th>ITEM</th>
                  <th>DATE</th>
                  <th>TOTAL</th>
                  <th>STATUS</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.recent_orders.map((order) => (
                  <tr key={order.id}>
                    <td className="order-id">{order.id}</td>
                    <td>
                      <div className="customer-cell">
                        <div className="tiny-avatar">
                          {order.customer.slice(0, 2).toUpperCase()}
                        </div>
                        {order.customer}
                      </div>
                    </td>
                    <td>{order.item}</td>
                    <td>{new Date(order.date).toLocaleDateString()}</td>
                    <td className="money">${order.total.toFixed(2)}</td>
                    <td>
                      <span
                        className={`status-pill ${order.status.toLowerCase().replaceAll(" ", "-")}`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="row-menu"
                        aria-label={`Actions for ${order.id}`}
                      >
                        ···
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-state">
              {error
                ? "Sign in as an administrator to view store records."
                : "No orders recorded yet."}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function Products() {
  const [items, setItems] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [term, setTerm] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    category: "Suits",
    price: "",
    sale_price: "",
    sku: "",
    stock: 0,
    status: "draft" as Product["status"],
    image_url: "",
    description: "",
    kind: "ready_made" as Product["kind"], sizes: [] as string[], colors: [] as string[], fabrics: [] as string[], featured: false,
  });
  const refresh = () =>
    api
      .adminProducts()
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  useEffect(() => {
    refresh();
  }, []);
  const visible = useMemo(
    () =>
      items.filter((p) =>
        `${p.title} ${p.category} ${p.slug}`
          .toLowerCase()
          .includes(term.toLowerCase()),
      ),
    [items, term],
  );
  const openNew = () => {
    setEditing(null);
    setImage(null);
    setForm({
      title: "",
      slug: "",
      category: "Suits",
      price: "",
      sale_price: "",
      sku: "",
      stock: 0,
      status: "draft",
      image_url: "",
      description: "",
      kind: "ready_made", sizes: [], colors: [], fabrics: [], featured: false,
    });
    setShowForm(true);
    setError("");
  };
  const openEdit = (p: Product) => {
    setEditing(p);
    setImage(null);
    setForm({
      title: p.title,
      slug: p.slug,
      category: p.category,
      price: p.price,
      sale_price: p.sale_price ?? "",
      sku: p.sku ?? "",
      stock: p.stock,
      status: p.status,
      image_url: p.image_url ?? "",
      description: p.description,
      kind: p.kind, sizes: p.sizes, colors: p.colors, fabrics: p.fabrics, featured: p.featured,
    });
    setShowForm(true);
    setError("");
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      let imageUrl = form.image_url;
      if (image) {
        const uploaded = await api.uploadMedia(image);
        imageUrl = uploaded.url;
      }
      const payload = { ...form, sale_price: form.sale_price || null, sku: form.sku || null, image_url: imageUrl || null };
      const saved = editing
        ? await api.updateProduct(editing.id, payload)
        : await api.createProduct(payload);
      setItems((current) =>
        editing
          ? current.map((p) => (p.id === saved.id ? saved : p))
          : [saved, ...current],
      );
      setShowForm(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Product could not be saved",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <div className="eyebrow">CATALOGUE</div>
          <h1>Products</h1>
          <p>Manage your collection and inventory.</p>
        </div>
        <button className="button button-primary" onClick={openNew}>
          <Plus size={16} /> Add product
        </button>
      </div>
      {error && !showForm && (
        <div className="inline-error" role="status">
          {error}
        </div>
      )}
      <section className="panel orders-panel">
        <div className="product-toolbar">
          <div className="search-field">
            <Search size={16} />
            <input
              placeholder="Search products..."
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
          </div>
          <span className="products-total">{items.length} products</span>
        </div>
        {loading ? (
          <p className="empty-state">Loading catalogue…</p>
        ) : visible.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>PRODUCT</th>
                  <th>CATEGORY</th>
                  <th>PRICE</th>
                  <th>STOCK</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="product-cell">
                        {p.image_url ? (
                          <img src={p.image_url} alt="" />
                        ) : (
                          <div className="product-thumb">
                            <Shirt size={17} />
                          </div>
                        )}
                        <b>{p.title}</b>
                      </div>
                    </td>
                    <td>{p.category}</td>
                    <td className="money">${Number(p.price).toFixed(2)}</td>
                    <td>{p.stock}</td>
                    <td>
                      <span className={`status-pill ${p.status}`}>
                        {p.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="icon-button"
                        aria-label={`Edit ${p.title}`}
                        onClick={() => openEdit(p)}
                      >
                        <Pencil size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-state">
            No products found. Add your first product.
          </p>
        )}
      </section>
      {showForm && (
        <div className="modal-backdrop" role="presentation">
          <section
            className="panel product-editor"
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-editor-title"
          >
            <div className="panel-head">
              <div>
                <div className="eyebrow">PRODUCT CATALOGUE</div>
                <h2 id="product-editor-title">
                  {editing ? "Edit product" : "Add product"}
                </h2>
              </div>
              <button
                className="icon-button"
                aria-label="Close editor"
                onClick={() => setShowForm(false)}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={submit}>
              <div className="editor-grid">
                <label>
                  Product name
                  <input
                    required
                    minLength={2}
                    maxLength={180}
                    value={form.title}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        title: e.target.value,
                        slug: editing
                          ? form.slug
                          : toProductSlug(e.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  Slug
                  <input
                    required
                    pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  />
                </label>
                <label>
                  Category
                  <input
                    required
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                  />
                </label>
                <label className="editor-full">Description<textarea rows={4} required value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
                <label>
                  Price
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.price}
                    onChange={(e) =>
                      setForm({ ...form, price: e.target.value })
                    }
                  />
                </label>
                <label>Sale price (optional)<input type="number" min="0.01" step="0.01" value={form.sale_price} onChange={e=>setForm({...form,sale_price:e.target.value})}/></label>
                <label>SKU (optional)<input maxLength={80} value={form.sku} onChange={e=>setForm({...form,sku:e.target.value})}/></label>
                <label>
                  Stock quantity
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    value={form.stock}
                    onChange={(e) =>
                      setForm({ ...form, stock: Number(e.target.value) })
                    }
                  />
                </label>
                <label>Product type<select value={form.kind} onChange={e=>setForm({...form,kind:e.target.value as Product["kind"]})}><option value="ready_made">Ready to wear</option><option value="custom">Custom tailoring</option></select></label>
                <label>Sizes (comma separated)<input value={form.sizes.join(", ")} onChange={e=>setForm({...form,sizes:e.target.value.split(",").map(x=>x.trim()).filter(Boolean)})}/></label>
                <label>Colors (comma separated)<input value={form.colors.join(", ")} onChange={e=>setForm({...form,colors:e.target.value.split(",").map(x=>x.trim()).filter(Boolean)})}/></label>
                <label>Fabrics (comma separated)<input value={form.fabrics.join(", ")} onChange={e=>setForm({...form,fabrics:e.target.value.split(",").map(x=>x.trim()).filter(Boolean)})}/></label>
                <label className="check-setting"><input type="checkbox" checked={form.featured} onChange={e=>setForm({...form,featured:e.target.checked})}/> Featured on homepage</label>
                <label>
                  Status
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        status: e.target.value as Product["status"],
                      })
                    }
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </label>
                <label className="upload-field">
                  Product image (JPEG, PNG or WebP, up to 5 MB)
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setImage(e.target.files?.[0] ?? null)}
                  />
                  {image && <span>{image.name} ready to upload</span>}
                  {form.image_url && !image && (
                    <img src={form.image_url} alt="Current product" />
                  )}
                </label>
              </div>
              {error && <p className="inline-error">{error}</p>}
              <div className="editor-actions">
                <button
                  type="button"
                  className="button button-outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
                <button className="button button-primary" disabled={busy}>
                  {busy ? "Saving…" : editing ? "Save changes" : "Save product"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function Placeholder({ title }: { title: string }) {
  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <div className="eyebrow">RZ CUSTOM</div>
          <h1>{title}</h1>
          <p>This workspace is ready for the {title.toLowerCase()} module.</p>
        </div>
      </div>
      <section className="panel module-placeholder">
        <div className="placeholder-icon">
          <CircleHelp size={22} />
        </div>
        <h2>{title} management</h2>
        <p>
          The screen shell is in place. Connect this module to its backend
          workflow to manage live {title.toLowerCase()} records.
        </p>
      </section>
    </div>
  );
}

const blankCampaign = (): Omit<Campaign,"id"> => ({slug:"",name:"",title:"",message:"",discount_type:"percent",discount_value:"0",discount_label:"",maximum_discount:null,minimum_subtotal:"0",categories:[],product_ids:[],banner_url:"",mobile_banner_url:"",cta_label:"Shop offer",cta_url:"/shop",starts_on:null,ends_on:null,status:"draft",priority:0});

function CampaignsPage(){
  const [rows,setRows]=useState<Campaign[]>([]);const [products,setProducts]=useState<Product[]>([]);const [form,setForm]=useState<Omit<Campaign,"id">>(blankCampaign());const [editing,setEditing]=useState<number|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [message,setMessage]=useState("");
  const refresh=()=>api.adminCampaigns().then(setRows).catch(e=>setError(e.message));
  useEffect(()=>{refresh();api.products().then(setProducts).catch(()=>undefined)},[]);
  const startNew=()=>{setEditing(null);setForm(blankCampaign());setError("");setMessage("")};
  const update=(key:keyof typeof form,value:unknown)=>setForm(current=>({...current,[key]:value}));
  const setName=(value:string)=>{setForm(current=>({...current,name:value,slug:editing===null?value.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""):current.slug,title:current.title||value}))};
  const upload=async(file:File,field:"banner_url"|"mobile_banner_url")=>{try{setError("");const image=await api.uploadMedia(file);update(field,image.url)}catch(e){setError(e instanceof Error?e.message:"Banner upload failed")}};
  const save=async(event:React.FormEvent)=>{event.preventDefault();setBusy(true);setError("");setMessage("");try{const payload={...form,discount_value:form.discount_type==="none"?"0":form.discount_value,maximum_discount:form.maximum_discount||null,minimum_subtotal:form.minimum_subtotal||"0"};if(editing===null)await api.createCampaign(payload);else await api.updateCampaign(editing,payload);setMessage("Campaign saved.");startNew();await refresh()}catch(e){setError(e instanceof Error?e.message:"Campaign could not be saved")}finally{setBusy(false)}};
  const edit=(row:Campaign)=>{setEditing(row.id);setForm({...row});setError("");setMessage("");window.scrollTo({top:0,behavior:"smooth"})};
  return <div className="page-content"><div className="page-heading"><div><div className="eyebrow">SEASONAL MARKETING</div><h1>Offers & campaigns</h1><p>Create Black Friday, Christmas, Eid or any custom offer. Published dates use Toronto local dates.</p></div><button className="button button-outline" onClick={startNew}>New campaign</button></div>
    <section className="campaign-layout"><form className="panel campaign-form" onSubmit={save}><div className="panel-head"><div><h2>{editing===null?"Create campaign":"Edit campaign"}</h2><p>Set public content, offer rules, dates and artwork.</p></div>{editing!==null&&<button type="button" className="text-link" onClick={startNew}>Cancel edit</button>}</div>
      <div className="editor-grid campaign-fields">
        <label>Campaign name<input required minLength={2} maxLength={140} value={form.name} onChange={e=>setName(e.target.value)}/></label>
        <label>URL slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={form.slug} onChange={e=>update("slug",e.target.value)}/></label>
        <label className="editor-full">Customer-facing headline<input required value={form.title} onChange={e=>update("title",e.target.value)}/></label>
        <label className="editor-full">Message<textarea rows={3} maxLength={2000} value={form.message} onChange={e=>update("message",e.target.value)}/></label>
        <label>Discount<select value={form.discount_type} onChange={e=>update("discount_type",e.target.value)}><option value="percent">Percentage</option><option value="fixed">Fixed amount per item</option><option value="none">Display only</option></select></label>
        {form.discount_type!=="none"&&<label>{form.discount_type==="percent"?"Percent off":"Amount off (CAD)"}<input required type="number" min="0.01" max={form.discount_type==="percent"?100:undefined} step="0.01" value={form.discount_value} onChange={e=>update("discount_value",e.target.value)}/></label>}
        {form.discount_type!=="none"&&<><label>Discount label<input placeholder="Up to 50% off" maxLength={80} value={form.discount_label} onChange={e=>update("discount_label",e.target.value)}/></label><label>Maximum discount per item (optional)<input type="number" min="0.01" step="0.01" value={form.maximum_discount??""} onChange={e=>update("maximum_discount",e.target.value||null)}/></label><label>Minimum eligible subtotal (CAD)<input type="number" min="0" step="0.01" value={form.minimum_subtotal} onChange={e=>update("minimum_subtotal",e.target.value)}/></label>
          <label>Eligible categories (Ctrl/⌘ for multiple)<select multiple value={form.categories} onChange={e=>update("categories",Array.from(e.target.selectedOptions).map(o=>o.value))}>{[...new Set(products.map(p=>p.category))].map(c=><option key={c}>{c}</option>)}</select></label>
          <label>Specific products (Ctrl/⌘ for multiple)<select multiple value={form.product_ids.map(String)} onChange={e=>update("product_ids",Array.from(e.target.selectedOptions).map(o=>Number(o.value)))}>{products.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
        </>}
        <label>Starts on (Toronto date)<input type="date" value={form.starts_on??""} onChange={e=>update("starts_on",e.target.value||null)}/></label>
        <label>Ends on (Toronto date)<input type="date" value={form.ends_on??""} onChange={e=>update("ends_on",e.target.value||null)}/></label>
        <label>Status<select value={form.status} onChange={e=>update("status",e.target.value)}><option value="draft">Draft</option><option value="published">Publish / schedule</option><option value="archived">Archived</option></select></label>
        <label>Priority (higher appears first)<input type="number" min="0" max="1000" value={form.priority} onChange={e=>update("priority",Number(e.target.value))}/></label>
        <label>CTA button label<input maxLength={40} value={form.cta_label} onChange={e=>update("cta_label",e.target.value)}/></label>
        <label>CTA destination<input placeholder="/shop" value={form.cta_url} onChange={e=>update("cta_url",e.target.value)}/></label>
        {(["banner_url","mobile_banner_url"] as const).map(field=><label className="upload-field" key={field}>{field==="banner_url"?"Desktop campaign banner":"Mobile campaign banner (optional)"}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const file=e.target.files?.[0];if(file)void upload(file,field)}}/>{form[field]&&<img src={form[field]} alt="Campaign preview"/>}</label>)}
      </div>
      {error&&<p className="inline-error">{error}</p>}{message&&<p className="positive">{message}</p>}
      <p className="form-note">Discount campaigns require at least one eligible category or product. The backend calculates the saving and only one campaign applies per order. Product sale prices are not stacked with campaign discounts.</p>
      <div className="editor-actions"><button type="button" className="button button-outline" onClick={startNew}>Clear</button><button className="button button-primary" disabled={busy}>{busy?"Saving…":form.status==="published"?"Save & publish":"Save campaign"}</button></div>
    </form>
    <section className="panel campaign-list"><div className="panel-head"><div><h2>Saved campaigns</h2><p>Drafts stay private. Scheduled campaigns appear on their dates.</p></div></div>{error&&<p className="inline-error">{error}</p>}<div className="campaign-cards">{rows.map(row=><article className="campaign-row" key={row.id}>{row.banner_url?<img src={row.banner_url} alt=""/>:<div className="campaign-art-placeholder"><Tag size={24}/></div>}<div className="campaign-row-copy"><b>{row.title}</b><small>{row.name} · {row.status}</small><small>{row.starts_on||"Any start"} → {row.ends_on||"No end date"}</small><small>{row.discount_type==="none"?"Display only":row.discount_type==="percent"?`${row.discount_value}% off`:`${formatMoney(row.discount_value)} off per item`} · {row.categories.join(", ")||"Selected products"}</small></div><button className="button button-outline" onClick={()=>edit(row)}>Edit</button></article>)}{!rows.length&&<p className="empty-state">No campaigns yet. Start with a draft and add owner-approved offer terms.</p>}</div></section></section>
  </div>;
}

function OrdersPage(){const [rows,setRows]=useState<AdminOrder[]>([]);const [error,setError]=useState('');const load=()=>api.orders().then(setRows).catch(e=>setError(e.message));useEffect(()=>{load()},[]);return <div className="page-content"><div className="page-heading"><div><div className="eyebrow">FULFILLMENT</div><h1>Orders</h1><p>Cash on delivery orders remain unpaid until collected.</p></div></div>{error&&<p className="inline-error">{error}</p>}<section className="panel table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead><tbody>{rows.map(o=><tr key={o.id}><td>{o.order_number}<small>{new Date(o.created_at).toLocaleDateString()}</small></td><td>{o.customer_name}<small>{o.customer_email} · {o.customer_phone}</small><small>{o.shipping_address}, {o.shipping_city} {o.shipping_postal_code}</small></td><td>{o.items.map(i=><div key={i.title}>{i.quantity} × {i.title}</div>)}</td><td>{formatMoney(o.total)}{Number(o.discount_amount)>0&&<small>{o.campaign_title}: −{formatMoney(o.discount_amount)} from {formatMoney(o.subtotal)}</small>}</td><td>{o.payment_status} · {o.payment_method}</td><td><select value={o.status} onChange={async e=>{try{await api.setOrderStatus(o.id,e.target.value);load()}catch(err){setError(err instanceof Error?err.message:'Could not update')}}}>{['pending','confirmed','processing','shipped','delivered','cancelled'].map(s=><option key={s}>{s}</option>)}</select></td></tr>)}</tbody></table>{!rows.length&&!error&&<p className="empty-state">No orders yet.</p>}</section></div>}

function AppointmentsPage(){const [rows,setRows]=useState<AdminAppointment[]>([]);const [error,setError]=useState('');const load=()=>api.appointments().then(setRows).catch(e=>setError(e.message));useEffect(()=>{load()},[]);return <div className="page-content"><div className="page-heading"><div><div className="eyebrow">ATELIER CALENDAR</div><h1>Appointments</h1></div></div>{error&&<p className="inline-error">{error}</p>}<section className="panel table-wrap"><table><thead><tr><th>Customer</th><th>Service</th><th>Date & time</th><th>Notes</th><th>Status</th></tr></thead><tbody>{rows.map(a=><tr key={a.id}><td>{a.customer_name}<small>{a.customer_email} · {a.customer_phone}</small></td><td>{a.service}</td><td>{new Date(a.starts_at).toLocaleString()}</td><td>{a.notes}</td><td><select value={a.status} onChange={async e=>{try{await api.updateAppointment(a.id,{status:e.target.value});load()}catch(err){setError(err instanceof Error?err.message:'Could not update')}}}>{['requested','confirmed','rescheduled','cancelled','completed'].map(s=><option key={s}>{s}</option>)}</select></td></tr>)}</tbody></table>{!rows.length&&!error&&<p className="empty-state">No appointments requested.</p>}</section></div>}

function CategoriesPage(){const [rows,setRows]=useState<{id:number;name:string;slug:string}[]>([]);const [name,setName]=useState('');const [error,setError]=useState('');const load=()=>api.categories().then(setRows).catch(e=>setError(e.message));useEffect(()=>{load()},[]);return <div className="page-content"><div className="page-heading"><div><div className="eyebrow">SHOP STRUCTURE</div><h1>Categories</h1><p>Use the same category name on products to group them in the shop.</p></div></div><form className="panel category-form" onSubmit={async e=>{e.preventDefault();try{await api.createCategory(name,name.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''));setName('');setError('');load()}catch(err){setError(err instanceof Error?err.message:'Could not create category')}}}><label>New category<input required value={name} onChange={e=>setName(e.target.value)}/></label><button className="button button-primary">Add category</button>{error&&<p className="inline-error">{error}</p>}</form><section className="panel category-list">{rows.map(c=><div key={c.id}><b>{c.name}</b><span>{c.slug}</span></div>)}</section></div>}

function MediaPage(){const [rows,setRows]=useState<{id:number;filename:string;url:string;content_type:string;size_bytes:number}[]>([]);const [error,setError]=useState('');const [busy,setBusy]=useState(false);const load=()=>api.media().then(setRows).catch(e=>setError(e.message));useEffect(()=>{load()},[]);return <div className="page-content"><div className="page-heading"><div><div className="eyebrow">ASSET STORAGE</div><h1>Media library</h1><p>Uploaded assets persist in configured local storage or Cloudinary.</p></div><label className="button button-primary upload-button">{busy?'Uploading…':'Upload image'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={async e=>{const f=e.target.files?.[0];if(!f)return;setBusy(true);setError('');try{await api.uploadMedia(f);await load()}catch(err){setError(err instanceof Error?err.message:'Upload failed')}finally{setBusy(false);e.target.value=''}}}/></label></div>{error&&<p className="inline-error">{error}</p>}<section className="media-grid">{rows.map(a=><article className="panel media-card" key={a.id}><img src={a.url} alt={a.filename}/><div><b>{a.filename}</b><small>{(a.size_bytes/1024).toFixed(0)} KB</small><button className="text-link" onClick={async()=>{if(confirm('Delete this image from storage?'))try{await api.deleteMedia(a.id);load()}catch(err){setError(err instanceof Error?err.message:'Delete failed')}}}>Delete image</button></div></article>)}</section>{!rows.length&&!error&&<p className="empty-state">No images uploaded yet.</p>}</div>}
function OfferBanner({offer}:{offer:Campaign}) {
  const badge=offer.discount_label||(offer.discount_type==="percent"?`${Number(offer.discount_value)}% OFF`:offer.discount_type==="fixed"?`${formatMoney(offer.discount_value)} OFF`:"SPECIAL OFFER");
  return <aside className="offer-banner"><span className="offer-badge">{badge}</span><div><b>{offer.title}</b>{offer.message&&<p>{offer.message}</p>}</div>{offer.cta_url.startsWith('https://')?<a className="offer-cta" href={offer.cta_url} target="_blank" rel="noreferrer">{offer.cta_label} ↗</a>:<Link className="offer-cta" to={offer.cta_url}>{offer.cta_label} →</Link>}</aside>;
}

function CampaignShowcase(){
  const [campaigns,setCampaigns]=useState<Campaign[]>([]);
  useEffect(()=>{api.campaigns().then(setCampaigns).catch(()=>undefined)},[]);
  if(!campaigns.length)return null;
  return <section className="campaign-showcase"><div className="campaign-showcase-heading"><div><div className="eyebrow">LIMITED TIME AT THE ATELIER</div><h2>Current offers</h2></div><Link className="text-link" to="/shop">Explore the collection →</Link></div><div className="campaign-showcase-grid">{campaigns.map(c=><article className="campaign-feature" key={c.id} style={{"--campaign-desktop":c.banner_url?`url("${c.banner_url}")`:"none","--campaign-mobile":c.mobile_banner_url?`url("${c.mobile_banner_url}")`:undefined} as React.CSSProperties}><div className="campaign-feature-copy"><span>{c.discount_label||(c.discount_type==="percent"?`${Number(c.discount_value)}% OFF`:c.discount_type==="fixed"?`${formatMoney(c.discount_value)} OFF`:"SEASONAL OFFER")}</span><h3>{c.title}</h3><p>{c.message}</p>{c.cta_url.startsWith("https://")?<a className="button button-primary" href={c.cta_url} target="_blank" rel="noreferrer">{c.cta_label} ↗</a>:<Link className="button button-primary" to={c.cta_url}>{c.cta_label} →</Link>}</div></article>)}</div></section>;
}

function SiteHeader({ settings, cartCount, onBag, onBook }: { settings: StoreSettings; cartCount: number; onBag: () => void; onBook: () => void }) {
  const [campaigns,setCampaigns]=useState<Campaign[]>([]);
  const [menuOpen,setMenuOpen]=useState(false);
  useEffect(()=>{api.campaigns().then(setCampaigns).catch(()=>undefined)},[]);
  return <><header className="site-header">
    <Link className="store-brand" to="/"><img src={settings.logo_url || "/images/rz-logo.png"} alt={settings.store_name} /><span>{settings.store_name}<small>Custom Tailor & Alteration</small></span></Link>
    <nav className={menuOpen?"store-nav is-open":"store-nav"} aria-label="Main navigation"><Link onClick={()=>setMenuOpen(false)} to="/">Home</Link><Link onClick={()=>setMenuOpen(false)} to="/shop">Shop</Link><a onClick={()=>setMenuOpen(false)} href="/#services">Tailoring</a><a onClick={()=>setMenuOpen(false)} href="/#story">About</a><a onClick={()=>setMenuOpen(false)} href="/#contact">Contact</a></nav>
    <div className="site-actions"><button className="button button-outline" onClick={onBook}>Book appointment</button><button className="bag-button" onClick={onBag} aria-label={`Open bag, ${cartCount} items`}><ShoppingBag size={19}/><span>Bag</span><b>{cartCount}</b></button><button className="mobile-nav-toggle" aria-label={menuOpen?"Close menu":"Open menu"} aria-expanded={menuOpen} onClick={()=>setMenuOpen(open=>!open)}>{menuOpen?<X size={20}/>:<Menu size={20}/>}</button></div>
  </header>{campaigns[0]&&<OfferBanner offer={campaigns[0]}/>}</>;
}

function AppointmentDialog({ settings, onClose }: { settings: StoreSettings; onClose: () => void }) {
  const [form, setForm] = useState({ customer_name:"", customer_email:"", customer_phone:"", service:"custom_tailoring", date:"", time:"10:00", notes:"" });
  const [busy,setBusy]=useState(false); const [message,setMessage]=useState(""); const [error,setError]=useState("");
  const submit=async(event:React.FormEvent)=>{event.preventDefault();setBusy(true);setError("");try{const startsAt=new Date(`${form.date}T${form.time}:00`).toISOString();const result=await api.bookAppointment({customer_name:form.customer_name,customer_email:form.customer_email,customer_phone:form.customer_phone,service:form.service,starts_at:startsAt,notes:form.notes});setMessage(`Your request is received (#${result.id}). Our team will contact you to confirm the fitting.`);}catch(err){setError(err instanceof Error?err.message:"Could not request this appointment.");}finally{setBusy(false);}};
  return <div className="modal-backdrop" role="presentation"><section className="panel product-editor appointment-dialog" role="dialog" aria-modal="true" aria-labelledby="appointment-title"><div className="panel-head"><div><div className="eyebrow">A PERSONAL FITTING</div><h2 id="appointment-title">Book an appointment</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={18}/></button></div>{message?<div className="success-panel"><p>{message}</p><button className="button button-primary" onClick={onClose}>Done</button></div>:<form onSubmit={submit}><div className="editor-grid"><label>Full name<input required minLength={2} value={form.customer_name} onChange={e=>setForm({...form,customer_name:e.target.value})}/></label><label>Email<input required type="email" value={form.customer_email} onChange={e=>setForm({...form,customer_email:e.target.value})}/></label><label>Phone<input required type="tel" value={form.customer_phone} onChange={e=>setForm({...form,customer_phone:e.target.value})}/></label><label>Service<select value={form.service} onChange={e=>setForm({...form,service:e.target.value})}><option value="custom_tailoring">Custom tailoring</option><option value="alteration">Alterations</option><option value="consultation">Fabric consultation</option></select></label><label>Date<input required type="date" min={new Date().toISOString().slice(0,10)} value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label><label>Time<select value={form.time} onChange={e=>setForm({...form,time:e.target.value})}>{["10:00","11:00","14:00","16:00"].map(t=><option key={t} value={t}>{t}</option>)}</select><small>Time uses your device's local timezone.</small></label><label className="editor-full">Notes<textarea rows={3} maxLength={2000} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label></div>{error&&<p className="inline-error">{error}</p>}<div className="editor-actions"><button type="button" className="button button-outline" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={busy}>{busy?"Sending…":"Request appointment"}</button></div><p className="form-note">Requests are not confirmed until the atelier contacts you. {settings.address} · {settings.phone}</p></form>}</section></div>;
}

function ContactSection({ settings }: { settings: StoreSettings }) {
  const [form,setForm]=useState({name:"",email:"",message:""});const [status,setStatus]=useState("");const [error,setError]=useState("");const [busy,setBusy]=useState(false);
  const send=async(event:React.FormEvent)=>{event.preventDefault();setBusy(true);setError("");try{await api.sendContact(form);setStatus("Thank you. Your message has been received by the atelier.");setForm({name:"",email:"",message:""});}catch(err){setError(err instanceof Error?err.message:"Message could not be sent.");}finally{setBusy(false);}};
  return <section className="contact-section" id="contact"><div><div className="eyebrow">VISIT THE ATELIER</div><h2>Let's get the fit right.</h2><p>{settings.address}</p><a href={`tel:${settings.phone}`}>{settings.phone}</a><br/><a href={`tel:${settings.secondary_phone}`}>{settings.secondary_phone}</a><br/><a href={`mailto:${settings.email}`}>{settings.email}</a><div className="business-hours">{Object.entries(settings.business_hours).map(([day,hours])=><p key={day}><b>{day}</b><span>{hours||"Hours not set"}</span></p>)}</div><div className="social-links">{Object.entries(settings.social_links).filter(([,url])=>url).map(([name,url])=><a href={url} target="_blank" rel="noreferrer" key={name}>{name}</a>)}</div></div><form className="contact-form" onSubmit={send}><h3>Send us a message</h3><label>Your name<input required minLength={2} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Email<input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label>Message<textarea required minLength={10} rows={4} value={form.message} onChange={e=>setForm({...form,message:e.target.value})}/></label>{status&&<p className="positive">{status}</p>}{error&&<p className="inline-error">{error}</p>}<button className="button button-primary" disabled={busy}>{busy?"Sending…":"Send message"}</button></form><a className="map-card" href={settings.map_url} target="_blank" rel="noreferrer"><iframe title="Map to RZ Custom Tailor" src={`https://maps.google.com/maps?q=${encodeURIComponent(settings.address)}&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade"/><span>Open directions ↗</span></a></section>;
}

function Storefront() {
  const { cart } = useCart();
  const [settings, setSettings] = useState<
    import("./services/api").StoreSettings | null
  >(null);
  useEffect(() => {
    api
      .storeSettings()
      .then(setSettings)
      .catch(() => undefined);
  }, []);
  const config = settings ?? {
    store_name: "RZ Custom Tailor & Alteration",
    tagline: "Made for the moments that matter.",
    hero_title: "Made for the moments that matter.",
    hero_description:
      "Thoughtful tailoring, exceptional fabrics, and a fit that feels entirely your own.",
    phone: "",
    email: "",
    address: "",
    business_hours: {},
    social_links: {},
    currency: "USD",
  };
  const [bookOpen, setBookOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<{id:number;customer_name:string;rating:number;body:string;title:string}[]>([]);
  useEffect(() => { api.products().then(setProducts).catch(() => undefined); api.reviews().then(setReviews).catch(() => undefined); }, []);
  const merged = { ...defaultSettings, ...(settings ?? {}) };
  return (
    <div className="storefront">
      <SiteHeader settings={merged} cartCount={cart.reduce((n,x)=>n+x.quantity,0)} onBag={()=>window.location.assign('/cart')} onBook={()=>setBookOpen(true)} />
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">THE ART OF PERSONAL STYLE</div>
          <h1>{config.hero_title}</h1>
          <p>{config.hero_description}</p>
          <div className="hero-buttons"><Link className="button button-primary" to="/shop">Shop collection <span>→</span></Link><button className="button button-outline" onClick={()=>setBookOpen(true)}>Book appointment</button></div>
          <div className="hero-meta">
            <span>MADE TO MEASURE</span>
            <i />
            {config.address || "VISIT OUR ATELIER"}
          </div>
        </div>
        <div className="hero-image" role="img" aria-label="A tailor measures a customer's suit in the RZ atelier" style={merged.hero_image_url ? {backgroundImage:`linear-gradient(90deg,rgba(5,20,31,.1),rgba(5,20,31,.02)),url("${merged.hero_image_url}")`} : undefined}>
          <div className="hero-image-label">
            CRAFTED WITH INTENTION <span>01 / 03</span>
          </div>
        </div>
      </section>
      <CampaignShowcase />
      <section className="store-intro" id="story">
        <div className="eyebrow">A MORE PERSONAL STANDARD</div>
        <h2>
          Well made. Well worn.
          <br />
          <em>{config.tagline}</em>
        </h2>
        <p>
          From your first fitting to the final stitch, we bring care and
          precision to every piece.
        </p>
        <Link to="/shop" className="text-link">
          Explore our services →
        </Link>
      </section>
      <section id="services" className="service-strip">
        <div>
          <span>01</span>
          <b>Made to measure</b>
          <p>Personalised pieces, cut for you.</p>
        </div>
        <div>
          <span>02</span>
          <b>Expert alterations</b>
          <p>Give your wardrobe a better fit.</p>
        </div>
        <div>
          <span>03</span>
          <b>Private fittings</b>
          <p>Thoughtful service, by appointment.</p>
        </div>
      </section>
      <section className="shop-heading"><div className="eyebrow">THE RZ EDIT</div><h1>Shop by category</h1><div className="category-pills">{[...new Set(products.map(p=>p.category))].map(c=><Link key={c} to={`/shop?category=${encodeURIComponent(c)}`}>{c}</Link>)}</div></section>
      <section className="shop-grid home-products">{products.filter(p=>p.featured||products.length<4).slice(0,4).map(p=><article className="shop-product" key={p.id}><Link to="/shop">{p.image_url?<img src={p.image_url} alt={p.title}/>:<div className="shop-product-empty"><Shirt size={32}/></div>}</Link><div className="shop-product-copy"><div className="eyebrow">{p.category} · {p.kind==='custom'?'MADE TO MEASURE':'READY TO WEAR'}</div><h2>{p.title}</h2><p>{formatMoney(p.sale_price??p.price,merged.currency)}</p><Link className="text-link" to="/shop">View details →</Link></div></article>)}</section>
      <section className="store-intro"><div className="eyebrow">YOUR FABRIC. YOUR FIT.</div><h2>Designed around you.<br/><em>Finished by hand.</em></h2><p>Choose a fabric, preferred size and fit, then leave the measurements and details to our atelier.</p><button className="button button-primary" onClick={()=>setBookOpen(true)}>Book a fitting</button></section>
      {!!reviews.length&&<section className="review-section"><div className="eyebrow">KIND WORDS</div><h2>Customer reviews</h2><div className="review-grid">{reviews.slice(0,3).map(r=><article className="panel" key={r.id}><div className="gold-stars">{'★'.repeat(r.rating)}</div><p>{r.body}</p><b>{r.customer_name}</b><small>{r.title}</small></article>)}</div></section>}
      <ContactSection settings={merged}/>
      <footer><span>© 2026 {config.store_name}</span><span>Made to measure · Ready to wear · <Link to="/admin/login">Admin</Link></span></footer>
      {bookOpen&&<AppointmentDialog settings={merged} onClose={()=>setBookOpen(false)}/>}
    </div>
  );
}
function ShopPage() {
  const {cart,add,quantity,remove,clear}=useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [campaigns,setCampaigns]=useState<Campaign[]>([]);
  const [settings,setSettings]=useState<StoreSettings>(defaultSettings);
  const [error, setError] = useState("");
  const [chosen,setChosen]=useState<Product|null>(null);
  const [category,setCategory]=useState(new URLSearchParams(location.search).get('category')??'');
  const [details,setDetails]=useState({customer_name:'',customer_email:'',customer_phone:'',shipping_address:'',shipping_city:'Toronto',shipping_postal_code:'',payment_method:'cash_on_delivery' as const});
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);
  useEffect(() => {
    api
      .products()
      .then(setProducts)
      .catch((e) => setError(e.message));
    api.campaigns().then(setCampaigns).catch(()=>undefined);
    api.storeSettings().then(v=>setSettings({...defaultSettings,...v})).catch(()=>undefined);
  }, []);
  const isCart=location.pathname==='/cart';
  const [selection,setSelection]=useState({size:'',color:'',fabric:'',fit:'Classic',notes:'',measurements:''});
  const visible=products.filter(p=>!category||p.category===category);
  const cartPreview=previewCartCampaign(cart,campaigns);
  const productOffers=(product:Product)=>campaigns.filter(c=>campaignApplies(c,product)&&c.discount_type!=="none").sort((a,b)=>campaignUnitDiscount(b,Number(product.price))-campaignUnitDiscount(a,Number(product.price)))[0];
  async function checkout(event:React.FormEvent){event.preventDefault();setBusy(true);setError('');try{const result=await api.checkout({...details,items:cart.map(x=>({...x.options,product_id:x.product.id,quantity:x.quantity}))});clear();setNotice(`Order ${result.order_number} received. ${result.campaign_title?`${result.campaign_title} saved ${formatMoney(result.discount_amount,settings.currency)}. `:""}Amount due ${formatMoney(result.total,settings.currency)} on delivery.`);}catch(e){setError(e instanceof Error?e.message:'Checkout failed.')}finally{setBusy(false)}}
  return (
    <div className="storefront">
      <SiteHeader settings={settings} cartCount={cart.reduce((n,x)=>n+x.quantity,0)} onBag={()=>location.assign('/cart')} onBook={()=>location.assign('/#contact')}/>
      {!isCart&&<>
      <section className="shop-heading">
        <div className="eyebrow">{category||'MADE WITH INTENTION'}</div><h1>The collection</h1><p>Choose a ready-to-wear piece or make it yours with custom options.</p>
        <select aria-label="Filter by category" value={category} onChange={e=>setCategory(e.target.value)}><option value="">All categories</option>{[...new Set(products.map(p=>p.category))].map(c=><option key={c}>{c}</option>)}</select>
      </section>
      {error && (
        <p className="empty-state">
          The collection is temporarily unavailable.
        </p>
      )}
      <section className="shop-grid">
        {visible.map((p) => (
          <article className="shop-product" key={p.id}>
            {p.image_url ? (
              <img src={p.image_url} alt={p.title} />
            ) : (
              <div className="shop-product-empty">
                <Shirt size={32} />
              </div>
            )}
            <div className="shop-product-copy">
              <div className="eyebrow">{p.category}</div>
              <h2>{p.title}</h2>
              <p>{formatMoney(p.sale_price??p.price,settings.currency)}</p>
              {productOffers(p)&&<small className="product-offer-label">{productOffers(p)?.title} · {productOffers(p)?.discount_label||`${productOffers(p)?.discount_value}${productOffers(p)?.discount_type==="percent"?"%":" off"}`} at checkout</small>}
              <button className="button button-primary" onClick={()=>{setChosen(p);setSelection({size:'',color:'',fabric:'',fit:'Classic',notes:'',measurements:''})}}>{p.kind==='custom'?'Customize & add':'Choose options'}</button>
            </div>
          </article>
        ))}
      </section>
      {!products.length && !error && (
        <p className="empty-state">
          New pieces are being prepared. Please check back soon.
        </p>
      )}
      </>}
      {isCart&&<section className="cart-page"><div className="eyebrow">YOUR SELECTION</div><h1>Shopping bag</h1>{notice?<div className="success-panel"><h2>Thank you for your order</h2><p>{notice}</p><Link className="button button-primary" to="/shop">Continue shopping</Link></div>:!cart.length?<p className="empty-state">Your bag is empty. <Link to="/shop">Explore the collection</Link></p>:<div className="cart-layout"><div className="cart-lines">{cart.map(item=><article className="cart-line" key={item.key}>{item.product.image_url?<img src={item.product.image_url} alt=""/>:<div className="shop-product-empty"><Shirt/></div>}<div><h3>{item.product.title}</h3><p>{[item.options.size,item.options.color,item.options.fabric,item.options.fit].filter(Boolean).join(' · ')}</p><b>{formatMoney(item.product.sale_price??item.product.price,settings.currency)}</b></div><div className="quantity-controls"><button onClick={()=>quantity(item.key,-1)} aria-label="Decrease quantity">−</button><span>{item.quantity}</span><button onClick={()=>quantity(item.key,1)} aria-label="Increase quantity">+</button><button className="text-link" onClick={()=>remove(item.key)}>Remove</button></div></article>)}<strong>Subtotal {formatMoney(cartPreview.subtotal,settings.currency)}</strong>{cartPreview.offer&&<p className="campaign-saving">{cartPreview.offer.title} · savings {formatMoney(cartPreview.discount,settings.currency)}</p>}<strong className="cart-total">Estimated total {formatMoney(cartPreview.total,settings.currency)}</strong><p className="form-note">Shipping and taxes are not configured yet and are not included. The server verifies eligible campaign savings at checkout.</p></div><form className="checkout-form" onSubmit={checkout}><h2>Delivery details</h2>{([['customer_name','Full name'],['customer_email','Email'],['customer_phone','Phone'],['shipping_address','Street address'],['shipping_city','City'],['shipping_postal_code','Postal code']] as const).map(([key,label])=><label key={key}>{label}<input required type={key==='customer_email'?'email':'text'} value={details[key]} onChange={e=>setDetails({...details,[key]:e.target.value})}/></label>)}<label>Payment<select value="cash_on_delivery" disabled><option value="cash_on_delivery">Cash on delivery · unpaid until collected</option></select></label>{error&&<p className="inline-error">{error}</p>}<button className="button button-primary" disabled={busy}>{busy?'Placing order…':`Place order · ${formatMoney(cartPreview.total,settings.currency)}`}</button><p className="form-note">Your order is saved as pending. No online payment is taken.</p></form></div>}</section>}
      {chosen&&<div className="modal-backdrop"><section className="panel product-editor" role="dialog" aria-modal="true"><div className="panel-head"><div><div className="eyebrow">{chosen.kind==='custom'?'MADE FOR YOU':'READY TO WEAR'}</div><h2>{chosen.title}</h2></div><button className="icon-button" onClick={()=>setChosen(null)} aria-label="Close"><X/></button></div><p>{formatMoney(chosen.sale_price??chosen.price,settings.currency)} · {chosen.stock>0?`${chosen.stock} available`:'Made to order'}</p><div className="editor-grid">{chosen.sizes.length>0&&<label>Size<select value={selection.size} onChange={e=>setSelection({...selection,size:e.target.value})}><option value="">Select size</option>{chosen.sizes.map(x=><option key={x}>{x}</option>)}</select></label>}{chosen.colors.length>0&&<label>Color<select value={selection.color} onChange={e=>setSelection({...selection,color:e.target.value})}><option value="">Select color</option>{chosen.colors.map(x=><option key={x}>{x}</option>)}</select></label>}{chosen.fabrics.length>0&&<label>Fabric<select value={selection.fabric} onChange={e=>setSelection({...selection,fabric:e.target.value})}><option value="">Select fabric</option>{chosen.fabrics.map(x=><option key={x}>{x}</option>)}</select></label>}{chosen.kind==='custom'&&<><label>Fit<select value={selection.fit} onChange={e=>setSelection({...selection,fit:e.target.value})}>{['Slim','Regular','Classic'].map(x=><option key={x}>{x}</option>)}</select></label><label className="editor-full">Measurements (optional)<textarea placeholder="Chest, waist, sleeve, inseam…" value={selection.measurements} onChange={e=>setSelection({...selection,measurements:e.target.value})}/></label><label className="editor-full">Design notes<textarea value={selection.notes} onChange={e=>setSelection({...selection,notes:e.target.value})}/></label></>}</div><button className="button button-primary" onClick={()=>{if((chosen.kind==='custom'||chosen.sizes.length)&&!selection.size&&!(chosen.kind==='custom'&&selection.measurements.trim())){setError('Please select a size, or enter measurements for custom tailoring.');return;}setError('');add(chosen,{product_id:chosen.id,quantity:1,size:selection.size||undefined,color:selection.color||undefined,fabric:selection.fabric||undefined,fit:selection.fit,measurements:selection.measurements?{notes:selection.measurements}:undefined,tailoring_notes:selection.notes||undefined});setChosen(null)}}>Add to bag</button>{error&&<p className="inline-error">{error}</p>}</section></div>}
      <footer><span>© 2026 {settings.store_name}</span><Link to="/">Home</Link></footer>
    </div>
  );
}

function StoreSettingsPage() {
  const [value, setValue] = useState<StoreSettings | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    api
      .storeSettings()
      .then(setValue)
      .catch((e) => setError(e.message));
  }, []);
  if (!value)
    return (
      <div className="page-content">
        <p className="empty-state">{error || "Loading store settings…"}</p>
      </div>
    );
  const textFields: [keyof typeof value, string][] = [
    ["store_name", "Store name"],
    ["tagline", "Tagline"],
    ["hero_title", "Homepage hero title"],
    ["hero_description", "Homepage description"],
    ["phone", "Phone"],
    ["secondary_phone", "Second phone"],
    ["email", "Email"],
    ["address", "Store address"],
    ["currency", "Currency code"],
    ["map_url", "Map link"],
  ];
  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <div className="eyebrow">CONTENT & CONFIGURATION</div>
          <h1>Store settings</h1>
          <p>Update your public shop details without editing code.</p>
        </div>
        <button
          className="button button-primary"
          onClick={async () => {
            try {
              setMessage("");
              const saved = await api.saveStoreSettings(value);
              setValue(saved);
              setMessage("Settings saved.");
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Unable to save settings.",
              );
            }
          }}
        >
          Save changes
        </button>
      </div>
      <section className="panel settings-form">
        <h2>Store identity and contact</h2>
        {textFields.map(([key, label]) => (
          <label key={key}>
            {label}
            {key === "hero_description" || key === "address" ? (
              <textarea
                rows={key === "hero_description" ? 3 : 2}
                value={value[key] as string}
                onChange={(e) => setValue({ ...value, [key]: e.target.value })}
              />
            ) : (
              <input
                value={value[key] as string}
                onChange={(e) => setValue({ ...value, [key]: e.target.value })}
              />
            )}
          </label>
        ))}
        <h2>Logo and homepage image</h2>
        {(["logo_url", "hero_image_url"] as const).map((field) => (
          <label className="asset-setting" key={field}>
            {field === "logo_url" ? "Store logo" : "Hero / suit image"}
            {value[field] && <img src={value[field]} alt={field === "logo_url" ? "Current logo" : "Current hero image"} />}
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              try {
                setError("");
                const asset = await api.uploadMedia(file);
                setValue((current) => current ? { ...current, [field]: asset.url } : current);
                setMessage("Image uploaded. Save changes to publish it on the site.");
              } catch (uploadError) {
                setError(uploadError instanceof Error ? uploadError.message : "Image upload failed.");
              }
            }} />
          </label>
        ))}
        <h2>Business hours</h2>
        {[
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ].map((day) => (
          <label key={day}>
            {day}
            <input
              placeholder="Closed or 09:00–17:00"
              value={value.business_hours[day] ?? ""}
              onChange={(e) =>
                setValue({
                  ...value,
                  business_hours: {
                    ...value.business_hours,
                    [day]: e.target.value,
                  },
                })
              }
            />
          </label>
        ))}
        <h2>Social links</h2>
        {["whatsapp", "instagram", "facebook", "tiktok", "youtube", "linkedin"].map((key) => (
          <label key={key}>
            {key[0].toUpperCase() + key.slice(1)} URL
            <input
              type="url"
              value={value.social_links[key] ?? ""}
              onChange={(e) =>
                setValue({
                  ...value,
                  social_links: {
                    ...value.social_links,
                    [key]: e.target.value,
                  },
                })
              }
            />
          </label>
        ))}
        <p className="form-note">Create and schedule Black Friday, Christmas, Eid and other campaigns from the Offers page.</p>
        {message && <p className="positive">{message}</p>}
        {error && <p className="inline-error">{error}</p>}
      </section>
    </div>
  );
}
function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Shell>
      <div className="page-content">
        <section className="panel login-panel">
          <div className="eyebrow">SECURE WORKSPACE</div>
          <h1>Administrator sign in</h1>
          <p>Use your configured administrator credentials.</p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                await api.login(email, password);
                window.location.href = "/admin";
              } catch (err) {
                setError(err instanceof Error ? err.message : "Sign in failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Email address
              <input
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {error && <p className="inline-error">{error}</p>}
            <button className="button button-primary" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </section>
      </div>
    </Shell>
  );
}
export default function App() {
  return (
    <CartProvider><Routes>
      <Route path="/cart" element={<ShopPage />} />
      <Route path="/shop" element={<ShopPage />} />
      <Route path="/admin/login" element={<Login />} />
      <Route path="/admin/offers" element={<AdminRoute><Shell><CampaignsPage /></Shell></AdminRoute>} />
      <Route
        path="/admin/settings"
        element={
          <AdminRoute>
            <Shell>
              <StoreSettingsPage />
            </Shell>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/products"
        element={
          <AdminRoute>
            <Shell>
              <Products />
            </Shell>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/orders"
        element={
          <AdminRoute>
            <Shell>
              <OrdersPage />
            </Shell>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/customers"
        element={
          <AdminRoute>
            <Shell>
              <Placeholder title="Customers" />
            </Shell>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/appointments"
        element={
          <AdminRoute>
            <Shell>
              <AppointmentsPage />
            </Shell>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/categories"
        element={
          <AdminRoute>
            <Shell>
              <CategoriesPage />
            </Shell>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/media"
        element={
          <AdminRoute>
            <Shell>
              <MediaPage />
            </Shell>
          </AdminRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <Shell>
              <Dashboard />
            </Shell>
          </AdminRoute>
        }
      />
      <Route path="/" element={<Storefront />} />
      <Route path="*" element={<Storefront />} />
    </Routes></CartProvider>
  );
}
