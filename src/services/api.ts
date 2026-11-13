import type {
  BootstrapPayload,
  BuybackCreatePayload,
  BuybackItem,
  BuybacksPageResponse,
  CategoriesWithStatsResponse,
  Customer,
  CustomersPageResponse,
  DashboardSummaryResponse,
  PaginatedResponse,
  PaymentDetails,
  Product,
  ProductsPageResponse,
  PromoCampaign,
  PromosPageResponse,
  Tenant,
  Transaction,
  TransactionsPageResponse,
} from '../types';

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
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (data as { error?: string }).error || `Request gagal (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

export const posApi = {
  bootstrap: () => requestJson<BootstrapPayload>('/api/bootstrap'),

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
        pageSize: params.pageSize ?? 25,
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
        pageSize: params.pageSize ?? 20,
        search: params.search,
        method: params.method,
        sortBy: params.sortBy,
        sortDir: params.sortDir,
      })}`,
      { signal }
    ),
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
        pageSize: params.pageSize ?? 20,
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
        pageSize: params.pageSize ?? 20,
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
};
