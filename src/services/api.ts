const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';

export interface Product {
  id: number;
  title: string;
  slug: string;
  category: string;
  price: string;
  stock: number;
  status: 'draft' | 'published' | 'archived';
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
  store_name: string; tagline: string; hero_title: string; hero_description: string; phone: string; email: string; address: string;
  business_hours: Record<string, string>; social_links: Record<string, string>; currency: string;
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
  return response.json() as Promise<T>;
}

export const api = {
  health: () => request<{ status: string }>('/health'),
  products: () => request<Product[]>('/products'),
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
};
// Cloudinary Image Upload Utility
export const uploadImageToCloudinary = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "rz_tailor_preset");

  const response = await fetch(
    "https://api.cloudinary.com/v1_1/nohwal0j/image/upload",
    {
      method: "POST",
      body: formData,
    }
  );

  const data = await response.json();
  if (data.secure_url) {
    return data.secure_url; // এটি ছবির স্থায়ী অনলাইন লিংক
  } else {
    throw new Error("Cloudinary upload failed");
  }
};