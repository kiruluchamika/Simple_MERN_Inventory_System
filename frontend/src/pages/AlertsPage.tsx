// src/pages/AlertsPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { StockDTO } from "../types/dto";
import {
  AlertTriangle,
  Clock,
  PackageX,
  RefreshCcw,
  CalendarClock,
  Info,
} from "lucide-react";

/* ----------------------- Types ----------------------- */
type LowRes = { count: number; items: StockDTO[] };
type ExpRes = { nearDays: number; nearExpiry: StockDTO[]; expired: StockDTO[] };

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
              <Info className="w-5 h-5 text-sky-600" />
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
function fmtDate(d?: string | null) {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString();
}

function StatBadge({
  color,
  children,
}: {
  color: "amber" | "rose" | "sky" | "emerald";
  children: React.ReactNode;
}) {
  const map: Record<string, string> = {
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    sky: "bg-sky-50 text-sky-700 border-sky-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border ${map[color]}`}
    >
      {children}
    </span>
  );
}

/* ----------------------- Page ----------------------- */
export default function AlertsPage() {
  const [low, setLow] = useState<LowRes | null>(null);
  const [exp, setExp] = useState<ExpRes | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const { toasts, push } = useToasts();

  const lowItems = low?.items ?? [];
  const nearItems = exp?.nearExpiry ?? [];
  const expiredItems = exp?.expired ?? [];

  async function load(showToast = false) {
    try {
      setLoading(true);
      const [l, e] = await Promise.all([
        api.get<LowRes>("/api/alerts/low-stock"),
        api.get<ExpRes>(`/api/alerts/expiry?days=${days}`),
      ]);
      setLow(l);
      setExp(e);
      if (showToast) {
        push({
          title: "Alerts refreshed",
          desc: `Window: ${e.nearDays} day(s) • ${l.count} low, ${e.nearExpiry.length} near, ${e.expired.length} expired`,
        });
      }
    } catch (err: any) {
      push({
        title: "Failed to load alerts",
        desc: err?.message ?? "Network error",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  // Sorted views for nicer UX
  const sortedLow = useMemo(
    () =>
      [...lowItems].sort((a, b) => {
        // sort by ratio quantity/threshold asc (most critical first)
        const ra = (a.quantity ?? 0) / (a.threshold || 1);
        const rb = (b.quantity ?? 0) / (b.threshold || 1);
        return ra - rb;
      }),
    [lowItems]
  );

  const sortedNear = useMemo(
    () =>
      [...nearItems].sort(
        (a, b) =>
          new Date(a.expiryDate || 0).getTime() -
          new Date(b.expiryDate || 0).getTime()
      ),
    [nearItems]
  );

  const sortedExpired = useMemo(
    () =>
      [...expiredItems].sort(
        (a, b) =>
          new Date(a.expiryDate || 0).getTime() -
          new Date(b.expiryDate || 0).getTime()
      ),
    [expiredItems]
  );

  const Box = ({
    title,
    icon,
    tone,
    rows,
  }: {
    title: string;
    icon: React.ReactNode;
    tone: "sky" | "amber" | "rose";
    rows: StockDTO[];
  }) => {
    const accents: Record<string, string> = {
      sky: "border-sky-100 hover:shadow-sky-100/40",
      amber: "border-amber-100 hover:shadow-amber-100/40",
      rose: "border-rose-100 hover:shadow-rose-100/40",
    };
    return (
      <div
        className={`relative overflow-hidden bg-white rounded-2xl border shadow-sm transition-all duration-200 hover:shadow ${accents[tone]}`}
      >
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full blur-2xl opacity-60 bg-slate-100" />
        <div className="px-5 py-4 border-b bg-white/60 backdrop-blur-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">{icon}</div>
            <div className="font-semibold text-slate-900">{title}</div>
            <StatBadge color={tone === "rose" ? "rose" : tone === "amber" ? "amber" : "sky"}>
              {rows.length} item{rows.length === 1 ? "" : "s"}
            </StatBadge>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">None</div>
        ) : (
          <ul className="divide-y">
            {rows.map((r) => {
              const ratio =
                r.threshold && r.threshold > 0
                  ? Math.min(1, Math.max(0, (r.quantity ?? 0) / r.threshold))
                  : 1;
              return (
                <li
                  key={r._id}
                  className="p-4 flex items-center justify-between hover:bg-slate-50/60 transition"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900 truncate">
                      {r.itemName}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Qty {r.quantity} / Min {r.threshold}
                      {r.unit ? ` · ${r.unit}` : ""}
                    </div>
                    {/* tiny progress for low stock */}
                    {title.startsWith("Low") && (
                      <div className="mt-2 h-2 w-44 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-500 transition-[width] duration-500"
                          style={{ width: `${Math.round(ratio * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-1 shrink-0">
                    {r.expiryDate ? (
                      <>
                        <CalendarClock className="w-4 h-4" />
                        {fmtDate(r.expiryDate)}
                      </>
                    ) : (
                      <span className="italic">—</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-sky-50 via-white to-sky-50">
      {/* Header */}
      <div className="border-b border-sky-100/70 bg-white/70 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-100 text-sky-700">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">
              Alerts
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600 hidden sm:block">
              Expiry window (days)
            </label>
            <input
              type="number"
              min={1}
              className="border border-slate-200 rounded-lg px-3 py-2 w-24 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-300"
              value={days}
              onChange={(e) => setDays(Number(e.target.value || 30))}
            />
            <button
              onClick={() => load(true)}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg
                bg-gradient-to-r from-sky-600 to-indigo-600 text-white border border-indigo-500
                shadow-sm hover:shadow transition-all duration-200 disabled:opacity-60"
            >
              <RefreshCcw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading && !low && !exp ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Box
              title="Low stock"
              icon={<PackageX className="w-5 h-5" />}
              tone="amber"
              rows={sortedLow}
            />
            <Box
              title={`Near expiry (≤ ${exp?.nearDays ?? days} days)`}
              icon={<Clock className="w-5 h-5" />}
              tone="sky"
              rows={sortedNear}
            />
            <Box
              title="Expired"
              icon={<AlertTriangle className="w-5 h-5" />}
              tone="rose"
              rows={sortedExpired}
            />
          </div>
        )}

        {/* Quick stats footer */}
        {(low || exp) && (
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <StatBadge color="sky">
              <Clock className="w-4 h-4" />
              Window: {exp?.nearDays ?? days} days
            </StatBadge>
            <StatBadge color="amber">
              <PackageX className="w-4 h-4" />
              Low: {low?.count ?? 0}
            </StatBadge>
            <StatBadge color="emerald">
              <CalendarClock className="w-4 h-4" />
              Near: {exp?.nearExpiry.length ?? 0}
            </StatBadge>
            <StatBadge color="rose">
              <AlertTriangle className="w-4 h-4" />
              Expired: {exp?.expired.length ?? 0}
            </StatBadge>
          </div>
        )}
      </div>

      {/* Toasts */}
      <ToastStack toasts={toasts} />
    </div>
  );
}

/* Tailwind keyframes for the toast pop-in */
declare global {
  interface CSSStyleDeclaration {}
}
