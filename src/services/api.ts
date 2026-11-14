import type {
  AuthLoginResponse,
  BootstrapPayload,
  BuybackCreatePayload,
  BuybackItem,
  BuybacksPageResponse,
  CategoriesWithStatsResponse,
  Customer,
  CustomersPageResponse,
  DashboardSummaryResponse,
  PaymentDetails,
  Product,
  ProductsPageResponse,
  PromoCampaign,
  PromosPageResponse,
  ShiftClosingCreatePayload,
  ShiftClosingRecord,
  ShiftClosingsPageResponse,
  ShiftLiveSummary,
  StoreSettings,
  StoreSettingsUpdatePayload,
  Tenant,
  Transaction,
  TransactionsPageResponse,
  UserAccount,
  UserCreatePayload,
  UsersPageResponse,
  UserUpdatePayload,
} from '../types';

const AUTH_TOKEN_KEY = 'epaper_auth_token';
let unauthorizedHandler: (() => void) | null = null;

export function getAuthToken(): string | null {
  try {
    return window.localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string): void {
  try {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch {
    // Abaikan jika storage tidak tersedia
  }
}

export function clearAuthToken(): void {
  try {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // Abaikan jika storage tidak tersedia
  }
}

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

function toQueryString(params: Record<string, string | number | boolean | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') {
      sp.set(k, String(v));
    }
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options?.headers as Record<string, string> | undefined) ?? {}),
  };
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && !url.startsWith('/api/auth/login')) {
      clearAuthToken();
      unauthorizedHandler?.();
    }
    const message = (data as { error?: string }).error || `Request gagal (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

export const posApi = {
  // Authentication & Session
  login: async (identifier: string, password: string): Promise<AuthLoginResponse> => {
    const res = await requestJson<AuthLoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
    setAuthToken(res.token);
    return res;
  },
  logout: async (): Promise<void> => {
    try {
      await requestJson<{ ok: boolean }>('/api/auth/logout', { method: 'POST' });
    } catch {
      // Tetap bersihkan token lokal meskipun server sudah clear session
    } finally {
      clearAuthToken();
    }
  },
  getMe: () => requestJson<{ user: UserAccount; tenants: Tenant[]; activeTenantId: string }>('/api/auth/me'),

  bootstrap: () => requestJson<BootstrapPayload>('/api/bootstrap'),

  // Users CRUD (Owner only)
  getUsers: (
    params: {
      page?: number;
      pageSize?: number;
      search?: string;
      role?: string;
      sortBy?: string;
      sortDir?: 'asc' | 'desc';
    } = {},
    signal?: AbortSignal
  ) =>
    requestJson<UsersPageResponse>(
      `/api/users${toQueryString({
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 10,
        search: params.search,
        role: params.role,
        sortBy: params.sortBy,
        sortDir: params.sortDir,
      })}`,
      { signal }
    ),
  createUser: (payload: UserCreatePayload) =>
    requestJson<UserAccount>('/api/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateUser: (id: string, payload: UserUpdatePayload) =>
    requestJson<UserAccount>(`/api/users/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteUser: (id: string) =>
    requestJson<{ deletedId: string }>(`/api/users/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  // Dashboard Summary (Server-side aggregation)
  getDashboardSummary: (period: 'HARI' | 'BULAN', signal?: AbortSignal) =>
    requestJson<DashboardSummaryResponse>(`/api/dashboard/summary?period=${period}`, { signal }),

  // Products (Paginated + Lookup)
  getProducts: (
    params: {
      page?: number;
      pageSize?: number;
      search?: string;
      category?: string;
      promoOnly?: boolean;
      sortBy?: string;
      sortDir?: 'asc' | 'desc';
    } = {},
    signal?: AbortSignal
  ) =>
    requestJson<ProductsPageResponse>(
      `/api/products${toQueryString({
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 10,
        search: params.search,
        category: params.category,
        promoOnly: params.promoOnly ? 'true' : undefined,
        sortBy: params.sortBy,
        sortDir: params.sortDir,
      })}`,
      { signal }
    ),
  lookupProductByCode: (code: string) =>
    requestJson<Product>(`/api/products/lookup${toQueryString({ code })}`),
  createProduct: (product: Omit<Product, 'id'>) =>
    requestJson<Product>('/api/products', {
      method: 'POST',
      body: JSON.stringify(product),
    }),
  updateProduct: (id: number, product: Partial<Omit<Product, 'id'>>) =>
    requestJson<Product>(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(product),
    }),
  deleteProduct: (id: number) =>
    requestJson<{ deletedId: number }>(`/api/products/${id}`, {
      method: 'DELETE',
    }),

  // Categories
  getCategoriesWithStats: (signal?: AbortSignal) =>
    requestJson<CategoriesWithStatsResponse>('/api/categories?withStats=true', { signal }),
  createCategory: (name: string) =>
    requestJson<{ name: string; categories: string[] }>('/api/categories', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  renameCategory: (oldName: string, newName: string) =>
    requestJson<{ oldName: string; newName: string; categories: string[] }>(
      `/api/categories/${encodeURIComponent(oldName)}`,
      {
        method: 'PUT',
        body: JSON.stringify({ name: newName }),
      }
    ),
  deleteCategory: (name: string) =>
    requestJson<{ deletedName: string; categories: string[] }>(
      `/api/categories/${encodeURIComponent(name)}`,
      {
        method: 'DELETE',
      }
    ),

  // Transactions (Paginated)
  getTransactions: (
    params: {
      page?: number;
      pageSize?: number;
      search?: string;
      method?: string;
      sortBy?: string;
      sortDir?: 'asc' | 'desc';
    } = {},
    signal?: AbortSignal
  ) =>
    requestJson<TransactionsPageResponse>(
      `/api/transactions${toQueryString({
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 10,
        search: params.search,
        method: params.method,
        sortBy: params.sortBy,
        sortDir: params.sortDir,
      })}`,
      { signal }
    ),
  getTransactionById: (id: string) =>
    requestJson<Transaction>(`/api/transactions/${encodeURIComponent(id)}`),
  createTransaction: (payload: {
    cashier: string;
    customerId?: string;
    customerName: string;
    items: Array<{ id: number; qty: number }>;
    paymentMethod: 'cash' | 'debit' | 'transfer' | 'qris';
    paymentDetails: PaymentDetails;
  }) =>
    requestJson<{ transaction: Transaction }>('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  voidTransaction: (id: string, payload: { reason?: string; restoreStock?: boolean } = {}) =>
    requestJson<Transaction>(`/api/transactions/${encodeURIComponent(id)}/void`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Buybacks (Paginated lightweight list + On-demand detail)
  getBuybacks: (
    params: {
      page?: number;
      pageSize?: number;
      search?: string;
      method?: string;
      sortBy?: string;
      sortDir?: 'asc' | 'desc';
    } = {},
    signal?: AbortSignal
  ) =>
    requestJson<BuybacksPageResponse>(
      `/api/buybacks${toQueryString({
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 10,
        search: params.search,
        method: params.method,
        sortBy: params.sortBy,
        sortDir: params.sortDir,
      })}`,
      { signal }
    ),
  getBuybackById: (id: string) =>
    requestJson<BuybackItem>(`/api/buybacks/${encodeURIComponent(id)}`),
  createBuyback: (payload: BuybackCreatePayload) =>
    requestJson<BuybackItem>('/api/buybacks', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  voidBuyback: (id: string, payload: { reason?: string } = {}) =>
    requestJson<BuybackItem>(`/api/buybacks/${encodeURIComponent(id)}/void`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Customers (Paginated)
  getCustomers: (
    params: {
      page?: number;
      pageSize?: number;
      search?: string;
      type?: string;
      sortBy?: string;
      sortDir?: 'asc' | 'desc';
    } = {},
    signal?: AbortSignal
  ) =>
    requestJson<CustomersPageResponse>(
      `/api/customers${toQueryString({
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 10,
        search: params.search,
        type: params.type,
        sortBy: params.sortBy,
        sortDir: params.sortDir,
      })}`,
      { signal }
    ),
  createCustomer: (payload: Customer) =>
    requestJson<Customer>('/api/customers', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateCustomer: (id: string, payload: Partial<Customer>) =>
    requestJson<Customer>(`/api/customers/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteCustomer: (id: string) =>
    requestJson<{ deletedId: string }>(`/api/customers/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  // Promos (Paginated)
  getPromos: (
    params: {
      page?: number;
      pageSize?: number;
      search?: string;
      status?: string;
      sortBy?: string;
      sortDir?: 'asc' | 'desc';
    } = {},
    signal?: AbortSignal
  ) =>
    requestJson<PromosPageResponse>(
      `/api/promos${toQueryString({
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 10,
        search: params.search,
        status: params.status,
        sortBy: params.sortBy,
        sortDir: params.sortDir,
      })}`,
      { signal }
    ),
  createPromo: (payload: PromoCampaign) =>
    requestJson<PromoCampaign>('/api/promos', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updatePromo: (id: string, payload: Partial<PromoCampaign>) =>
    requestJson<PromoCampaign>(`/api/promos/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  togglePromoStatus: (id: string) =>
    requestJson<PromoCampaign>(`/api/promos/${encodeURIComponent(id)}/toggle`, {
      method: 'PATCH',
    }),
  deletePromo: (id: string) =>
    requestJson<{ deletedId: string }>(`/api/promos/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  // Tenants
  getTenants: () => requestJson<Tenant[]>('/api/tenants'),
  registerTenant: (payload: Tenant) =>
    requestJson<Tenant>('/api/tenants', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  setActiveTenant: (tenantId: string) =>
    requestJson<{ activeTenantId: string }>('/api/tenants/active', {
      method: 'PATCH',
      body: JSON.stringify({ tenantId }),
    }),

  // Store Settings (Tahap 3)
  getStoreSettings: (signal?: AbortSignal) =>
    requestJson<{ tenant: Tenant | null; storeSettings: StoreSettings }>('/api/settings', { signal }),
  updateStoreSettings: (payload: StoreSettingsUpdatePayload) =>
    requestJson<{ tenant: Tenant; storeSettings: StoreSettings }>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  // Shift Closing / Rekap Shift (Tahap 3)
  getShiftSummary: (params: { date?: string; scope?: 'my' | 'outlet' } = {}, signal?: AbortSignal) =>
    requestJson<ShiftLiveSummary>(
      `/api/shifts/summary${toQueryString({
        date: params.date,
        scope: params.scope,
      })}`,
      { signal }
    ),
  getShiftClosings: (
    params: {
      page?: number;
      pageSize?: number;
      search?: string;
      varianceFilter?: string;
      sortBy?: string;
      sortDir?: 'asc' | 'desc';
    } = {},
    signal?: AbortSignal
  ) =>
    requestJson<ShiftClosingsPageResponse>(
      `/api/shifts${toQueryString({
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 10,
        search: params.search,
        varianceFilter: params.varianceFilter,
        sortBy: params.sortBy,
        sortDir: params.sortDir,
      })}`,
      { signal }
    ),
  closeShift: (payload: ShiftClosingCreatePayload) =>
    requestJson<ShiftClosingRecord>('/api/shifts/close', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

