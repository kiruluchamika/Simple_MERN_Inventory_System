import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { StockDTO } from '../types/dto';

type LowRes = { count: number; items: StockDTO[] };
type ExpRes = { nearDays: number; nearExpiry: StockDTO[]; expired: StockDTO[] };

export default function AlertsPage() {
  const [low, setLow] = useState<LowRes | null>(null);
  const [exp, setExp] = useState<ExpRes | null>(null);
  const [days, setDays] = useState(30);

  async function load() {
    const [l, e] = await Promise.all([
      api.get<LowRes>('/api/alerts/low-stock'),
      api.get<ExpRes>(`/api/alerts/expiry?days=${days}`),
    ]);
    setLow(l); setExp(e);
  }
  useEffect(() => { load(); }, [days]);

  const Box = ({ title, rows }: { title: string; rows: StockDTO[] }) => (
    <div className="bg-white rounded-xl border">
      <div className="px-4 py-3 border-b font-semibold">{title} <span className="text-gray-500">({rows.length})</span></div>
      {rows.length === 0 ? <div className="p-4 text-sm text-gray-500">None</div> : (
        <ul className="divide-y">
          {rows.map(r => (
            <li key={r._id} className="p-4 flex items-center justify-between">
              <div>
                <div className="font-medium">{r.itemName}</div>
                <div className="text-xs text-gray-500">Qty {r.quantity} / Min {r.threshold} {r.unit ? `· ${r.unit}` : ''}</div>
              </div>
              <div className="text-xs text-gray-500">{r.expiryDate ? new Date(r.expiryDate).toLocaleDateString() : ''}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Alerts</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Expiry window (days)</label>
          <input type="number" min={1} className="border rounded px-2 py-1 w-20" value={days} onChange={e => setDays(Number(e.target.value || 30))} />
          <button onClick={load} className="border rounded px-3 py-1">Refresh</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Box title="Low stock" rows={low?.items || []} />
        <Box title={`Near expiry (≤ ${exp?.nearDays ?? days} days)`} rows={exp?.nearExpiry || []} />
        <Box title="Expired" rows={exp?.expired || []} />
      </div>
    </div>
  );
}
