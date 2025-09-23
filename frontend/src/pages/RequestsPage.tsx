import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { SupplierDTO, SupplierRequestDTO, StockDTO } from '../types/dto';
import Modal from '../components/Modal';

export default function RequestsPage() {
  const [suppliers, setSuppliers] = useState<SupplierDTO[]>([]);
  const [stocks, setStocks] = useState<StockDTO[]>([]);
  const [list, setList] = useState<SupplierRequestDTO[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>('');

  const [supplierId, setSupplierId] = useState<string>('');
  const [items, setItems] = useState<{ name: string; category?: string; quantity: number; unit?: string }[]>([{ name: '', category: '', quantity: 1, unit: 'pieces' }]);
  const [notes, setNotes] = useState('');
  const [sendEmail, setSendEmail] = useState(true);

  async function load() {
    setError('');
    try {
      const [ss, rr, st] = await Promise.all([
        api.get<SupplierDTO[]>('/api/suppliers'),
        api.get<SupplierRequestDTO[]>('/api/requests'),
        api.get<StockDTO[]>('/api/stocks'),
      ]);
      setSuppliers(ss); setList(rr); setStocks(st);
    } catch (e: any) {
      setSuppliers([]); setList([]);
      setError(e?.message || 'Failed to load requests');
    }
  }
  useEffect(() => { load(); }, []);

  function openCreate() {
    setSupplierId('');
    setItems([{ name: '', category: '', quantity: 1, unit: 'pieces' }]);
    setNotes(''); setSendEmail(true);
    setOpen(true);
  }

  async function submit() {
    if (!supplierId || items.some(i => !i.name || !i.quantity)) return;
    const created = await api.post<SupplierRequestDTO>('/api/requests', {
      supplier: supplierId,
      items,
      notes: notes || undefined,
      sendEmail,
    });
    setList(prev => [created, ...prev]);
    setOpen(false);
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Requests</h1>
        <button onClick={openCreate} className="px-3 py-2 rounded-lg bg-blue-600 text-white">New Request</button>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 border border-red-200 bg-red-50 rounded px-3 py-2">
          {error}
        </div>
      )}

      <div className="overflow-x-auto bg-white rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left">Supplier</th>
              <th className="px-4 py-3 text-left">Items</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Created</th>
            </tr>
          </thead>
          <tbody>
            {list.map(r => (
              <tr key={r._id} className="border-t">
                <td className="px-4 py-3">{typeof r.supplier === 'object' ? (r.supplier as any)?.name ?? '-' : '-'}</td>
                <td className="px-4 py-3">{(r.items ?? []).map(i => `${i.name}${i.category ? ' ['+i.category+']' : ''} x${i.quantity}${i.unit ? ' ' + i.unit : ''}`).join(', ')}</td>
                <td className="px-4 py-3">{r.status || 'draft'}</td>
                <td className="px-4 py-3 flex items-center gap-2 justify-between">
                  <span>{r.createdAt ? new Date(r.createdAt).toLocaleString() : '-'}</span>
                  <button onClick={async () => { await api.delete(`/api/requests/${r._id}`); setList(prev => prev.filter(x => x._id !== r._id)); }} className="border rounded px-2 py-1 text-red-600">Delete</button>
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td className="px-4 py-8 text-center text-gray-500" colSpan={4}>No requests.</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={open} title="Create Request" onClose={() => setOpen(false)} onSubmit={submit}>
        <div className="space-y-4 text-sm">
          <label className="flex flex-col">
            <span className="text-gray-600 mb-1">Supplier</span>
            <select className="border rounded-lg px-3 py-2" value={supplierId} onChange={e => setSupplierId(e.target.value)}>
              <option value="">Select supplier…</option>
              {suppliers.filter((s): s is SupplierDTO => !!s && !!(s as any)._id)
                .map(s => (
                  <option key={s._id} value={s._id}>{s.name ?? 'Unnamed'} — {s.company ?? ''}</option>
                ))}
            </select>
          </label>

          <div className="space-y-2">
            <div className="text-gray-600">Items</div>
            {items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-6 gap-2">
                <select className="border rounded-lg px-2 py-1 col-span-2" value={it.name} onChange={e => {
                  const v = e.target.value;
                  const match = stocks.find(s => s.itemName === v);
                  setItems(arr => arr.map((x,i)=> i===idx? {
                    ...x,
                    name: v,
                    category: match?.category || '',
                    unit: match?.unit || x.unit
                  } : x));
                }}>
                  <option value="">Select item…</option>
                  {stocks.map(s => (
                    <option key={s._id} value={s.itemName}>{s.itemName}</option>
                  ))}
                </select>
                <input className="border rounded-lg px-2 py-1" placeholder="category" value={it.category || ''} onChange={e => {
                  const v = e.target.value; setItems(arr => arr.map((x,i)=> i===idx? {...x, category:v || undefined}:x));
                }} />
                <input type="number" className="border rounded-lg px-2 py-1" placeholder="qty" value={it.quantity} onChange={e => {
                  const v = Number(e.target.value || 0); setItems(arr => arr.map((x,i)=> i===idx? {...x, quantity:v}:x));
                }} />
                <input className="border rounded-lg px-2 py-1" placeholder="unit" value={it.unit || ''} onChange={e => {
                  const v = e.target.value; setItems(arr => arr.map((x,i)=> i===idx? {...x, unit:v || undefined}:x));
                }} />
                <button onClick={() => setItems(arr => arr.filter((_,i)=>i!==idx))} className="border rounded px-2 py-1">Remove</button>
              </div>
            ))}
            <button onClick={() => setItems(arr => [...arr, { name:'', category:'', quantity:1, unit:'pieces' }])} className="border rounded px-2 py-1">
              + Add item
            </button>
          </div>

          <label className="flex flex-col">
            <span className="text-gray-600 mb-1">Notes (optional)</span>
            <textarea className="border rounded-lg px-3 py-2" rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
          </label>

          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} />
            <span>Send email to supplier</span>
          </label>
        </div>
      </Modal>
    </div>
  );
}
