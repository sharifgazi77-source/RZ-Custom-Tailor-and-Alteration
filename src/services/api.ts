const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';

export interface Product {
  id: number;
  title: string;
  slug: string;
  category: string;
  price: string;
  sale_price?: string | null;
  sku?: string | null;
  stock: number;
  status: 'draft' | 'published' | 'archived';
  kind: 'ready_made' | 'custom';
  sizes: string[];
  colors: string[];
  fabrics: string[];
  featured: boolean;
  description: string;
  image_url?: string | null;
}
export interface DashboardData {
  total_products: number;
  total_orders: number;
  total_customers: number;
  revenue: string;
  status_counts: Record<string, number>;
  recent_orders: { id: string; customer: string; item: string; date: string; total: number; status: string }[];
  monthly_revenue: { month: number; sales: number }[];
}
export interface StoreSettings {
  store_name: string; tagline: string; hero_title: string; hero_description: string; phone: string; secondary_phone: string; email: string; address: string;
  logo_url: string; hero_image_url: string; map_url: string;
  business_hours: Record<string, string>; social_links: Record<string, string>; seasonal_offers: Record<'black_friday' | 'christmas', SeasonalOffer>; currency: string;
}

export interface SeasonalOffer {
  title: string; message: string; discount_text: string; cta_label: string; cta_url: string;
  active: boolean; starts_on: string | null; ends_on: string | null;
}

export interface Campaign {
  id: number; slug: string; name: string; title: string; message: string;
  discount_type: 'none' | 'percent' | 'fixed'; discount_value: string; discount_label: string;
  maximum_discount: string | null; minimum_subtotal: string; categories: string[]; product_ids: number[];
  banner_url: string; mobile_banner_url: string; cta_label: string; cta_url: string;
  starts_on: string | null; ends_on: string | null; status: 'draft' | 'published' | 'archived'; priority: number;
}

export interface CartLine {
  product_id: number; quantity: number; size?: string; color?: string; fabric?: string; fit?: string;
  measurements?: Record<string, string>; tailoring_notes?: string;
}

export interface CheckoutDetails {
  customer_name: string; customer_email: string; customer_phone: string; shipping_address: string;
  shipping_city: string; shipping_postal_code: string; payment_method: 'cash_on_delivery'; items: CartLine[];
}
export interface AdminOrder {
  id:number; order_number:string; customer_name:string; customer_email:string; customer_phone:string; shipping_address:string;
  shipping_city:string; shipping_postal_code:string; status:string; payment_status:string; payment_method:string; total:string;
  created_at:string; subtotal:string; discount_amount:string; campaign_title:string; items:{title:string;quantity:number;unit_price:string;options:Record<string,unknown>}[];
}
export interface AdminAppointment {
  id:number; customer_name:string; customer_email:string; customer_phone:string; service:string; starts_at:string; notes:string; status:string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new Error(detail?.detail ?? `Request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  health: () => request<{ status: string }>('/health'),
  products: () => request<Product[]>('/products'),
  categories: () => request<{ id: number; name: string; slug: string }[]>('/categories'),
  adminProducts: () => request<Product[]>('/admin/products', { headers: { Authorization: `Bearer ${localStorage.getItem('rz_admin_token') ?? ''}` } }),
  storeSettings: () => request<StoreSettings>('/store/settings'),
  saveStoreSettings: (data: StoreSettings) => request<StoreSettings>('/admin/store/settings', { method: 'PUT', headers: { Authorization: `Bearer ${localStorage.getItem('rz_admin_token') ?? ''}` }, body: JSON.stringify(data) }),
  dashboard: () => request<DashboardData>('/admin/dashboard', { headers: { Authorization: `Bearer ${localStorage.getItem('rz_admin_token') ?? ''}` } }),
  login: async (email: string, password: string) => {
    const body = new URLSearchParams({ username: email, password });
    const response = await fetch(`${API_BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    if (!response.ok) throw new Error('Email or password is incorrect');
    const result = await response.json() as { access_token: string };
    localStorage.setItem('rz_admin_token', result.access_token);
  },
  createProduct: (product: Omit<Product, 'id'>) => request<Product>('/admin/products', { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('rz_admin_token') ?? ''}` }, body: JSON.stringify(product) }),
  updateProduct: (id: number, product: Omit<Product, 'id'>) => request<Product>(`/admin/products/${id}`, { method: 'PATCH', headers: { Authorization: `Bearer ${localStorage.getItem('rz_admin_token') ?? ''}` }, body: JSON.stringify(product) }),
  uploadMedia: async (file: File) => {
    const form = new FormData(); form.append('file', file);
    const response = await fetch(`${API_BASE}/admin/media`, { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('rz_admin_token') ?? ''}` }, body: form });
    if (!response.ok) { const detail=await response.json().catch(()=>null); throw new Error(detail?.detail??'Image upload failed'); }
    return response.json() as Promise<{url:string}>;
  },
  media: () => request<{ id:number; filename:string; url:string; content_type:string; size_bytes:number }[]>('/admin/media', { headers: { Authorization: `Bearer ${localStorage.getItem('rz_admin_token') ?? ''}` } }),
  deleteMedia: (id:number) => request<void>(`/admin/media/${id}`, { method:'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('rz_admin_token') ?? ''}` } }),
  createCategory: (name:string,slug:string) => request<{id:number;name:string;slug:string}>('/admin/categories',{method:'POST',headers:{Authorization:`Bearer ${localStorage.getItem('rz_admin_token')??''}`},body:JSON.stringify({name,slug})}),
  orders: () => request<AdminOrder[]>('/admin/orders',{headers:{Authorization:`Bearer ${localStorage.getItem('rz_admin_token')??''}`}}),
  setOrderStatus: (id:number,status:string) => request<{status:string}>(`/admin/orders/${id}/status`,{method:'PATCH',headers:{Authorization:`Bearer ${localStorage.getItem('rz_admin_token')??''}`},body:JSON.stringify({status})}),
  checkout: (data:CheckoutDetails) => request<{order_number:string;status:string;payment_status:string;subtotal:string;discount_amount:string;campaign_title:string;total:string}>('/orders',{method:'POST',body:JSON.stringify(data)}),
  bookAppointment: (data:{customer_name:string;customer_email:string;customer_phone:string;service:string;starts_at:string;notes:string}) => request<{id:number;status:string;starts_at:string}>('/appointments',{method:'POST',body:JSON.stringify(data)}),
  appointments: () => request<AdminAppointment[]>('/admin/appointments',{headers:{Authorization:`Bearer ${localStorage.getItem('rz_admin_token')??''}`}}),
  updateAppointment: (id:number,data:{status:string;starts_at?:string}) => request<{status:string}>(`/admin/appointments/${id}`,{method:'PATCH',headers:{Authorization:`Bearer ${localStorage.getItem('rz_admin_token')??''}`},body:JSON.stringify(data)}),
  sendContact: (data:{name:string;email:string;message:string}) => request<{status:string}>('/contact',{method:'POST',body:JSON.stringify(data)}),
  reviews: () => request<{id:number;customer_name:string;rating:number;body:string;title:string}[]>('/store/reviews'),
  campaigns: () => request<Campaign[]>('/campaigns'),
  adminCampaigns: () => request<Campaign[]>('/admin/campaigns',{headers:{Authorization:`Bearer ${localStorage.getItem('rz_admin_token')??''}`}}),
  createCampaign: (data:Omit<Campaign,'id'>) => request<Campaign>('/admin/campaigns',{method:'POST',headers:{Authorization:`Bearer ${localStorage.getItem('rz_admin_token')??''}`},body:JSON.stringify(data)}),
  updateCampaign: (id:number,data:Omit<Campaign,'id'>) => request<Campaign>(`/admin/campaigns/${id}`,{method:'PATCH',headers:{Authorization:`Bearer ${localStorage.getItem('rz_admin_token')??''}`},body:JSON.stringify(data)}),
};
