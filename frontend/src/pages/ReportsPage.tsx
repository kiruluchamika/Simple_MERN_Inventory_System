// src/pages/ReportsPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  BarChart3,
  PackageCheck,
  AlertTriangle,
  CalendarClock,
  Download,
  Gauge,
  Layers3,
} from "lucide-react";

/* ----------------------- Types ----------------------- */
type Summary = {
  totalItems: number;
  totalsByUnit: Record<string, number>;
  lowStock: number;
  withExpiry: number;
};

/* ----------------------- Tiny Toasts ----------------------- */
type Toast = { id: string; title: string; desc?: string };
function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = (t: Omit<Toast, "id">) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, ...t }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 2800);
  };
  return { toasts, push };
}
function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed bottom-4 right-4 z-[60] space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="w-[320px] rounded-xl border border-sky-200 bg-white/90 backdrop-blur shadow-lg p-3 animate-[slideUp_0.25s_ease-out]"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <PackageCheck className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <div className="font-semibold text-gray-900">{t.title}</div>
              {t.desc ? (
                <div className="text-xs text-gray-600 mt-0.5">{t.desc}</div>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ----------------------- Helpers ----------------------- */
async function toDataUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, { cache: "no-cache" });
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}

/* ----------------------- Page ----------------------- */
export default function ReportsPage() {
  const [sum, setSum] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const { toasts, push } = useToasts();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await api.get<Summary>("/api/reports/stock-summary");
        setSum(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalsArray = useMemo(
    () =>
      Object.entries(sum?.totalsByUnit ?? {}).sort(([a], [b]) =>
        a.localeCompare(b)
      ),
    [sum]
  );

  async function generatePdf() {
    if (!sum) return;
    try {
      setDownloading(true);

      const doc = new jsPDF({ orientation: "landscape", unit: "pt" });
      const pageWidth = doc.internal.pageSize.getWidth();

      const logo = await toDataUrl("/fav.jpg"); // optional logo if present in public/
      if (logo) doc.addImage(logo, "JPEG", 40, 24, 40, 40);

      let y = 36;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(30, 41, 59);
      doc.text("Inventory Project", pageWidth / 2, y, { align: "center" });
      y += 18;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(71, 85, 105);
      doc.text("Inventory Stock Summary Report", pageWidth / 2, y, {
        align: "center",
      });
      y += 14;

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Generated on: ${new Date().toLocaleString()}`,
        pageWidth / 2,
        y,
        { align: "center" }
      );
      y += 18;

      const firstStartY = Math.max(y, 92);

      // Summary table
      autoTable(doc, {
        startY: firstStartY,
        theme: "grid",
        head: [["Summary", "Value"]],
        body: [
          ["Total Items", String(sum.totalItems)],
          ["Low Stock Items", String(sum.lowStock)],
          ["Items with Expiry", String(sum.withExpiry)],
        ],
        styles: { halign: "left", fontSize: 10 },
        headStyles: { fillColor: "#0ea5e9", textColor: "#ffffff" },
        alternateRowStyles: { fillColor: "#f1f5f9" },
        margin: { left: 40, right: 40 },
        tableWidth: 360,
      } as any);
      const afterSummaryY = (doc as any).lastAutoTable.finalY;

      // Totals by unit table
      autoTable(doc, {
        startY: afterSummaryY + 14,
        theme: "grid",
        head: [["Unit", "Total Quantity"]],
        body: totalsArray.length
          ? totalsArray.map(([unit, qty]) => [unit, String(qty)])
          : [["—", "0"]],
        styles: { halign: "left", fontSize: 10 },
        headStyles: { fillColor: "#6366f1", textColor: "#ffffff" },
        alternateRowStyles: { fillColor: "#eef2ff" },
        margin: { left: 40, right: 40 },
        tableWidth: pageWidth - 80,
      } as any);

      const ts = new Date().toISOString().slice(0, 10);
      doc.save(`inventory_stock_summary_${ts}.pdf`);

      push({
        title: "Report downloaded",
        desc: "The Inventory Stock Summary PDF has been saved.",
      });
    } catch (e: any) {
      alert(e?.message ?? "Failed to generate report");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-sky-50 via-white to-sky-50">
      {/* Header bar */}
      <div className="border-b border-sky-100/70 bg-white/70 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-100 text-sky-700">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">
              Reports
            </h1>
          </div>

          <button
            onClick={generatePdf}
            disabled={!sum || downloading}
            className="group inline-flex items-center gap-2 px-4 py-2 rounded-lg
              bg-gradient-to-r from-sky-600 to-indigo-600 text-white border border-indigo-500
              shadow-sm hover:shadow transition-all duration-200
              disabled:opacity-60 disabled:cursor-not-allowed"
            title="Download PDF report"
          >
            <Download className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
            {downloading ? "Generating…" : "Generate Report"}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-white border border-sky-100 shadow-sm">
              <div className="h-5 w-40 bg-slate-200/70 rounded animate-pulse mb-4" />
              <div className="space-y-2">
                <div className="h-4 w-56 bg-slate-200/70 rounded animate-pulse" />
                <div className="h-4 w-48 bg-slate-200/70 rounded animate-pulse" />
                <div className="h-4 w-60 bg-slate-200/70 rounded animate-pulse" />
              </div>
            </div>
            <div className="p-6 rounded-2xl bg-white border border-sky-100 shadow-sm">
              <div className="h-5 w-40 bg-slate-200/70 rounded animate-pulse mb-4" />
              <div className="space-y-2">
                <div className="h-4 w-64 bg-slate-200/70 rounded animate-pulse" />
                <div className="h-4 w-56 bg-slate-200/70 rounded animate-pulse" />
                <div className="h-4 w-52 bg-slate-200/70 rounded animate-pulse" />
              </div>
            </div>
          </div>
        ) : !sum ? (
          <div className="p-6 border border-rose-200 rounded-2xl bg-rose-50 text-rose-700">
            Failed to load summary.
          </div>
        ) : (
          <>
            {/* KPI Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div
                className="group relative overflow-hidden p-6 rounded-2xl bg-white border border-sky-100 shadow-sm
                  hover:shadow-md transition-all duration-200"
              >
                <div className="absolute -top-8 -right-8 w-28 h-28 bg-sky-100 rounded-full blur-2xl opacity-70" />
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-sky-100 text-sky-700">
                    <Layers3 className="w-5 h-5" />
                  </div>
                  <div className="text-sm font-medium text-slate-600">
                    Total Items
                  </div>
                </div>
                <div className="mt-3 text-3xl font-semibold text-slate-900 tracking-tight">
                  {sum.totalItems}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Count of distinct inventory items
                </div>
              </div>

              <div
                className="group relative overflow-hidden p-6 rounded-2xl bg-white border border-amber-100 shadow-sm
                  hover:shadow-md transition-all duration-200"
              >
                <div className="absolute -top-8 -right-8 w-28 h-28 bg-amber-100 rounded-full blur-2xl opacity-70" />
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="text-sm font-medium text-slate-600">
                    Low Stock
                  </div>
                </div>
                <div className="mt-3 text-3xl font-semibold text-slate-900 tracking-tight">
                  {sum.lowStock}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Items below threshold
                </div>
              </div>

              <div
                className="group relative overflow-hidden p-6 rounded-2xl bg-white border border-emerald-100 shadow-sm
                  hover:shadow-md transition-all duration-200"
              >
                <div className="absolute -top-8 -right-8 w-28 h-28 bg-emerald-100 rounded-full blur-2xl opacity-70" />
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                    <CalendarClock className="w-5 h-5" />
                  </div>
                  <div className="text-sm font-medium text-slate-600">
                    With Expiry
                  </div>
                </div>
                <div className="mt-3 text-3xl font-semibold text-slate-900 tracking-tight">
                  {sum.withExpiry}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Items tracked with expiry dates
                </div>
              </div>
            </div>

            {/* Detail Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div
                className="p-6 rounded-2xl bg-white border border-sky-100 shadow-sm
                  hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-sky-100 text-sky-700">
                      <Gauge className="w-5 h-5" />
                    </div>
                    <div className="font-semibold text-slate-900">
                      Stock Summary
                    </div>
                  </div>
                  <span className="text-xs text-slate-500">
                    Snapshot • {new Date().toLocaleDateString()}
                  </span>
                </div>

                <div className="text-sm text-slate-700 space-y-1">
                  <div className="flex items-center gap-2">
                    <PackageCheck className="w-4 h-4 text-sky-500" />
                    <span>Total items:&nbsp;</span>
                    <span className="font-medium text-slate-900">
                      {sum.totalItems}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Low stock items:&nbsp;</span>
                    <span className="font-medium text-slate-900">
                      {sum.lowStock}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-emerald-600" />
                    <span>Items with expiry date:&nbsp;</span>
                    <span className="font-medium text-slate-900">
                      {sum.withExpiry}
                    </span>
                  </div>
                </div>
              </div>

              <div
                className="p-6 rounded-2xl bg-white border border-sky-100 shadow-sm
                  hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-xl bg-sky-100 text-sky-700">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div className="font-semibold text-slate-900">
                    Totals by Unit
                  </div>
                </div>

                {totalsArray.length === 0 ? (
                  <div className="text-sm text-slate-500">
                    No unit totals available.
                  </div>
                ) : (
                  <ul className="text-sm text-slate-700 space-y-2">
                    {totalsArray.map(([u, n]) => (
                      <li
                        key={u}
                        className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 hover:bg-slate-50 transition"
                      >
                        <span className="font-medium">{u}</span>
                        <span className="tabular-nums">{n}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Bottom CTA */}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  generatePdf();
                }}
                disabled={!sum || downloading}
                className="group inline-flex items-center gap-2 px-4 py-2 rounded-lg
                  bg-gradient-to-r from-sky-600 to-indigo-600 text-white border border-indigo-500
                  shadow-sm hover:shadow transition-all duration-200
                  disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
                {downloading ? "Generating…" : "Download PDF"}
              </button>
              <span className="text-xs text-slate-500">
                Includes KPIs &amp; totals by unit
              </span>
            </div>
          </>
        )}
      </div>

      {/* Toasts */}
      <ToastStack toasts={toasts} />
    </div>
  );
}

/* Tailwind keyframes for the toast pop-in */
declare global {
  interface CSSStyleDeclaration {
    // silence TS complaints for arbitrary animation names
  }
}
