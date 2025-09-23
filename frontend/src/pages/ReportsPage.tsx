import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';

type Summary = {
  totalItems: number;
  totalsByUnit: Record<string, number>;
  lowStock: number;
  withExpiry: number;
};

export default function ReportsPage() {
  const [sum, setSum] = useState<Summary | null>(null);

  useEffect(() => { (async () => {
    setSum(await api.get<Summary>('/api/reports/stock-summary'));
  })(); }, []);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Reports</h1>

      {!sum ? (
        <div className="p-6 border rounded-xl bg-white text-gray-500">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 border rounded-xl bg-white">
            <div className="font-semibold mb-3">Stock Summary</div>
            <div className="text-sm text-gray-700 space-y-1">
              <div>Total items: {sum.totalItems}</div>
              <div>Low stock items: {sum.lowStock}</div>
              <div>Items with expiry date: {sum.withExpiry}</div>
            </div>
          </div>

          <div className="p-6 border rounded-xl bg-white">
            <div className="font-semibold mb-3">Totals by unit</div>
            <ul className="text-sm text-gray-700 space-y-1">
              {Object.entries(sum.totalsByUnit).map(([u, n]) => (
                <li key={u}>{u}: {n}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
