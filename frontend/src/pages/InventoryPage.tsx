import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Minus, Package, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api';
import { StockDTO, StockUpsert, clean } from '../types/dto';
import Modal from '../components/Modal';

export default function InventoryPage() {
  const [list, setList] = useState<StockDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [edit, setEdit] = useState<StockDTO | null>(null);
  const [form, setForm] = useState<StockUpsert>({ itemName: '', quantity: 0, threshold: 0, unit: 'pieces' });

  async function load() {
    setLoading(true);
    try { setList(await api.get<StockDTO[]>('/api/stocks')); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  function openCreate() {
    setEdit(null);
    setForm({ itemName: '', quantity: 0, threshold: 0, unit: 'pieces' });
    setModalOpen(true);
  }
  function openEdit(row: StockDTO) {
    setEdit(row);
    setForm({
      itemName: row.itemName,
      quantity: row.quantity,
      threshold: row.threshold,
      unit: row.unit ?? 'pieces',
      expiryDate: row.expiryDate ?? null,
      // category/supplierId optional
    });
    setModalOpen(true);
  }

  async function submit() {
    if (!form.itemName || form.quantity == null || form.threshold == null) return;
    const payload = clean(form);
    if (edit) {
      const updated = await api.put<StockDTO>(`/api/stocks/${edit._id}`, payload);
      setList(prev => prev.map(x => x._id === edit._id ? updated : x));
    } else {
      const created = await api.post<StockDTO>('/api/stocks', payload);
      setList(prev => [created, ...prev]);
    }
    setModalOpen(false);
  }

  async function remove(id: string) {
    if (!confirm('Delete this item?')) return;
    await api.delete(`/api/stocks/${id}`);
    setList(prev => prev.filter(x => x._id !== id));
  }

  async function changeQty(id: string, delta: number) {
    const updated = await api.patch<StockDTO>(`/api/stocks/${id}/quantity`, { delta });
    setList(prev => prev.map(x => x._id === id ? updated : x));
  }

  const filtered = useMemo(() => {
    if (!q.trim()) return list;
    const s = q.toLowerCase();
    return list.filter(i => i.itemName.toLowerCase().includes(s));
  }, [list, q]);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Inventory</h1>
        <button onClick={openCreate} className="px-3 py-2 rounded-lg bg-blue-600 text-white flex items-center gap-2">
          <Package className="h-4 w-4" /> Add Item
        </button>
      </div>

      <div className="mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search item..."
          className="w-full md:w-80 border rounded-lg px-3 py-2"
        />
      </div>

      <div className="overflow-x-auto bg-white rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left">Item</th>
              <th className="px-4 py-3 text-left">Qty</th>
              <th className="px-4 py-3 text-left">Min</th>
              <th className="px-4 py-3 text-left">Unit</th>
              <th className="px-4 py-3 text-left">Expiry</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(row => {
              const low = row.quantity <= row.threshold;
              return (
                <tr key={row._id} className="border-t">
                  <td className="px-4 py-3">{row.itemName}</td>
                  <td className="px-4 py-3">{row.quantity}</td>
                  <td className="px-4 py-3">{row.threshold}</td>
                  <td className="px-4 py-3">{row.unit || '-'}</td>
                  <td className="px-4 py-3">{row.expiryDate ? new Date(row.expiryDate).toLocaleDateString() : '-'}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <button onClick={() => changeQty(row._id, -1)} className="border rounded px-2 py-1">
                        <Minus className="h-4 w-4" />
                      </button>
                      <button onClick={() => changeQty(row._id, +1)} className="border rounded px-2 py-1">
                        <Plus className="h-4 w-4" />
                      </button>
                      <button onClick={() => openEdit(row)} className="border rounded px-3 py-1">Edit</button>
                      <button onClick={() => remove(row._id)} className="border rounded px-3 py-1 text-red-600">Delete</button>
                      {low && <span className="inline-flex items-center text-amber-600 text-xs gap-1"><AlertTriangle className="h-4 w-4" /> Low</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
            {(!loading && filtered.length === 0) && (
              <tr><td className="px-4 py-8 text-center text-gray-500" colSpan={6}>No items.</td></tr>
            )}
            {loading && (
              <tr><td className="px-4 py-8 text-center text-gray-400" colSpan={6}>Loading…</td></tr>
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
            <input className="border rounded-lg px-3 py-2" value={form.itemName || ''} onChange={e => setForm(f => ({...f, itemName: e.target.value}))} />
          </label>
          <label className="flex flex-col text-sm">
            <span className="text-gray-600 mb-1">Unit</span>
            <input className="border rounded-lg px-3 py-2" value={form.unit || ''} onChange={e => setForm(f => ({...f, unit: e.target.value || null}))} placeholder="kg / liters / pieces" />
          </label>
          <label className="flex flex-col text-sm">
            <span className="text-gray-600 mb-1">Quantity</span>
            <input type="number" className="border rounded-lg px-3 py-2" value={form.quantity ?? 0} onChange={e => setForm(f => ({...f, quantity: Number(e.target.value)}))} min={0} />
          </label>
          <label className="flex flex-col text-sm">
            <span className="text-gray-600 mb-1">Minimum (threshold)</span>
            <input type="number" className="border rounded-lg px-3 py-2" value={form.threshold ?? 0} onChange={e => setForm(f => ({...f, threshold: Number(e.target.value)}))} min={0} />
          </label>
          <label className="flex flex-col text-sm md:col-span-2">
            <span className="text-gray-600 mb-1">Expiry (optional)</span>
            <input type="date" className="border rounded-lg px-3 py-2"
              value={form.expiryDate ? form.expiryDate.substring(0,10) : ''}
              onChange={e => setForm(f => ({...f, expiryDate: e.target.value ? new Date(e.target.value).toISOString() : null}))}
            />
          </label>
        </div>
      </Modal>
    </div>
  );
}
