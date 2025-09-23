import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { SupplierDTO, SupplierUpsert, clean } from '../types/dto';
import Modal from '../components/Modal';
import {
  Users,
  Building2,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  Trash2,
  Pencil,
  Search,
} from 'lucide-react';

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

export default function SuppliersPage() {
  const [list, setList] = useState<SupplierDTO[]>([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<SupplierDTO | null>(null);
  const [form, setForm] = useState<SupplierUpsert>({
    name: '',
    email: '',
    phone: '',
    company: '',
    status: 'active',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [q, setQ] = useState('');

  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    status?: string;
  }>({});

  const { toasts, push } = useToasts();

  async function load() {
    setError('');
    try {
      setList(await api.get<SupplierDTO[]>('/api/suppliers'));
    } catch (e: any) {
      setList([]);
      setError(e?.message || 'Failed to load suppliers');
      push({ title: 'Failed to load suppliers', desc: e?.message ?? 'Network error', tone: 'err' });
    }
  }
  useEffect(() => { load(); }, []);

  function openCreate() {
    setEdit(null);
    setForm({ name:'', email:'', phone:'', company:'', status:'active' });
    setFieldErrors({});
    setOpen(true);
  }
  function openEdit(row: SupplierDTO) {
    setEdit(row);
    setForm({
      name: row.name, email: row.email, phone: row.phone, company: row.company, status: row.status,
      address: row.address, products: row.products || []
    });
    setFieldErrors({});
    setOpen(true);
  }

  // ---------- Validations ----------
  function validate(): boolean {
    const errs: typeof fieldErrors = {};
    if (!form.name?.trim()) errs.name = 'Name is required.';

    if (form.email?.trim()) {
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
      if (!emailOk) errs.email = 'Enter a valid email.';
    }

    if (form.phone?.trim()) {
      const digits = (form.phone + '').replace(/[^\d+]/g, '');
      if (digits.replace(/\D/g, '').length < 7) errs.phone = 'Enter a valid phone number.';
    }

    if (!form.status || !['active', 'inactive', 'pending'].includes(form.status as any)) {
      errs.status = 'Select a valid status.';
    }

    if (form.company && form.company.length > 80) {
      errs.company = 'Company name is too long (max 80).';
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function submit() {
    if (!validate()) return;
    try {
      setSaving(true);
      const payload = clean(form);
      if (edit) {
        const updated = await api.put<SupplierDTO>(`/api/suppliers/${edit._id}`, payload);
        setList(prev => prev.map(x => x._id === edit._id ? updated : x));
        push({ title: 'Supplier updated', desc: `"${updated.name}" saved successfully.` });
      } else {
        const created = await api.post<SupplierDTO>('/api/suppliers', payload);
        setList(prev => [created, ...prev]);
        push({ title: 'Supplier added', desc: `"${created.name}" created successfully.` });
      }
      setOpen(false);
    } catch (e: any) {
      push({ title: 'Save failed', desc: e?.message ?? 'Request error', tone: 'err' });
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this supplier?')) return;
    try {
      await api.delete(`/api/suppliers/${id}`);
      setList(prev => prev.filter(x => x._id !== id));
      push({ title: 'Supplier deleted' });
    } catch (e: any) {
      push({ title: 'Delete failed', desc: e?.message ?? 'Request error', tone: 'err' });
    }
  }

  // ---------- Analysis ----------
  const analysis = useMemo(() => {
    const total = list.length;
    const byStatus = { active: 0, inactive: 0, pending: 0 } as Record<string, number>;
    let missingEmail = 0;
    let missingPhone = 0;
    for (const s of list) {
      const st = (s.status || 'active').toLowerCase();
      if (byStatus[st] != null) byStatus[st]++;
      if (!s.email) missingEmail++;
      if (!s.phone) missingPhone++;
    }
    return { total, byStatus, missingEmail, missingPhone };
  }, [list]);

  const filtered = useMemo(() => {
    if (!q.trim()) return list;
    const s = q.toLowerCase();
    return list.filter((i) =>
      (i.name || '').toLowerCase().includes(s) ||
      (i.company || '').toLowerCase().includes(s) ||
      (i.email || '').toLowerCase().includes(s) ||
      (i.phone || '').toLowerCase().includes(s)
    );
  }, [list, q]);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-sky-50 via-white to-sky-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Analysis */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow transition">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-500">Total Suppliers</div>
              <div className="p-2 rounded-lg bg-sky-100 text-sky-700"><Users className="w-4 h-4" /></div>
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">{analysis.total}</div>
            <div className="text-xs text-slate-500 mt-1">Active {analysis.byStatus.active ?? 0}</div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm hover:shadow transition">
            <div className="flex items-center justify-between">
              <div className="text-sm text-emerald-800">Active</div>
              <div className="p-2 rounded-lg bg-white/70 text-emerald-700"><CheckCircle2 className="w-4 h-4" /></div>
            </div>
            <div className="mt-2 text-2xl font-semibold text-emerald-900">{analysis.byStatus.active ?? 0}</div>
            <div className="text-xs text-emerald-800 mt-1">Ready to request</div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm hover:shadow transition">
            <div className="flex items-center justify-between">
              <div className="text-sm text-amber-800">Pending</div>
              <div className="p-2 rounded-lg bg-white/70 text-amber-700"><Pencil className="w-4 h-4" /></div>
            </div>
            <div className="mt-2 text-2xl font-semibold text-amber-900">{analysis.byStatus.pending ?? 0}</div>
            <div className="text-xs text-amber-800 mt-1">Awaiting verification</div>
          </div>

          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-sm hover:shadow transition">
            <div className="flex items-center justify-between">
              <div className="text-sm text-rose-800">Inactive</div>
              <div className="p-2 rounded-lg bg-white/70 text-rose-700"><XCircle className="w-4 h-4" /></div>
            </div>
            <div className="mt-2 text-2xl font-semibold text-rose-900">{analysis.byStatus.inactive ?? 0}</div>
            <div className="text-xs text-rose-800 mt-1">Re-enable if needed</div>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-100 text-sky-700">
              <Building2 className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Suppliers</h1>
          </div>
          <button onClick={openCreate} className="px-3 py-2 rounded-lg bg-gradient-to-r from-sky-600 to-indigo-600 text-white border border-indigo-500 hover:shadow transition">
            Add Supplier
          </button>
        </div>

        {/* Search */}
        <div className="mb-4 relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, company, email, phone…"
            className="w-full border rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-300"
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200 shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Company</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s._id} className="border-t hover:bg-slate-50/50">
                  <td className="px-4 py-3">{s.name || '-'}</td>
                  <td className="px-4 py-3">{s.company || '-'}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-500" />
                      {s.email || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      {s.phone || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-lg text-xs border ${
                        (s.status || 'active') === 'active'
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                          : (s.status || 'active') === 'pending'
                          ? 'text-amber-700 bg-amber-50 border-amber-200'
                          : 'text-rose-700 bg-rose-50 border-rose-200'
                      }`}
                    >
                      {s.status || 'active'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(s)} className="border rounded-lg px-3 py-1 hover:bg-slate-50 transition inline-flex items-center gap-1">
                        <Pencil className="w-4 h-4" /> Edit
                      </button>
                      <button
                        onClick={() => remove(s._id)}
                        className="border rounded-lg px-3 py-1 text-rose-700 border-rose-200 bg-rose-50 hover:bg-rose-100 transition inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td className="px-4 py-8 text-center text-gray-500" colSpan={6}>No suppliers.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mt-4 text-sm text-red-700 border border-red-200 bg-red-50 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {/* Modal */}
        <Modal open={open} title={edit ? 'Edit Supplier' : 'Add Supplier'} onClose={() => setOpen(false)} onSubmit={submit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <label className="flex flex-col">
              <span className="text-gray-600 mb-1">Name</span>
              <input
                className={`border rounded-lg px-3 py-2 ${fieldErrors.name ? 'border-rose-300' : ''}`}
                value={form.name || ''}
                onChange={e => setForm(f => ({...f, name: e.target.value}))}
                placeholder="Supplier name"
              />
              {fieldErrors.name && <span className="text-rose-600 text-xs mt-1">{fieldErrors.name}</span>}
            </label>
            <label className="flex flex-col">
              <span className="text-gray-600 mb-1">Company</span>
              <input
                className={`border rounded-lg px-3 py-2 ${fieldErrors.company ? 'border-rose-300' : ''}`}
                value={form.company || ''}
                onChange={e => setForm(f => ({...f, company: e.target.value}))}
                placeholder="Company (optional)"
              />
              {fieldErrors.company && <span className="text-rose-600 text-xs mt-1">{fieldErrors.company}</span>}
            </label>
            <label className="flex flex-col">
              <span className="text-gray-600 mb-1">Email</span>
              <input
                type="email"
                className={`border rounded-lg px-3 py-2 ${fieldErrors.email ? 'border-rose-300' : ''}`}
                value={form.email || ''}
                onChange={e => setForm(f => ({...f, email: e.target.value}))}
                placeholder="name@example.com (optional)"
              />
              {fieldErrors.email && <span className="text-rose-600 text-xs mt-1">{fieldErrors.email}</span>}
            </label>
            <label className="flex flex-col">
              <span className="text-gray-600 mb-1">Phone</span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={10} // ✅ prevents typing more than 10 chars
                className={`border rounded-lg px-3 py-2 ${fieldErrors.phone ? 'border-rose-300' : ''}`}
                value={form.phone || ''}
                onChange={e => {
                  const value = e.target.value.replace(/\D/g, ""); // ✅ remove non-digits
                  setForm(f => ({ ...f, phone: value }));

                  // validation
                  if (value && value.length !== 10) {
                    setFieldErrors(f => ({ ...f, phone: "Phone number must be 10 digits" }));
                  } else {
                    setFieldErrors(f => ({ ...f, phone: "" }));
                  }
                }}
                placeholder="07XXXXXXXX"
              />
              {fieldErrors.phone && (
                <span className="text-rose-600 text-xs mt-1">{fieldErrors.phone}</span>
              )}
            </label>
            <label className="flex flex-col md:col-span-2">
              <span className="text-gray-600 mb-1">Status</span>
              <select
                className={`border rounded-lg px-3 py-2 ${fieldErrors.status ? 'border-rose-300' : ''}`}
                value={form.status || 'active'}
                onChange={e => setForm(f => ({...f, status: e.target.value as any}))}
              >
                <option value="active">active</option>
                <option value="inactive">inactive</option>
                <option value="pending">pending</option>
              </select>
              {fieldErrors.status && <span className="text-rose-600 text-xs mt-1">{fieldErrors.status}</span>}
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
