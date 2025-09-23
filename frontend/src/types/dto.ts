/** ---- Backend DTOs ---- */
export interface SupplierDTO {
  _id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: 'active' | 'inactive' | 'pending';
  address?: {
    street?: string; city?: string; state?: string; zipCode?: string; country?: string;
  };
  products?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface StockDTO {
  _id: string;
  itemName: string;
  category?: string | null;
  quantity: number;
  unit?: string | null;
  threshold: number;
  supplierId?: SupplierDTO | string | null;
  expiryDate?: string | null;
  lastUpdated: string;
}

export interface RequestItemDTO {
  stock?: string;
  name: string;
  quantity: number;
  unit?: string;
}

export interface SupplierRequestDTO {
  _id: string;
  supplier: SupplierDTO | string;
  items: RequestItemDTO[];
  notes?: string;
  status: 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled' | 'closed';
  emailSentAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** ---- UI Models ---- */
export type StockUpsert = Partial<{
  itemName: string;
  category: string | null;
  quantity: number;
  unit: string | null;
  threshold: number;
  supplierId: string | null;
  expiryDate: string | null; // ISO
}>;

export type SupplierUpsert = Partial<{
  name: string;
  email: string;
  phone: string;
  company: string;
  status: 'active' | 'inactive' | 'pending';
  address: {
    street?: string; city?: string; state?: string; zipCode?: string; country?: string;
  };
  products: string[];
}>;

/** Helpers to strip null/undefined/empty string before sending to backend */
export function clean<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: any = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== '') out[k] = v;
  });
  return out;
}
