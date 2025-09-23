// src/pages/RequestsPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { SupplierDTO, SupplierRequestDTO, StockDTO } from '../types/dto';
import Modal from '../components/Modal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  FileText,
  Download,
  Building2,
  Mail,
  PackagePlus,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageCircle,
} from 'lucide-react';

type ItemInput = { name: string; category?: string; quantity: number; unit?: string };

/* ---------------- Tiny Toasts (success / error messages) ---------------- */
type Toast = { id: string; title: string; desc?: string };
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
      {toasts.map((t) => (
        <div
          key={t.id}
          className="w-[320px] rounded-xl border border-sky-200 bg-white/90 backdrop-blur shadow-lg p-3"
        >
          <div className="font-semibold text-gray-900">{t.title}</div>
          {t.desc ? <div className="text-xs text-gray-600 mt-0.5">{t.desc}</div> : null}
        </div>
      ))}
    </div>
  );
}
/* ----------------------------------------------------------------------- */

export default function RequestsPage() {
  const [suppliers, setSuppliers] = useState<SupplierDTO[]>([]);
  const [stocks, setStocks] = useState<StockDTO[]>([]);
  const [list, setList] = useState<SupplierRequestDTO[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>('');

  // ---- form state
  const [supplierId, setSupplierId] = useState<string>('');
  const [items, setItems] = useState<ItemInput[]>([{ name: '', category: '', quantity: 1, unit: 'pieces' }]);
  const [notes, setNotes] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [saving, setSaving] = useState(false);

  // ---- validation state
  const [fieldErrors, setFieldErrors] = useState<{
    supplierId?: string;
    items?: Array<{ name?: string; quantity?: string; unit?: string; category?: string }>;
    notes?: string;
  }>({});

  const { toasts, push } = useToasts();

  async function load() {
    setError('');
    try {
      const [ss, rr, st] = await Promise.all([
        api.get<SupplierDTO[]>('/api/suppliers'),
        api.get<SupplierRequestDTO[]>('/api/requests'),
        api.get<StockDTO[]>('/api/stocks'),
      ]);
      setSuppliers(ss || []);
      setList((rr || []).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));
      setStocks(st || []);
    } catch (e: any) {
      setSuppliers([]); setList([]); setStocks([]);
      setError(e?.message || 'Failed to load requests');
    }
  }
  useEffect(() => { load(); }, []);

  function openCreate() {
    setSupplierId('');
    setItems([{ name: '', category: '', quantity: 1, unit: 'pieces' }]);
    setNotes(''); setSendEmail(true);
    setFieldErrors({});
    setOpen(true);
  }

  // ---------- Validations ----------
  function validate(): boolean {
    const errs: typeof fieldErrors = {};
    if (!supplierId) {
      errs.supplierId = 'Please select a supplier.';
    }

    const itemErrs = items.map((it) => {
      const e: { name?: string; quantity?: string; unit?: string; category?: string } = {};
      if (!it.name?.trim()) e.name = 'Item is required.';
      if (it.quantity == null || Number.isNaN(it.quantity)) e.quantity = 'Quantity is required.';
      else if (it.quantity <= 0) e.quantity = 'Quantity must be greater than 0.';
      else if (!Number.isInteger(Number(it.quantity))) e.quantity = 'Quantity must be an integer.';
      if (!it.unit?.trim()) e.unit = 'Unit is required.';
      if (it.category && it.category.length > 40) e.category = 'Category is too long (max 40).';
      return e;
    });

    // at least one item and no completely empty rows
    if (items.length === 0) {
      errs.items = [{ name: 'Add at least one item.' }];
    } else if (items.some((it) => !it.name && !it.quantity && !it.unit)) {
      errs.items = (errs.items || []);
      errs.items[0] = { ...(errs.items[0] || {}), name: 'Remove empty item rows.' };
    }

    // duplicate item names warning (not blocking)
    const names = items.map((i) => i.name.trim()).filter(Boolean);
    const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
    if (duplicates.length) {
      errs.items = itemErrs.map((e, idx) =>
        names.indexOf(items[idx].name.trim()) !== idx ? { ...e, name: 'Duplicate item name.' } : e
      );
    } else {
      errs.items = itemErrs;
    }

    if (notes && notes.length > 500) {
      errs.notes = 'Notes must be 500 characters or less.';
    }

    const hasItemError = (errs.items || []).some((e) => Object.keys(e).length > 0);
    if (!hasItemError) delete errs.items;

    setFieldErrors(errs);

    return Object.keys(errs).length === 0;
  }

  async function submit() {
    if (!validate()) return;
    try {
      setSaving(true);
      const created = await api.post<SupplierRequestDTO>('/api/requests', {
        supplier: supplierId,
        items,
        notes: notes || undefined,
        sendEmail,
      });
      setList(prev => [created, ...prev]);
      setOpen(false);

      // Auto-refresh after adding request (ensures latest server state)
      await load();

      // Success message
      push({ title: 'Request submitted successfully', desc: 'Your supplier request has been created.' });

      // Optional: if user checked "send email", we keep backend behavior; user can also use quick actions on the row (Email / WhatsApp)
    } catch (e: any) {
      push({ title: 'Failed to submit request', desc: e?.message ?? 'Network error' });
    } finally {
      setSaving(false);
    }
  }

  // ---------- Helpers ----------
  function prettySupplier(s: SupplierRequestDTO['supplier']): { name: string; company?: string; email?: string; phone?: string } {
    if (s && typeof s === 'object') {
      const anyS = s as any;
      return {
        name: anyS.name ?? 'Unnamed',
        company: anyS.company ?? '',
        email: anyS.email ?? anyS.contactEmail ?? '',
        phone: anyS.phone ?? anyS.contactNumber ?? anyS.mobile ?? anyS.whatsapp ?? ''
      };
    }
    return { name: '-', company: '', email: '', phone: '' };
  }

  function statusBadge(status?: string) {
    const st = (status || 'draft').toUpperCase();
    const tone =
      st === 'APPROVED' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
      st === 'REJECTED' ? 'text-rose-700 bg-rose-50 border-rose-200' :
      st === 'SENT'     ? 'text-sky-700 bg-sky-50 border-sky-200' :
      'text-amber-700 bg-amber-50 border-amber-200';
    const Icon =
      st === 'APPROVED' ? CheckCircle2 :
      st === 'REJECTED' ? AlertCircle :
      st === 'SENT' ? Mail :
      Clock;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs border ${tone}`}>
        <Icon className="w-3.5 h-3.5" />
        {st}
      </span>
    );
  }

  /* --------- “Efficient” Email + WhatsApp compose helpers (per row) --------- */
  function itemsAsLines(r: SupplierRequestDTO) {
    return (r.items ?? [])
      .map(i => `• ${i.name}${i.category ? ` [${i.category}]` : ''} ×${i.quantity}${i.unit ? ` ${i.unit}` : ''}`)
      .join('%0A'); // line breaks for URL
  }

  function buildEmailLink(r: SupplierRequestDTO) {
    const ps = prettySupplier(r.supplier);
    const subject = encodeURIComponent(`Supply Request from Golden Grain Mill`);
    const greeting = ps.name && ps.name !== '-' ? `Dear ${ps.name},%0A%0A` : '';
    const bodyPlain =
      `${greeting}` +
      `Please find the supply request details below:%0A%0A` +
      `${itemsAsLines(r)}%0A%0A` +
      `${r.notes ? `Notes: ${encodeURIComponent(r.notes)}%0A%0A` : ''}` +
      `Thank you.%0AGolden Grain Mill`;
    const to = encodeURIComponent(ps.email || '');
    return `mailto:${to}?subject=${subject}&body=${bodyPlain}`;
  }

  function normalizePhoneRaw(p?: string) {
    if (!p) return '';
    const digits = (p + '').replace(/[^\d+]/g, '');
    // if starts with 0 and length 10 (LK local), convert to +94
    if (/^0\d{9}$/.test(digits)) return `+94${digits.slice(1)}`;
    return digits;
  }

  function buildWhatsAppLink(r: SupplierRequestDTO) {
    const ps = prettySupplier(r.supplier);
    const phone = normalizePhoneRaw(ps.phone);
    const text =
      `Supply request from Golden Grain Mill:%0A%0A` +
      `${itemsAsLines(r)}%0A%0A` +
      `${r.notes ? `Notes: ${encodeURIComponent(r.notes)}%0A%0A` : ''}` +
      `Thank you.`;
    // use wa.me for universal handling
    return phone ? `https://wa.me/${encodeURIComponent(phone.replace(/^\+/, ''))}?text=${text}` : `https://wa.me/?text=${text}`;
  }

  // ---------- Report Generation ----------
  const statusCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of list) {
      const key = (r.status || 'DRAFT').toUpperCase();
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [list]);

  async function toDataUrl(url: string): Promise<string> {
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      const blob = await res.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      return '';
    }
  }

  async function generateReport() {
    try {
      const fresh = await api.get<SupplierRequestDTO[]>('/api/requests');
      const rows = (fresh || []).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt' });
      const pageWidth = doc.internal.pageSize.getWidth();

      const logo = await toDataUrl('/fav.jpg');
      if (logo) doc.addImage(logo, 'JPEG', 40, 24, 40, 40);

      let y = 36;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(30, 41, 59);
      doc.text('Inventory Project', pageWidth / 2, y, { align: 'center' });
      y += 18;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(71, 85, 105);
      doc.text('Supplier Requests Report', pageWidth / 2, y, { align: 'center' });
      y += 14;

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, y, { align: 'center' });
      y += 18;

      const startY = Math.max(y, 92);

      const counts = new Map<string, number>();
      rows.forEach(r => {
        const k = (r.status || 'DRAFT').toUpperCase();
        counts.set(k, (counts.get(k) ?? 0) + 1);
      });
      const summaryBody = [
        ['Total Requests', String(rows.length)],
        ...Array.from(counts.entries()).map(([k, v]) => [k, String(v)]),
      ];

      autoTable(doc, {
        startY,
        theme: 'grid',
        head: [['Summary', 'Value']],
        body: summaryBody,
        styles: { halign: 'left', fontSize: 10 },
        headStyles: { fillColor: '#0ea5e9', textColor: '#ffffff' },
        alternateRowStyles: { fillColor: '#f1f5f9' },
        margin: { left: 40, right: 40 },
        tableWidth: 360,
      } as any);

      const bySupplier = new Map<string, number>();
      rows.forEach(r => {
        const ps = prettySupplier(r.supplier);
        const key = `${ps.name}${ps.company ? ` — ${ps.company}` : ''}`;
        bySupplier.set(key, (bySupplier.get(key) ?? 0) + 1);
      });
      const topSup = Array.from(bySupplier.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 14,
        theme: 'grid',
        head: [['Top Suppliers', 'Requests']],
        body: topSup.length ? topSup.map(([s, c]) => [s, String(c)]) : [['—', '0']],
        styles: { halign: 'left', fontSize: 10 },
        headStyles: { fillColor: '#6366f1', textColor: '#ffffff' },
        alternateRowStyles: { fillColor: '#eef2ff' },
        margin: { left: 40, right: 40 },
        tableWidth: 360,
      } as any);

      doc.addPage('a4', 'landscape');
      autoTable(doc, {
        startY: 40,
        theme: 'grid',
        head: [['#', 'Supplier', 'Company', 'Email', 'Status', 'Created At', 'Items']],
        body: rows.map((r, idx) => {
          const ps = prettySupplier(r.supplier);
          const itemsText = (r.items || [])
            .map(i => `${i.name}${i.category ? ` [${i.category}]` : ''} x${i.quantity}${i.unit ? ` ${i.unit}` : ''}`)
            .join(', ');
          return [
            String(idx + 1),
            ps.name || '-',
            ps.company || '',
            ps.email || '',
            (r.status || 'DRAFT').toUpperCase(),
            r.createdAt ? new Date(r.createdAt).toLocaleString() : '-',
            itemsText,
          ];
        }),
        styles: { fontSize: 9, cellWidth: 'wrap' },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 120 },
          2: { cellWidth: 120 },
          3: { cellWidth: 130 },
          4: { cellWidth: 70 },
          5: { cellWidth: 110 },
          6: { cellWidth: 260 },
        },
        headStyles: { fillColor: '#111827', textColor: '#ffffff' },
        alternateRowStyles: { fillColor: '#f3f4f6' },
        margin: { left: 40, right: 40 },
      } as any);

      const ts = new Date().toISOString().slice(0, 10);
      doc.save(`supplier_requests_report_${ts}.pdf`);
    } catch (e: any) {
      alert(e?.message ?? 'Failed to generate report');
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-sky-50 via-white to-sky-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-100 text-sky-700">
              <FileText className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Requests</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={generateReport}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg
                bg-gradient-to-r from-sky-600 to-indigo-600 text-white border border-indigo-500
                shadow-sm hover:shadow transition-all duration-200"
              title="Download PDF report"
            >
              <Download className="w-4 h-4" />
              Generate Report
            </button>
            <button
              onClick={openCreate}
              className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 inline-flex items-center gap-2 transition"
            >
              <PackagePlus className="w-4 h-4" />
              New Request
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-700 border border-red-200 bg-red-50 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {/* Requests table */}
        <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200 shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Supplier</th>
                <th className="px-4 py-3 text-left">Items</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map(r => {
                const ps = prettySupplier(r.supplier);
                const emailHref = buildEmailLink(r);
                const waHref = buildWhatsAppLink(r);
                const hasEmail = !!ps.email;
                const hasPhone = !!normalizePhoneRaw(ps.phone);
                return (
                  <tr key={r._id} className="border-t hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-500" />
                        {ps.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {ps.company ? ps.company : <span className="opacity-60">—</span>}
                        {ps.email ? <> · <Mail className="inline w-3.5 h-3.5 -mt-0.5 mr-0.5" />{ps.email}</> : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-[640px] whitespace-pre-wrap text-slate-800">
                        {(r.items ?? [])
                          .map(i => `${i.name}${i.category ? ' [' + i.category + ']' : ''} x${i.quantity}${i.unit ? ' ' + i.unit : ''}`)
                          .join(', ')}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {statusBadge(r.status)}
                    </td>
                    <td className="px-4 py-3">
                      {r.createdAt ? new Date(r.createdAt).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {/* WhatsApp quick compose
                      <a
                        href={waHref}
                        target="_blank"
                        rel="noreferrer"
                        className={`inline-flex items-center gap-1 border rounded-lg px-2.5 py-1.5 mr-2 transition
                          ${hasPhone ? 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100' : 'border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed'}`}
                        title={hasPhone ? 'Send on WhatsApp' : 'Supplier has no phone/WhatsApp number'}
                        onClick={(e) => { if (!hasPhone) e.preventDefault(); }}
                      >
                        <MessageCircle className="w-4 h-4" />
                        WhatsApp
                      </a> */}

                      {/* Email quick compose */}
                      <a
                        href={emailHref}
                        className={`inline-flex items-center gap-1 border rounded-lg px-2.5 py-1.5 mr-2 transition
                          ${hasEmail ? 'border-sky-200 text-sky-700 bg-sky-50 hover:bg-sky-100' : 'border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed'}`}
                        title={hasEmail ? 'Send Email' : 'Supplier has no email'}
                        onClick={(e) => { if (!hasEmail) e.preventDefault(); }}
                      >
                        <Mail className="w-4 h-4" />
                        Email
                      </a>

                      {/* Delete */}
                      <button
                        onClick={async () => {
                          await api.delete(`/api/requests/${r._id}`);
                          setList(prev => prev.filter(x => x._id !== r._id));
                          push({ title: 'Request deleted', desc: `Request removed successfully.` });
                        }}
                        className="inline-flex items-center gap-1 border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg px-2.5 py-1.5 transition"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
              {list.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-gray-500" colSpan={5}>No requests.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Create Modal */}
        <Modal open={open} title="Create Request" onClose={() => setOpen(false)} onSubmit={submit}>
          <div className="space-y-5 text-sm">
            {/* Supplier */}
            <label className="flex flex-col">
              <span className="text-gray-600 mb-1">Supplier</span>
              <select
                className={`border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-300 ${fieldErrors.supplierId ? 'border-rose-300' : 'border-slate-300'}`}
                value={supplierId}
                onChange={e => setSupplierId(e.target.value)}
                required
              >
                <option value="">Select supplier…</option>
                {suppliers.filter((s): s is SupplierDTO => !!s && !!(s as any)._id)
                  .map(s => (
                    <option key={s._id} value={s._id}>
                      {(s.name ?? 'Unnamed')}{s.company ? ` — ${s.company}` : ''}
                    </option>
                  ))}
              </select>
              {fieldErrors.supplierId && <span className="text-rose-600 text-xs mt-1">{fieldErrors.supplierId}</span>}
            </label>

            {/* Items */}
            <div className="space-y-2">
              <div className="text-gray-600">Items</div>
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-6 gap-2 items-start">
                  <select
                    className={`border rounded-lg px-2 py-2 col-span-2 focus:outline-none focus:ring-2 focus:ring-sky-300 ${fieldErrors.items?.[idx]?.name ? 'border-rose-300' : 'border-slate-300'}`}
                    value={it.name}
                    onChange={e => {
                      const v = e.target.value;
                      const match = stocks.find(s => s.itemName === v);
                      setItems(arr => arr.map((x,i)=> i===idx? {
                        ...x,
                        name: v,
                        category: match?.category || '',
                        unit: match?.unit || x.unit
                      } : x));
                    }}
                    required
                  >
                    <option value="">Select item…</option>
                    {stocks.map(s => (
                      <option key={s._id} value={s.itemName}>{s.itemName}</option>
                    ))}
                  </select>
                  <input
                    className={`border rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-sky-300 ${fieldErrors.items?.[idx]?.category ? 'border-rose-300' : 'border-slate-300'} bg-slate-50 text-slate-500 cursor-not-allowed`}
                    placeholder="category"
                    value={it.category || ''}
                    onChange={e => {
                      const v = e.target.value;
                      setItems(arr => arr.map((x,i)=> i===idx? {...x, category:v || undefined}:x));
                    }}
                    disabled
                    readOnly
                  />
                  <input
                    type="number"
                    min={1}
                    step={1}
                    className={`border rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-sky-300 ${fieldErrors.items?.[idx]?.quantity ? 'border-rose-300' : 'border-slate-300'}`}
                    placeholder="qty"
                    value={it.quantity}
                    onChange={e => {
                      const v = Number(e.target.value || 0);
                      setItems(arr => arr.map((x,i)=> i===idx? {...x, quantity:v}:x));
                    }}
                    required
                  />
                  <input
                    className={`border rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-sky-300 ${fieldErrors.items?.[idx]?.unit ? 'border-rose-300' : 'border-slate-300'} bg-slate-50 text-slate-500 cursor-not-allowed`}
                    placeholder="unit"
                    value={it.unit || ''}
                    onChange={e => {
                      const v = e.target.value;
                      setItems(arr => arr.map((x,i)=> i===idx? {...x, unit:v || undefined}:x));
                    }}
                    disabled
                    readOnly
                  />
                  <button
                    type="button"
                    onClick={() => setItems(arr => arr.filter((_,i)=>i!==idx))}
                    className="border rounded-lg px-2 py-2 hover:bg-slate-50 transition flex items-center justify-center"
                    title="Remove"
                  >
                    Remove
                  </button>

                  {/* Item row errors */}
                  <div className="col-span-6 -mt-1 grid grid-cols-6 gap-2 text-xs text-rose-600">
                    <div className="col-span-2">{fieldErrors.items?.[idx]?.name}</div>
                    <div>{fieldErrors.items?.[idx]?.category}</div>
                    <div>{fieldErrors.items?.[idx]?.quantity}</div>
                    <div>{fieldErrors.items?.[idx]?.unit}</div>
                    <div />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setItems(arr => [...arr, { name:'', category:'', quantity:1, unit:'pieces' }])}
                className="border rounded-lg px-3 py-2 hover:bg-slate-50 transition inline-flex items-center gap-2"
              >
                + Add item
              </button>
            </div>

            {/* Notes */}
            <label className="flex flex-col">
              <span className="text-gray-600 mb-1">Notes (optional)</span>
              <textarea
                className={`border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-300 ${fieldErrors.notes ? 'border-rose-300' : 'border-slate-300'}`}
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                maxLength={500}
                placeholder="Any specific instructions for the supplier (max 500 chars)"
              />
              {fieldErrors.notes && <span className="text-rose-600 text-xs mt-1">{fieldErrors.notes}</span>}
            </label>

            {/* Send email */}
            <label className="inline-flex items-center gap-2 select-none">
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={e => setSendEmail(e.target.checked)}
              />
              <span>Send email to supplier</span>
            </label>

            {/* Submit note */}
            <div className="text-xs text-slate-500">
              By submitting, a new supplier request will be created{sendEmail ? ' and an email will be sent to the supplier.' : '.'}
            </div>
          </div>

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
