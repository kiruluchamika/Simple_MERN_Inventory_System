import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Minus,
  Package,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Pencil,
  Trash2,
  Search,
  CalendarDays,
  Boxes,
} from 'lucide-react';
import { api } from '../lib/api';
import { StockDTO, StockUpsert, clean } from '../types/dto';
import Modal from '../components/Modal';

/* ---------------- Tiny Toasts (success / error messages) ---------------- */
type Toast = { id: string; title: string; desc?: string; tone?: 'ok' | 'err' };
function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = (t: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, ...t }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 2800);
  };
  return { toasts, push };
}
function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed bottom-4 right-4 z-[60] space-y-2">
      {toasts.map((t) => {
        const ok = t.tone !== 'err';
        return (
          <div
            key={t.id}
            className={`w-[320px] rounded-xl border p-3 backdrop-blur shadow-lg ${
              ok ? 'bg-white/90 border-emerald-200' : 'bg-white/90 border-rose-200'
            }`}
          >
            <div className="flex items-start gap-2">
              {ok ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-600 mt-0.5" />
              )}
              <div>
                <div className="font-semibold text-slate-900">{t.title}</div>
                {t.desc ? <div className="text-xs text-slate-600 mt-0.5">{t.desc}</div> : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
/* ----------------------------------------------------------------------- */

export default function InventoryPage() {
  const [list, setList] = useState<StockDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [edit, setEdit] = useState<StockDTO | null>(null);
  const [form, setForm] = useState<StockUpsert>({
    itemName: '',
    quantity: 0,
    threshold: 0,
    unit: 'pieces',
    category: '',
  });
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    itemName?: string;
    unit?: string;
    quantity?: string;
    threshold?: string;
  }>({});

  const { toasts, push } = useToasts();

  // ----- Unit dropdown options -----
  const UNIT_OPTIONS = ['pieces', 'kg', 'g', 'liters', 'packs'];

  async function load() {
    setLoading(true);
    try {
      setList(await api.get<StockDTO[]>('/api/stocks'));
    } catch (e: any) {
      push({ title: 'Failed to load inventory', desc: e?.message ?? 'Network error', tone: 'err' });
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEdit(null);
    setForm({ itemName: '', quantity: 0, threshold: 0, unit: 'pieces', category: '' });
    setFieldErrors({});
    setModalOpen(true);
  }
  function openEdit(row: StockDTO) {
    setEdit(row);
    setForm({
      itemName: row.itemName,
      category: row.category ?? '',
      quantity: row.quantity,
      threshold: row.threshold,
      unit: row.unit ?? 'pieces',
      expiryDate: row.expiryDate ?? null,
    });
    setFieldErrors({});
    setModalOpen(true);
  }

  function validate(): boolean {
    const errs: typeof fieldErrors = {};
    if (!form.itemName?.trim()) errs.itemName = 'Item name is required.';
    if (!form.unit?.trim()) errs.unit = 'Unit is required.';
    if (form.quantity == null || Number.isNaN(form.quantity)) errs.quantity = 'Quantity is required.';
    else if (form.quantity < 0) errs.quantity = 'Quantity cannot be negative.';
    else if (!Number.isInteger(Number(form.quantity))) errs.quantity = 'Quantity must be an integer.';
    if (form.threshold == null || Number.isNaN(form.threshold)) errs.threshold = 'Minimum is required.';
    else if (form.threshold < 0) errs.threshold = 'Minimum cannot be negative.';
    else if (!Number.isInteger(Number(form.threshold))) errs.threshold = 'Minimum must be an integer.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function submit() {
    if (!validate()) return;
    try {
      setSaving(true);
      const payload = clean(form);
      if (edit) {
        const updated = await api.put<StockDTO>(`/api/stocks/${edit._id}`, payload);
        setList((prev) => prev.map((x) => (x._id === edit._id ? updated : x)));
        push({ title: 'Item updated', desc: `"${updated.itemName}" saved successfully.` });
      } else {
        const created = await api.post<StockDTO>('/api/stocks', payload);
        setList((prev) => [created, ...prev]);
        push({ title: 'Item added', desc: `"${created.itemName}" created successfully.` });
      }
      setModalOpen(false);
    } catch (e: any) {
      push({ title: 'Save failed', desc: e?.message ?? 'Request error', tone: 'err' });
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this item?')) return;
    try {
      await api.delete(`/api/stocks/${id}`);
      setList((prev) => prev.filter((x) => x._id !== id));
      push({ title: 'Item deleted' });
    } catch (e: any) {
      push({ title: 'Delete failed', desc: e?.message ?? 'Request error', tone: 'err' });
    }
  }

  async function changeQty(id: string, delta: number) {
    try {
      const updated = await api.patch<StockDTO>(`/api/stocks/${id}/quantity`, { delta });
      setList((prev) => prev.map((x) => (x._id === id ? updated : x)));
    } catch (e: any) {
      push({ title: 'Quantity update failed', desc: e?.message ?? 'Request error', tone: 'err' });
    }
  }

  const filtered = useMemo(() => {
    if (!q.trim()) return list;
    const s = q.toLowerCase();
    return list.filter((i) => i.itemName.toLowerCase().includes(s) || (i.category ?? '').toLowerCase().includes(s));
  }, [list, q]);

  // ---------- Analysis section metrics ----------
  const ANALYSIS_DAYS = 30;
  const analysis = useMemo(() => {
    const now = new Date();
    const nearCutoff = new Date(now);
    nearCutoff.setDate(now.getDate() + ANALYSIS_DAYS);

    let total = list.length;
    let low = 0;
    let expired = 0;
    let near = 0;
    const categories = new Set<string>();

    for (const r of list) {
      if (r.category) categories.add(r.category);
      if (r.quantity <= r.threshold) low++;
      if (r.expiryDate) {
        const d = new Date(r.expiryDate);
        if (d < now) expired++;
        else if (d >= now && d <= nearCutoff) near++;
      }
    }
    return {
      total,
      low,
      expired,
      near,
      categoryCount: categories.size,
    };
  }, [list]);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-sky-50 via-white to-sky-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Analysis section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow transition">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-500">Total Items</div>
              <div className="p-2 rounded-lg bg-sky-100 text-sky-700"><Boxes className="w-4 h-4" /></div>
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">{analysis.total}</div>
            <div className="text-xs text-slate-500 mt-1">{analysis.categoryCount} categories</div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm hover:shadow transition">
            <div className="flex items-center justify-between">
              <div className="text-sm text-amber-800">Low Stock</div>
              <div className="p-2 rounded-lg bg-white/70 text-amber-700"><AlertTriangle className="w-4 h-4" /></div>
            </div>
            <div className="mt-2 text-2xl font-semibold text-amber-900">{analysis.low}</div>
            <div className="text-xs text-amber-800 mt-1">Qty ≤ Min</div>
          </div>

          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-sm hover:shadow transition">
            <div className="flex items-center justify-between">
              <div className="text-sm text-rose-800">Expired</div>
              <div className="p-2 rounded-lg bg-white/70 text-rose-700"><CalendarDays className="w-4 h-4" /></div>
            </div>
            <div className="mt-2 text-2xl font-semibold text-rose-900">{analysis.expired}</div>
            <div className="text-xs text-rose-800 mt-1">Past expiry</div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm hover:shadow transition">
            <div className="flex items-center justify-between">
              <div className="text-sm text-emerald-800">Expiring Soon</div>
              <div className="p-2 rounded-lg bg-white/70 text-emerald-700"><CalendarDays className="w-4 h-4" /></div>
            </div>
            <div className="mt-2 text-2xl font-semibold text-emerald-900">{analysis.near}</div>
            <div className="text-xs text-emerald-800 mt-1">Within {ANALYSIS_DAYS} days</div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-100 text-sky-700">
              <Package className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
          </div>
          <button
            onClick={openCreate}
            className="px-3 py-2 rounded-lg bg-gradient-to-r from-sky-600 to-indigo-600 text-white border border-indigo-500 hover:shadow transition inline-flex items-center gap-2"
          >
            <Package className="h-4 w-4" /> Add Item
          </button>
        </div>

        <div className="mb-4 relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search item or category…"
            className="w-full border rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-300"
          />
        </div>

        <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200 shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Item</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Qty</th>
                <th className="px-4 py-3 text-left">Min</th>
                <th className="px-4 py-3 text-left">Unit</th>
                <th className="px-4 py-3 text-left">Expiry</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const low = row.quantity <= row.threshold;
                return (
                  <tr key={row._id} className="border-t hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-900">{row.itemName}</td>
                    <td className="px-4 py-3">{row.category || '-'}</td>
                    <td className="px-4 py-3 tabular-nums">{row.quantity}</td>
                    <td className="px-4 py-3 tabular-nums">{row.threshold}</td>
                    <td className="px-4 py-3">{row.unit || '-'}</td>
                    <td className="px-4 py-3">
                      {row.expiryDate ? new Date(row.expiryDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => changeQty(row._id, -1)}
                          className="border rounded-lg px-2 py-1 hover:bg-slate-50 transition"
                          title="Decrease by 1"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => changeQty(row._id, +1)}
                          className="border rounded-lg px-2 py-1 hover:bg-slate-50 transition"
                          title="Increase by 1"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEdit(row)}
                          className="border rounded-lg px-3 py-1 hover:bg-slate-50 transition inline-flex items-center gap-1"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" /> Edit
                        </button>
                        <button
                          onClick={() => remove(row._id)}
                          className="border rounded-lg px-3 py-1 text-rose-700 border-rose-200 bg-rose-50 hover:bg-rose-100 transition inline-flex items-center gap-1"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" /> Delete
                        </button>
                        {low && (
                          <span className="inline-flex items-center text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg text-xs gap-1">
                            <AlertTriangle className="h-4 w-4" /> Low
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-gray-500" colSpan={7}>
                    No items.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td className="px-4 py-8 text-center text-gray-400" colSpan={7}>
                    Loading…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Modal
          open={modalOpen}
          title={edit ? 'Edit Item' : 'Add Item'}
          onClose={() => setModalOpen(false)}
          onSubmit={submit}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex flex-col text-sm">
              <span className="text-gray-600 mb-1">Item Name</span>
              <input
                className={`border rounded-lg px-3 py-2 ${fieldErrors.itemName ? 'border-rose-300' : ''}`}
                value={form.itemName || ''}
                onChange={(e) => setForm((f) => ({ ...f, itemName: e.target.value }))}
                placeholder="e.g., Item Name"
              />
              {fieldErrors.itemName && <span className="text-rose-600 text-xs mt-1">{fieldErrors.itemName}</span>}
            </label>

            <label className="flex flex-col text-sm">
              <span className="text-gray-600 mb-1">Category</span>
              <input
                className="border rounded-lg px-3 py-2"
                value={form.category || ''}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value || null }))}
                placeholder="e.g., Category"
              />
            </label>

            {/* Unit as dropdown (5 options) */}
            <label className="flex flex-col text-sm">
              <span className="text-gray-600 mb-1">Unit</span>
              <select
                className={`border rounded-lg px-3 py-2 ${fieldErrors.unit ? 'border-rose-300' : ''}`}
                value={form.unit || ''}
                onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value || null }))}
              >
                {/* Ensure current unit is selectable even if not in defaults */}
                {!UNIT_OPTIONS.includes((form.unit || '').toString()) && form.unit ? (
                  <option value={form.unit}>{form.unit}</option>
                ) : null}
                {UNIT_OPTIONS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
              {fieldErrors.unit && <span className="text-rose-600 text-xs mt-1">{fieldErrors.unit}</span>}
            </label>

            <label className="flex flex-col text-sm">
              <span className="text-gray-600 mb-1">Quantity</span>
              <input
                type="number"
                className={`border rounded-lg px-3 py-2 ${fieldErrors.quantity ? 'border-rose-300' : ''}`}
                value={form.quantity ?? 0}
                onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
                min={0}
              />
              {fieldErrors.quantity && <span className="text-rose-600 text-xs mt-1">{fieldErrors.quantity}</span>}
            </label>

            <label className="flex flex-col text-sm">
              <span className="text-gray-600 mb-1">Minimum (threshold)</span>
              <input
                type="number"
                className={`border rounded-lg px-3 py-2 ${fieldErrors.threshold ? 'border-rose-300' : ''}`}
                value={form.threshold ?? 0}
                onChange={(e) => setForm((f) => ({ ...f, threshold: Number(e.target.value) }))}
                min={0}
              />
              {fieldErrors.threshold && <span className="text-rose-600 text-xs mt-1">{fieldErrors.threshold}</span>}
            </label>

            <label className="flex flex-col text-sm md:col-span-2">
              <span className="text-gray-600 mb-1">Expiry (optional)</span>
              <input
                type="date"
                className="border rounded-lg px-3 py-2"
                value={form.expiryDate ? form.expiryDate.substring(0, 10) : ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    expiryDate: e.target.value ? new Date(e.target.value).toISOString() : null,
                  }))
                }
              />
              <span className="text-xs text-slate-500 mt-1">
                Leave empty if the item doesn&apos;t expire.
              </span>
            </label>
          </div>

          {/* Visual disable on submit while saving */}
          <style>{`
            button[type="submit"] { ${saving ? 'opacity: 0.7; pointer-events: none;' : ''} }
          `}</style>
        </Modal>
      </div>

      {/* Toasts */}
      <ToastStack toasts={toasts} />
    </div>
  );
}
