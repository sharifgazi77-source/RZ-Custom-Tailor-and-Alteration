import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { Activity, Bell, CalendarDays, ChevronDown, CircleHelp, ClipboardList, Coins, FolderOpen, Gauge, Menu, Package, Pencil, Plus, Search, Settings, Shirt, ShoppingBag, Users, X } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from 'recharts';
import { api, type Product } from './services/api';
import { toProductSlug } from './utils/product';

const monthLabels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const nav = [{ label: 'Overview', to: '/admin', icon: Gauge }, { label: 'Products', to: '/admin/products', icon: Package }, { label: 'Categories', to: '/admin/categories', icon: FolderOpen }, { label: 'Orders', to: '/admin/orders', icon: ClipboardList }, { label: 'Customers', to: '/admin/customers', icon: Users }, { label: 'Appointments', to: '/admin/appointments', icon: CalendarDays }, { label: 'Media library', to: '/admin/media', icon: Activity }];

function Shell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <div className="app-shell"><aside className={`sidebar ${open ? 'sidebar-open' : ''}`}><div className="brand"><div className="brand-mark">RZ</div><div><b>RZ CUSTOM</b><span>TAILOR & ALTERATION</span></div><button className="icon-button close-menu" onClick={() => setOpen(false)} aria-label="Close navigation"><X size={18}/></button></div><div className="workspace-label">WORKSPACE</div><nav className="side-nav">{nav.map(({ label, to, icon: Icon }) => <NavLink key={to} to={to} end={to === '/admin'} onClick={() => setOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><Icon size={17}/><span>{label}</span></NavLink>)}</nav><div className="sidebar-bottom"><div className="sidebar-note"><div className="note-gem">✦</div><b>Made for the moments<br/>that matter.</b><span>Exceptional fit. Timeless style.</span><Link to="/">View storefront <span>↗</span></Link></div><NavLink className={({isActive})=>`nav-link ${isActive?'active':''}`} to="/admin/settings"><Settings size={17}/><span>Store settings</span></NavLink><button className="profile logout-button" onClick={()=>{localStorage.removeItem('rz_admin_token');window.location.href='/admin/login';}}><div className="avatar">RZ</div><div className="profile-copy"><b>Store administrator</b><span>Sign out</span></div><ChevronDown size={15}/></button></div></aside>{open && <button aria-label="Close menu overlay" className="scrim" onClick={() => setOpen(false)}/>}<main className="main-area"><header className="topbar"><button className="icon-button menu-toggle" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu size={20}/></button><div className="breadcrumbs">RZ Custom <span>/</span> <b>Dashboard</b></div><div className="top-actions"><button className="search-box"><Search size={16}/><span>Search anything...</span><kbd>⌘ K</kbd></button><button className="icon-button notify" aria-label="Notifications"><Bell size={18}/><i/></button><div className="top-avatar">RZ</div></div></header>{children}</main></div>;
}

function AdminRoute({children}:{children:React.ReactNode}) { return localStorage.getItem('rz_admin_token') ? children : <Navigate to="/admin/login" replace/>; }

function Dashboard() {
 const [data, setData] = useState<Awaited<ReturnType<typeof api.dashboard>> | null>(null); const [error, setError] = useState('');
 useEffect(() => { api.dashboard().then(setData).catch(e => setError(e.message)); }, []);
 const cards = [{ label: 'Total revenue', value: `$${Number(data?.revenue ?? 0).toLocaleString(undefined,{minimumFractionDigits:2})}`, icon: Coins }, { label: 'Total orders', value: data?.total_orders ?? '—', icon: ShoppingBag }, { label: 'Total products', value: data?.total_products ?? '—', icon: Shirt }, { label: 'Total customers', value: data?.total_customers ?? '—', icon: Users }];
 const chartData = data?.monthly_revenue.map(x => ({ month: monthLabels[x.month-1], sales: x.sales })) ?? [];
 const statusColors: Record<string, string> = { completed: '#142640', processing: '#b99357', pending: '#d9c8a7', cancelled: '#e8e5de' };
 const statusData = Object.entries(data?.status_counts ?? {}).map(([name,value]) => ({ name: name.replaceAll('_',' ').replace(/^./,c => c.toUpperCase()), value, color: statusColors[name] ?? '#8d9cab' }));
 return <div className="page-content"><div className="page-heading"><div><div className="eyebrow">STORE OVERVIEW</div><h1>Good morning <span>✦</span></h1><p>Here’s what’s happening at your store.</p></div><button className="button button-primary"><Plus size={16}/> Quick action <ChevronDown size={14}/></button></div>{error && <div className="inline-error" role="status">{error}. Dashboard figures are hidden until admin login is connected.</div>}<section className="stat-grid">{cards.map(({ label, value, icon: Icon }) => <article className="stat-card" key={label}><div className="stat-top"><span>{label}</span><div className="stat-icon"><Icon size={17}/></div></div><div className="stat-value">{value}</div><div className="stat-foot"><span>From saved store records</span></div></article>)}</section><section className="analytics-grid"><article className="panel sales-panel"><div className="panel-head"><div><h2>Sales overview</h2><p>Paid order revenue by month</p></div><select aria-label="Sales date range"><option>Current year</option></select></div><div className="chart-key"><i/> Revenue <strong>${Number(data?.revenue ?? 0).toLocaleString(undefined,{minimumFractionDigits:2})}</strong></div><div className="sales-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}><defs><linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c5a56b" stopOpacity={0.22}/><stop offset="95%" stopColor="#c5a56b" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#edeae4" vertical={false}/><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#92949a', fontSize: 11 }}/><YAxis axisLine={false} tickLine={false} tick={{ fill: '#92949a', fontSize: 11 }} tickFormatter={(v) => `$${v / 1000}k`}/><Tooltip formatter={(v) => [`$${Number(v).toLocaleString()}`, 'Revenue']} contentStyle={{ borderRadius: 8, border: '1px solid #e9e5dc' }}/><Area type="monotone" dataKey="sales" stroke="#b38c4d" strokeWidth={2.5} fill="url(#fill)"/></AreaChart></ResponsiveContainer></div></article><article className="panel status-panel"><div className="panel-head"><div><h2>Order status</h2><p>Order fulfillment summary</p></div><button className="dots">···</button></div><div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={82} paddingAngle={3} stroke="none">{statusData.map((item) => <Cell key={item.name} fill={item.color}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer><div className="donut-center"><b>{data?.total_orders ?? '—'}</b><span>Total orders</span></div></div><div className="legend">{statusData.map((item) => <div key={item.name}><span><i style={{ background: item.color }}/>{item.name}</span><b>{item.value}</b></div>)}</div></article></section><section className="panel orders-panel"><div className="panel-head"><div><h2>Recent orders</h2><p>Latest saved orders</p></div><Link className="text-link" to="/admin/orders">View all orders <span>→</span></Link></div><div className="table-wrap">{data?.recent_orders.length ? <table><thead><tr><th>ORDER</th><th>CUSTOMER</th><th>ITEM</th><th>DATE</th><th>TOTAL</th><th>STATUS</th><th/></tr></thead><tbody>{data.recent_orders.map(order => <tr key={order.id}><td className="order-id">{order.id}</td><td><div className="customer-cell"><div className="tiny-avatar">{order.customer.slice(0,2).toUpperCase()}</div>{order.customer}</div></td><td>{order.item}</td><td>{new Date(order.date).toLocaleDateString()}</td><td className="money">${order.total.toFixed(2)}</td><td><span className={`status-pill ${order.status.toLowerCase().replaceAll(' ', '-')}`}>{order.status}</span></td><td><button className="row-menu" aria-label={`Actions for ${order.id}`}>···</button></td></tr>)}</tbody></table> : <p className="empty-state">{error ? 'Sign in as an administrator to view store records.' : 'No orders recorded yet.'}</p>}</div></section></div>;
}

function Products() {
 const [items, setItems] = useState<Product[]>([]); const [error, setError] = useState(''); const [loading, setLoading] = useState(true); const [term, setTerm] = useState(''); const [editing,setEditing]=useState<Product|null>(null); const [showForm,setShowForm]=useState(false); const [busy,setBusy]=useState(false); const [image,setImage]=useState<File|null>(null);
 const [form,setForm]=useState({title:'',slug:'',category:'Suits',price:'',stock:0,status:'draft' as Product['status'],image_url:''});
 const refresh=()=>api.adminProducts().then(setItems).catch(e=>setError(e.message)).finally(()=>setLoading(false));
 useEffect(() => { refresh(); }, []);
 const visible = useMemo(() => items.filter(p => `${p.title} ${p.category} ${p.slug}`.toLowerCase().includes(term.toLowerCase())), [items, term]);
 const openNew=()=>{setEditing(null);setImage(null);setForm({title:'',slug:'',category:'Suits',price:'',stock:0,status:'draft',image_url:''});setShowForm(true);setError('');};
 const openEdit=(p:Product)=>{setEditing(p);setImage(null);setForm({title:p.title,slug:p.slug,category:p.category,price:p.price,stock:p.stock,status:p.status,image_url:p.image_url??''});setShowForm(true);setError('');};
 const submit=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setError('');try{let imageUrl=form.image_url;if(image){const uploaded=await api.uploadMedia(image);imageUrl=uploaded.url;}const payload={...form,image_url:imageUrl||null};const saved=editing?await api.updateProduct(editing.id,payload):await api.createProduct(payload);setItems(current=>editing?current.map(p=>p.id===saved.id?saved:p):[saved,...current]);setShowForm(false);}catch(err){setError(err instanceof Error?err.message:'Product could not be saved');}finally{setBusy(false);}};
 return <div className="page-content"><div className="page-heading"><div><div className="eyebrow">CATALOGUE</div><h1>Products</h1><p>Manage your collection and inventory.</p></div><button className="button button-primary" onClick={openNew}><Plus size={16}/> Add product</button></div>{error&&!showForm&&<div className="inline-error" role="status">{error}</div>}<section className="panel orders-panel"><div className="product-toolbar"><div className="search-field"><Search size={16}/><input placeholder="Search products..." value={term} onChange={e => setTerm(e.target.value)}/></div><span className="products-total">{items.length} products</span></div>{loading ? <p className="empty-state">Loading catalogue…</p> : visible.length ? <div className="table-wrap"><table><thead><tr><th>PRODUCT</th><th>CATEGORY</th><th>PRICE</th><th>STOCK</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>{visible.map(p => <tr key={p.id}><td><div className="product-cell">{p.image_url ? <img src={p.image_url} alt=""/> : <div className="product-thumb"><Shirt size={17}/></div>}<b>{p.title}</b></div></td><td>{p.category}</td><td className="money">${Number(p.price).toFixed(2)}</td><td>{p.stock}</td><td><span className={`status-pill ${p.status}`}>{p.status}</span></td><td><button className="icon-button" aria-label={`Edit ${p.title}`} onClick={()=>openEdit(p)}><Pencil size={15}/></button></td></tr>)}</tbody></table></div> : <p className="empty-state">No products found. Add your first product.</p>}</section>{showForm&&<div className="modal-backdrop" role="presentation"><section className="panel product-editor" role="dialog" aria-modal="true" aria-labelledby="product-editor-title"><div className="panel-head"><div><div className="eyebrow">PRODUCT CATALOGUE</div><h2 id="product-editor-title">{editing?'Edit product':'Add product'}</h2></div><button className="icon-button" aria-label="Close editor" onClick={()=>setShowForm(false)}><X size={18}/></button></div><form onSubmit={submit}><div className="editor-grid"><label>Product name<input required minLength={2} maxLength={180} value={form.title} onChange={e=>setForm({...form,title:e.target.value,slug:editing?form.slug:toProductSlug(e.target.value)})}/></label><label>Slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={form.slug} onChange={e=>setForm({...form,slug:e.target.value})}/></label><label>Category<input required value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/></label><label>Price<input required type="number" min="0.01" step="0.01" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/></label><label>Stock quantity<input required type="number" min="0" step="1" value={form.stock} onChange={e=>setForm({...form,stock:Number(e.target.value)})}/></label><label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value as Product['status']})}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label><label className="upload-field">Product image (JPEG, PNG or WebP, up to 5 MB)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setImage(e.target.files?.[0]??null)}/>{image&&<span>{image.name} ready to upload</span>}{form.image_url&&!image&&<img src={form.image_url} alt="Current product"/>}</label></div>{error&&<p className="inline-error">{error}</p>}<div className="editor-actions"><button type="button" className="button button-outline" onClick={()=>setShowForm(false)}>Cancel</button><button className="button button-primary" disabled={busy}>{busy?'Saving…':editing?'Save changes':'Save product'}</button></div></form></section></div>}</div>;
}

function Placeholder({ title }: { title: string }) { return <div className="page-content"><div className="page-heading"><div><div className="eyebrow">RZ CUSTOM</div><h1>{title}</h1><p>This workspace is ready for the {title.toLowerCase()} module.</p></div></div><section className="panel module-placeholder"><div className="placeholder-icon"><CircleHelp size={22}/></div><h2>{title} management</h2><p>The screen shell is in place. Connect this module to its backend workflow to manage live {title.toLowerCase()} records.</p></section></div>; }
function Storefront() { const [settings,setSettings]=useState<import('./services/api').StoreSettings|null>(null); useEffect(()=>{api.storeSettings().then(setSettings).catch(()=>undefined);},[]); const config=settings??{store_name:'RZ Custom Tailor & Alteration',tagline:'Made for the moments that matter.',hero_title:'Made for the moments that matter.',hero_description:'Thoughtful tailoring, exceptional fabrics, and a fit that feels entirely your own.',phone:'',email:'',address:'',business_hours:{},social_links:{},currency:'USD'}; return <div className="storefront"><header><Link className="store-brand" to="/"><b>RZ</b><span>{config.store_name.toUpperCase()}<br/><small>TAILOR & ALTERATION</small></span></Link><nav><Link to="/shop">Shop</Link><a href="#services">Bespoke</a><a href="#story">Our story</a><a href="#contact">Contact</a></nav><Link className="button button-primary" to="/shop">Book a fitting</Link></header><section className="hero"><div className="hero-copy"><div className="eyebrow">THE ART OF PERSONAL STYLE</div><h1>{config.hero_title}</h1><p>{config.hero_description}</p><Link className="button button-primary" to="/shop">Discover the collection <span>→</span></Link><div className="hero-meta"><span>MADE TO MEASURE</span><i/>{config.address||'VISIT OUR ATELIER'}</div></div><div className="hero-image"><div className="hero-image-label">CRAFTED WITH INTENTION <span>01 / 03</span></div></div></section><section className="store-intro" id="story"><div className="eyebrow">A MORE PERSONAL STANDARD</div><h2>Well made. Well worn.<br/><em>{config.tagline}</em></h2><p>From your first fitting to the final stitch, we bring care and precision to every piece.</p><Link to="/shop" className="text-link">Explore our services →</Link></section><section id="services" className="service-strip"><div><span>01</span><b>Made to measure</b><p>Personalised pieces, cut for you.</p></div><div><span>02</span><b>Expert alterations</b><p>Give your wardrobe a better fit.</p></div><div><span>03</span><b>Private fittings</b><p>Thoughtful service, by appointment.</p></div></section><footer id="contact"><span>© 2026 {config.store_name}</span><span>{config.address} · {config.phone && <a href={`tel:${config.phone}`}>{config.phone}</a>} · {config.email && <a href={`mailto:${config.email}`}>{config.email}</a>} · <Link to="/admin/login">Admin</Link></span></footer></div>; }
function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState('');
  const [storeName, setStoreName] = useState('RZ Custom Tailor & Alteration');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    api.products().then(setProducts).catch(e => setError(e.message));
    api.storeSettings().then(v => setStoreName(v.store_name)).catch(() => undefined);
  }, []);

  return (
    <div className="storefront">
      <header>
        <Link className="store-brand" to="/"><b>RZ</b><span>{storeName.toUpperCase()}<br/><small>TAILOR & ALTERATION</small></span></Link>
        <nav><Link to="/shop">Shop</Link><Link to="/#services">Bespoke</Link><Link to="/#story">Our story</Link><Link to="/#contact">Contact</Link></nav>
        <Link className="button button-primary" to="/#contact">Book a fitting</Link>
      </header>

      <section className="shop-heading">
        <div className="eyebrow">MADE WITH INTENTION</div>
        <h1>The collection</h1>
        <p>Considered pieces, made for a life well dressed.</p>
      </section>

      {error && <p className="empty-state">The collection is temporarily unavailable.</p>}

      <section className="shop-grid">
        {products.map(p => (
          <article className="shop-product" key={p.id}>
            {p.image_url ? <img src={p.image_url} alt={p.title}/> : <div className="shop-product-empty"><Shirt size={32}/></div>}
            <div className="shop-product-copy">
              <div className="eyebrow">{p.category}</div>
              <h2>{p.title}</h2>
              <p>${Number(p.price).toFixed(2)}</p>
              <button
                className="button button-outline"
                style={{ marginTop: '12px', width: '100%' }}
                onClick={() => setSelectedProduct(p)}
              >
                Customize & Measure
              </button>
            </div>
          </article>
        ))}
      </section>

      {!products.length && !error && <p className="empty-state">New pieces are being prepared. Please check back soon.</p>}

      {selectedProduct && (
        <MeasurementForm
          productName={selectedProduct.title}
          onClose={() => setSelectedProduct(null)}
          onSubmit={(formData) => {
            alert(`Measurements saved successfully for ${selectedProduct.title}!`);
            console.log("Measurement Data:", formData);
            setSelectedProduct(null);
          }}
        />
      )}

      <footer><span>© 2026 {storeName}</span><Link to="/">Back to home</Link></footer>
    </div>
  );
}

function StoreSettingsPage() { const [value,setValue]=useState<import('./services/api').StoreSettings|null>(null); const [message,setMessage]=useState(''); const [error,setError]=useState(''); useEffect(()=>{api.storeSettings().then(setValue).catch(e=>setError(e.message));},[]); if(!value)return <div className="page-content"><p className="empty-state">{error||'Loading store settings…'}</p></div>; const textFields: [keyof typeof value,string][] = [['store_name','Store name'],['tagline','Tagline'],['hero_title','Homepage hero title'],['hero_description','Homepage description'],['phone','Phone'],['email','Email'],['address','Store address'],['currency','Currency code']]; return <div className="page-content"><div className="page-heading"><div><div className="eyebrow">CONTENT & CONFIGURATION</div><h1>Store settings</h1><p>Update your public shop details without editing code.</p></div><button className="button button-primary" onClick={async()=>{try{setMessage(''); const saved=await api.saveStoreSettings(value);setValue(saved);setMessage('Settings saved.');}catch(e){setError(e instanceof Error?e.message:'Unable to save settings.');}}}>Save changes</button></div><section className="panel settings-form"><h2>Store identity and contact</h2>{textFields.map(([key,label])=><label key={key}>{label}{key==='hero_description'||key==='address'?<textarea rows={key==='hero_description'?3:2} value={value[key] as string} onChange={e=>setValue({...value,[key]:e.target.value})}/>:<input value={value[key] as string} onChange={e=>setValue({...value,[key]:e.target.value})}/>}</label>)}<h2>Business hours</h2>{['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(day=><label key={day}>{day}<input placeholder="Closed or 09:00–17:00" value={value.business_hours[day]??''} onChange={e=>setValue({...value,business_hours:{...value.business_hours,[day]:e.target.value}})}/></label>)}<h2>Social links</h2>{['whatsapp','instagram','facebook'].map(key=><label key={key}>{key[0].toUpperCase()+key.slice(1)} URL<input type="url" value={value.social_links[key]??''} onChange={e=>setValue({...value,social_links:{...value.social_links,[key]:e.target.value}})}/></label>)}{message&&<p className="positive">{message}</p>}{error&&<p className="inline-error">{error}</p>}</section></div>; }
function Login() { const [email,setEmail] = useState(''); const [password,setPassword] = useState(''); const [error,setError] = useState(''); const [busy,setBusy] = useState(false); return <Shell><div className="page-content"><section className="panel login-panel"><div className="eyebrow">SECURE WORKSPACE</div><h1>Administrator sign in</h1><p>Use your configured administrator credentials.</p><form onSubmit={async e => { e.preventDefault(); setBusy(true); setError(''); try { await api.login(email,password); window.location.href='/admin'; } catch(err) { setError(err instanceof Error ? err.message : 'Sign in failed'); } finally { setBusy(false); } }}><label>Email address<input type="email" required autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<p className="inline-error">{error}</p>}<button className="button button-primary" disabled={busy}>{busy?'Signing in…':'Sign in'}</button></form></section></div></Shell>; }
function MeasurementForm({ productName, onClose, onSubmit }: { productName?: string; onClose: () => void; onSubmit: (data: Record<string, any>) => void })  {
  const [formData, setFormData] = useState({
    garmentType: 'Suit',
    chest: '',
    waist: '',
    shoulder: '',
    sleeve: '',
    length: '',
    neck: '',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="panel product-editor" role="dialog" aria-modal="true" aria-labelledby="measurement-title">
        <div className="panel-head">
          <div>
            <div className="eyebrow">BESPOKE TAILORING</div>
            <h2 id="measurement-title">Enter Your Measurements {productName ? ` - ` + productName : ' '}</h2>
          </div>
          <button className="icon-button" aria-label="Close form" onClick={onClose}>
            <X size={18}/>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="editor-grid">
            <label>
              Garment Type
              <select value={formData.garmentType} onChange={e => setFormData({...formData, garmentType: e.target.value})}>
                <option value="Suit">Custom Suit</option>
                <option value="Shirt">Bespoke Shirt</option>
                <option value="Trouser">Tailored Trouser</option>
                <option value="Blazer">Blazer / Jacket</option>
              </select>
            </label>
            <label>
              Chest / Bust (inches)
              <input type="number" step="0.5" placeholder="e.g., 40" value={formData.chest} onChange={e => setFormData({...formData, chest: e.target.value})} required />
            </label>
            <label>
              Waist (inches)
              <input type="number" step="0.5" placeholder="e.g., 34" value={formData.waist} onChange={e => setFormData({...formData, waist: e.target.value})} required />
            </label>
            <label>
              Shoulder Width (inches)
              <input type="number" step="0.5" placeholder="e.g., 18" value={formData.shoulder} onChange={e => setFormData({...formData, shoulder: e.target.value})} required />
            </label>
            <label>
              Sleeve Length (inches)
              <input type="number" step="0.5" placeholder="e.g., 25" value={formData.sleeve} onChange={e => setFormData({...formData, sleeve: e.target.value})} required />
            </label>
            <label>
              Full Length (inches)
              <input type="number" step="0.5" placeholder="e.g., 30" value={formData.length} onChange={e => setFormData({...formData, length: e.target.value})} required />
            </label>
            <label>
              Neck (inches)
              <input type="number" step="0.5" placeholder="e.g., 15.5" value={formData.neck} onChange={e => setFormData({...formData, neck: e.target.value})} />
            </label>
            <label style={{ gridColumn: '1 / -1' }}>
              Special Fit Notes / Alterations
              <textarea rows={3} placeholder="Mention any specific posture or fitting preferences..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
            </label>
          </div>
          <div className="editor-actions">
            <button type="button" className="button button-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="button button-primary">Save Measurements</button>
          </div>
        </form>
      </section>
    </div>
  );
}
export default function App() { return <Routes><Route path="/shop" element={<ShopPage/>}/><Route path="/admin/login" element={<Login/>}/><Route path="/admin/settings" element={<AdminRoute><Shell><StoreSettingsPage/></Shell></AdminRoute>}/><Route path="/admin/products" element={<AdminRoute><Shell><Products/></Shell></AdminRoute>}/><Route path="/admin/orders" element={<AdminRoute><Shell><Placeholder title="Orders"/></Shell></AdminRoute>}/><Route path="/admin/customers" element={<AdminRoute><Shell><Placeholder title="Customers"/></Shell></AdminRoute>}/><Route path="/admin/appointments" element={<AdminRoute><Shell><Placeholder title="Appointments"/></Shell></AdminRoute>}/><Route path="/admin/categories" element={<AdminRoute><Shell><Placeholder title="Categories"/></Shell></AdminRoute>}/><Route path="/admin/media" element={<AdminRoute><Shell><Placeholder title="Media library"/></Shell></AdminRoute>}/><Route path="/admin" element={<AdminRoute><Shell><Dashboard/></Shell></AdminRoute>}/><Route path="/" element={<Storefront/>}/><Route path="*" element={<Storefront/>}/></Routes>; }
