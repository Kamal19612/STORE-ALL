import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import useAuthStore from "../../store/authStore";
import { getManagerApiPrefix } from "../../services/managerApiContext";
import {
  ShoppingBag, Package, TrendingUp, Clock, CheckCircle,
  XCircle, Truck, PackageCheck, ArrowRight, RefreshCw, Eye,
} from "lucide-react";

// ── Compteur animé ──────────────────────────────────────────────────────────
function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(() => Math.round(Number(target) || 0));
  const raf = useRef(null);
  const prev = useRef(Math.round(Number(target) || 0));
  useEffect(() => {
    const next = Math.round(Number(target) || 0);
    const from = prev.current;
    if (next === from) {
      setValue(next);
      return;
    }
    prev.current = next;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(from + eased * (next - from)));
      if (p < 1) {
        raf.current = requestAnimationFrame(tick);
      } else {
        setValue(next);
      }
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return value;
}

// ── Graphe SVG avec tooltip ─────────────────────────────────────────────────
function LineChart({ data, color, valueKey = "revenue" }) {
  const [tooltip, setTooltip] = useState(null);
  if (!data || data.length === 0) return null;
  const vals = data.map((d) => Number(d[valueKey]) || 0);
  const maxV = Math.max(...vals, 1);
  const W = 280, H = 80, PAD = 8;
  const xs = vals.map((_, i) => PAD + (i / Math.max(vals.length - 1, 1)) * (W - PAD * 2));
  const ys = vals.map((v) => H - PAD - (v / maxV) * (H - PAD * 2));
  const pathD = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x} ${ys[i]}`).join(" ");
  const areaD = `${pathD} L ${xs[xs.length - 1]} ${H} L ${xs[0]} ${H} Z`;

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" style={{ height: H }}>
        <defs>
          <linearGradient id={`g-${valueKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#g-${valueKey})`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {xs.map((x, i) => (
          <circle key={i} cx={x} cy={ys[i]} r="4" fill="white" stroke={color} strokeWidth="2"
            className="cursor-pointer transition-all"
            onMouseEnter={() => setTooltip(i)}
            onMouseLeave={() => setTooltip(null)}
          />
        ))}
      </svg>
      {/* Jours */}
      <div className="flex justify-between px-1 mt-1.5">
        {data.map((d, i) => (
          <span key={i} className={`text-[9px] font-semibold transition-colors ${tooltip === i ? "text-gray-800 dark:text-white" : "text-gray-400"}`}>
            {d.date}
          </span>
        ))}
      </div>
      {/* Tooltip */}
      {tooltip !== null && (
        <div className="absolute z-10 pointer-events-none"
          style={{ left: `${(xs[tooltip] / W) * 100}%`, top: `${(ys[tooltip] / H) * 100}%`, transform: "translate(-50%, -130%)" }}>
          <div className="bg-gray-900 text-white text-[10px] px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap">
            <p className="font-bold mb-0.5">{data[tooltip].date}</p>
            <p>{valueKey === "revenue"
              ? `${Number(data[tooltip].revenue).toLocaleString()} FCFA`
              : `${data[tooltip].orders} commande(s)`}</p>
          </div>
          <div className="w-2 h-2 bg-gray-900 rotate-45 mx-auto -mt-1" />
        </div>
      )}
    </div>
  );
}

// ── Badge statut ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    PENDING:   ["En attente",   "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"],
    CONFIRMED: ["Confirmée",    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"],
    SHIPPED:   ["En livraison", "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"],
    DELIVERED: ["Livrée",       "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"],
    CANCELLED: ["Annulée",      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"],
  };
  const [label, cls] = map[status] || [status, "bg-gray-100 text-gray-600"];
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
}

// ── Carte KPI animée ─────────────────────────────────────────────────────────
function KpiCard({ label, rawValue, sub, icon: Icon, iconBg, iconColor, badge, badgeCls, suffix = "", children }) {
  const animated = useCountUp(rawValue);
  return (
    <div className="bg-white dark:bg-[#242021] rounded-xl border border-gray-100 dark:border-white/10 shadow-sm p-4 sm:p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${iconBg}`}>
          <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${iconColor}`} />
        </div>
        {badge && <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${badgeCls}`}>{badge}</span>}
      </div>
      <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
      <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
        {animated.toLocaleString()}{suffix}
      </p>
      {sub && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
      {children}
    </div>
  );
}

// ── Carte CA (accent) ────────────────────────────────────────────────────────
function RevenueCard({ totalRevenue }) {
  const animated = useCountUp(Number(totalRevenue || 0));
  return (
    <div className="col-span-2 lg:col-span-1 bg-gradient-to-br from-primary to-primary/75 rounded-xl p-4 sm:p-5 shadow-lg shadow-primary/20">
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 bg-white/20 rounded-lg">
          <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
        <span className="text-[9px] font-bold uppercase tracking-wide bg-white/20 text-white px-2 py-0.5 rounded-full">
          CA réel
        </span>
      </div>
      <p className="text-xs font-medium text-white/80 mb-0.5">Chiffre d'Affaires</p>
      <p className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
        {animated.toLocaleString()}
      </p>
      <p className="text-[11px] text-white/60 mt-0.5">FCFA · Confirmées + Livrées</p>
    </div>
  );
}

// ── Carte taux de livraison ──────────────────────────────────────────────────
function DeliveryRateCard({ rate }) {
  const animated = useCountUp(rate);
  return (
    <div className="bg-white dark:bg-[#242021] rounded-xl border border-gray-100 dark:border-white/10 shadow-sm p-4 sm:p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
          <PackageCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
        </div>
        <span className="text-[9px] font-bold uppercase tracking-wide text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
          Livraison
        </span>
      </div>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">Taux de succès</p>
      <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
        {animated}%
      </p>
      <div className="mt-2 h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${rate}%` }} />
      </div>
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const storeId = useAuthStore((s) => s.user?.storeId);
  const [stats, setStats]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chartMode, setChartMode]   = useState("revenue");
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchStats = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const r = await api.get(`${getManagerApiPrefix(storeId)}/dashboard/stats`);
      setStats(r.data);
      setLastUpdated(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (storeId == null) return;
    fetchStats(false);
    const iv = setInterval(() => { if (!document.hidden) fetchStats(true); }, 30000);
    return () => clearInterval(iv);
  }, [storeId]);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-4 animate-pulse">
        <div className="h-7 w-44 bg-gray-200 dark:bg-white/10 rounded-lg" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-200 dark:bg-white/10 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-3 h-52 bg-gray-200 dark:bg-white/10 rounded-xl" />
          <div className="lg:col-span-2 h-52 bg-gray-200 dark:bg-white/10 rounded-xl" />
        </div>
        <div className="h-48 bg-gray-200 dark:bg-white/10 rounded-xl" />
      </div>
    );
  }

  if (!stats) return null;

  const activeOrders      = (stats.pendingOrders||0) + (stats.confirmedOrders||0) + (stats.shippedOrders||0);
  const totalNonCancelled = activeOrders + (stats.deliveredOrders||0);
  const conversionRate    = totalNonCancelled > 0
    ? Math.round(((stats.deliveredOrders||0) / totalNonCancelled) * 100) : 0;

  const statusRows = [
    { label: "En attente",   count: stats.pendingOrders||0,   bar: "bg-amber-400",   text: "text-amber-500",   icon: Clock },
    { label: "Confirmées",   count: stats.confirmedOrders||0, bar: "bg-blue-500",    text: "text-blue-500",    icon: CheckCircle },
    { label: "En livraison", count: stats.shippedOrders||0,   bar: "bg-purple-500",  text: "text-purple-500",  icon: Truck },
    { label: "Livrées",      count: stats.deliveredOrders||0, bar: "bg-emerald-500", text: "text-emerald-500", icon: PackageCheck },
    { label: "Annulées",     count: stats.cancelledOrders||0, bar: "bg-red-400",     text: "text-red-500",     icon: XCircle },
  ];

  const periodTotal = stats.dailyStats
    ? (chartMode === "revenue"
        ? stats.dailyStats.reduce((s, d) => s + Number(d.revenue||0), 0)
        : stats.dailyStats.reduce((s, d) => s + Number(d.orders||0), 0))
    : 0;

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-5 bg-gray-50/50 dark:bg-transparent min-h-dvh">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Tableau de bord</h1>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
            {lastUpdated
              ? `Actualisé à ${lastUpdated.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
              : "Chargement…"}
          </p>
        </div>
        <button
          onClick={() => fetchStats(false)} disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
          Actualiser
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <RevenueCard totalRevenue={stats.totalRevenue} />
        <KpiCard
          label="Commandes" rawValue={stats.totalOrders||0} sub={`${activeOrders} actives`}
          icon={ShoppingBag} iconBg="bg-blue-50 dark:bg-blue-900/20" iconColor="text-blue-500"
          badge="Total" badgeCls="text-blue-500 bg-blue-50 dark:bg-blue-900/20"
        />
        <KpiCard
          label="Produits" rawValue={stats.totalProducts||0} sub="en catalogue"
          icon={Package} iconBg="bg-purple-50 dark:bg-purple-900/20" iconColor="text-purple-500"
        />
        <DeliveryRateCard rate={conversionRate} />
      </div>

      {/* Graphe 7j + Répartition */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4">

        {/* Graphe */}
        <div className="lg:col-span-3 bg-white dark:bg-[#242021] rounded-xl border border-gray-100 dark:border-white/10 shadow-sm p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
            <h2 className="font-bold text-gray-800 dark:text-white text-sm">Activité — 7 derniers jours</h2>
            <div className="flex gap-0.5 bg-gray-100 dark:bg-white/10 rounded-lg p-0.5">
              {["revenue", "orders"].map((mode) => (
                <button key={mode} onClick={() => setChartMode(mode)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${chartMode === mode ? "bg-white dark:bg-[#242021] text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400"}`}>
                  {mode === "revenue" ? "Revenus" : "Commandes"}
                </button>
              ))}
            </div>
          </div>

          {stats.dailyStats && stats.dailyStats.length > 0 ? (
            <>
              <div className="mb-4">
                <p className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white">
                  {chartMode === "revenue"
                    ? `${periodTotal.toLocaleString()} FCFA`
                    : `${periodTotal} commande${periodTotal > 1 ? "s" : ""}`}
                </p>
                <p className="text-[11px] text-gray-400">sur les 7 derniers jours</p>
              </div>
              <LineChart
                data={stats.dailyStats}
                color={chartMode === "revenue" ? "#10b981" : "#3b82f6"}
                valueKey={chartMode}
              />
            </>
          ) : (
            <div className="h-28 flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">
              Pas encore de données sur cette période
            </div>
          )}
        </div>

        {/* Répartition statuts */}
        <div className="lg:col-span-2 bg-white dark:bg-[#242021] rounded-xl border border-gray-100 dark:border-white/10 shadow-sm p-4 sm:p-5">
          <h2 className="font-bold text-gray-800 dark:text-white text-sm mb-3">Répartition</h2>
          {/* Pipeline bar */}
          <div className="flex h-2 rounded-full overflow-hidden gap-0.5 mb-4">
            {statusRows.map((s) => {
              const pct = stats.totalOrders > 0 ? (s.count / stats.totalOrders) * 100 : 0;
              return pct > 0 ? (
                <div key={s.label} title={`${s.label}: ${s.count}`}
                  className={`${s.bar} transition-all duration-700`} style={{ width: `${pct}%` }} />
              ) : null;
            })}
          </div>
          <div className="space-y-3">
            {statusRows.map((s) => {
              const pct = stats.totalOrders > 0 ? Math.round((s.count / stats.totalOrders) * 100) : 0;
              const Icon = s.icon;
              return (
                <div key={s.label}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${s.text}`} />
                    <span className="text-xs text-gray-600 dark:text-gray-400 flex-1">{s.label}</span>
                    <span className={`text-xs font-bold ${s.text}`}>{s.count}</span>
                    <span className="text-[10px] text-gray-400 w-6 text-right">{pct}%</span>
                  </div>
                  <div className="h-1 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full ${s.bar} rounded-full transition-all duration-700`}
                      style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Commandes récentes */}
      <div className="bg-white dark:bg-[#242021] rounded-xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-gray-100 dark:border-white/10">
          <h2 className="font-bold text-gray-800 dark:text-white text-sm">Commandes récentes</h2>
          <Link to="/admin/orders" className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline">
            Tout voir <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {stats.recentOrders && stats.recentOrders.length > 0 ? (
          <div className="divide-y divide-gray-50 dark:divide-white/5">
            {stats.recentOrders.map((order) => (
              <div key={order.id} className="flex items-center gap-3 px-4 sm:px-5 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                      #{order.orderNumber?.replace("ORD-", "").slice(-6)}
                    </span>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                    {order.customerName} · {order.createdAt}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    {Number(order.total||0).toLocaleString()}
                    <span className="text-[10px] font-normal text-gray-400 ml-0.5">F</span>
                  </p>
                </div>
                <Link to={`/admin/orders/${order.id}`}
                  className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  title="Voir détail">
                  <Eye className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-gray-400">Aucune commande</div>
        )}
      </div>

    </div>
  );
};

export default AdminDashboard;
