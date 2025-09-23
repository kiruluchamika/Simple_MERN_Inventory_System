import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { SupplierDTO, SupplierUpsert, clean } from '../types/dto';
import Modal from '../components/Modal';

export default function SuppliersPage() {
  const [list, setList] = useState<SupplierDTO[]>([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<SupplierDTO | null>(null);
  const [form, setForm] = useState<SupplierUpsert>({ name: '', email: '', phone: '', company: '', status: 'active' });

  async function load() {
    setList(await api.get<SupplierDTO[]>('/api/suppliers'));
  }
  useEffect(() => { load(); }, []);

  function openCreate() { setEdit(null); setForm({ name:'', email:'', phone:'', company:'', status:'active' }); setOpen(true); }
  function openEdit(row: SupplierDTO) {
    setEdit(row);
    setForm({
      name: row.name, email: row.email, phone: row.phone, company: row.company, status: row.status,
      address: row.address, products: row.products || []
    });
    setOpen(true);
  }

  async function submit() {
    const payload = clean(form);
    if (edit) {
      const updated = await api.put<SupplierDTO>(`/api/suppliers/${edit._id}`, payload);
      setList(prev => prev.map(x => x._id === edit._id ? updated : x));
    } else {
      const created = await api.post<SupplierDTO>('/api/suppliers', payload);
      setList(prev => [created, ...prev]);
    }
    setOpen(false);
  }

  async function remove(id: string) {
    if (!confirm('Delete this supplier?')) return;
    await api.delete(`/api/suppliers/${id}`);
    setList(prev => prev.filter(x => x._id !== id));
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Suppliers</h1>
        <button onClick={openCreate} className="px-3 py-2 rounded-lg bg-blue-600 text-white">Add Supplier</button>
      </div>

      <div className="overflow-x-auto bg-white rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
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
            {list.map(s => (
              <tr key={s._id} className="border-t">
                <td className="px-4 py-3">{s.name}</td>
                <td className="px-4 py-3">{s.company}</td>
                <td className="px-4 py-3">{s.email}</td>
                <td className="px-4 py-3">{s.phone}</td>
                <td className="px-4 py-3">{s.status}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(s)} className="border rounded px-3 py-1">Edit</button>
                    <button onClick={() => remove(s._id)} className="border rounded px-3 py-1 text-red-600">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td className="px-4 py-8 text-center text-gray-500" colSpan={6}>No suppliers.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={open} title={edit ? 'Edit Supplier' : 'Add Supplier'} onClose={() => setOpen(false)} onSubmit={submit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <label className="flex flex-col">
            <span className="text-gray-600 mb-1">Name</span>
            <input className="border rounded-lg px-3 py-2" value={form.name || ''} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
          </label>
          <label className="flex flex-col">
            <span className="text-gray-600 mb-1">Company</span>
            <input className="border rounded-lg px-3 py-2" value={form.company || ''} onChange={e => setForm(f => ({...f, company: e.target.value}))} />
          </label>
          <label className="flex flex-col">
            <span className="text-gray-600 mb-1">Email</span>
            <input type="email" className="border rounded-lg px-3 py-2" value={form.email || ''} onChange={e => setForm(f => ({...f, email: e.target.value}))} />
          </label>
          <label className="flex flex-col">
            <span className="text-gray-600 mb-1">Phone</span>
            <input className="border rounded-lg px-3 py-2" value={form.phone || ''} onChange={e => setForm(f => ({...f, phone: e.target.value}))} />
          </label>
          <label className="flex flex-col md:col-span-2">
            <span className="text-gray-600 mb-1">Status</span>
            <select className="border rounded-lg px-3 py-2" value={form.status || 'active'} onChange={e => setForm(f => ({...f, status: e.target.value as any}))}>
              <option value="active">active</option>
              <option value="inactive">inactive</option>
              <option value="pending">pending</option>
            </select>
          </label>
        </div>
      </Modal>
    </div>
  );
}
