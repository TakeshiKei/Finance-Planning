// src/pages/Reports.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

const CATS = ["needs", "wants", "debts", "savings", "invests"];

function formatIDR(n) {
  const x = Number(n || 0);
  try {
    return new Intl.NumberFormat("id-ID").format(x);
  } catch {
    return String(x);
  }
}

function cap(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

function fmtDateTimeID(dtStr) {
  if (!dtStr) return "";

  let s = String(dtStr).replace(" ", "T");
  const hasTz = /Z$|[+-]\d{2}:\d{2}$/.test(s);
  if (!hasTz) s = s + "Z";

  const d = new Date(s);

  return d.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function Card({ title, children }) {
  return (
    <div
      className="reports-card"
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 16,
        padding: 16,
        boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
      }}
    >
      <div style={{ fontWeight: 800, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

function ymd(d) {
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * Pretty BarChart (no library) - gradient + tooltip + value label.
 * data: [{ label, value, subLabel? }]
 */
function PrettyBarChart({
  data,
  height = 240,
  valuePrefix = "Rp ",
  formatValue = (v) => String(v),
  emptyText = "Belum ada data chart.",
}) {
  const [hover, setHover] = useState(null); // { i, x, y }
  const maxV = useMemo(() => Math.max(0, ...data.map((d) => Number(d.value || 0))), [data]);

  const pad = { t: 18, r: 14, b: 46, l: 14 };
  const w = 1000;
  const h = height;
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;

  const barGap = 14;
  const barW = data.length > 0 ? Math.max(18, Math.min(70, (innerW - barGap * (data.length - 1)) / data.length)) : 40;
  const totalBarsW = data.length > 0 ? barW * data.length + barGap * (data.length - 1) : 0;
  const startX = pad.l + Math.max(0, (innerW - totalBarsW) / 2);

  function yFor(v) {
    const vv = Number(v || 0);
    const t = maxV > 0 ? vv / maxV : 0;
    return pad.t + (1 - t) * innerH;
  }

  if (!data || data.length === 0) {
    return (
      <div
        style={{
          padding: 14,
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(0,0,0,0.16)",
          color: "rgba(255,255,255,0.8)",
        }}
      >
        {emptyText}
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        style={{
          width: "100%",
          height,
          display: "block",
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.12))",
        }}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="barGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(124,58,237,0.95)" />
            <stop offset="55%" stopColor="rgba(34,197,94,0.70)" />
            <stop offset="100%" stopColor="rgba(34,197,94,0.25)" />
          </linearGradient>

          <linearGradient id="barGradHot" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(239,68,68,0.95)" />
            <stop offset="60%" stopColor="rgba(245,158,11,0.60)" />
            <stop offset="100%" stopColor="rgba(245,158,11,0.20)" />
          </linearGradient>

          <filter id="softShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="rgba(0,0,0,0.35)" />
          </filter>
        </defs>

        {/* grid lines */}
        {[0.25, 0.5, 0.75].map((t, idx) => {
          const yy = pad.t + (1 - t) * innerH;
          return (
            <g key={idx}>
              <line x1={pad.l} y1={yy} x2={w - pad.r} y2={yy} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            </g>
          );
        })}

        {/* bars */}
        {data.map((d, i) => {
          const v = Number(d.value || 0);
          const x = startX + i * (barW + barGap);
          const y = yFor(v);
          const bh = pad.t + innerH - y;
          const isZero = v <= 0;
          const isHovered = hover?.i === i;

          const fill = isZero ? "rgba(255,255,255,0.10)" : isHovered ? "url(#barGradHot)" : "url(#barGrad)";
          const stroke = isHovered ? "rgba(255,255,255,0.38)" : "rgba(255,255,255,0.18)";
          const r = 14;

          return (
            <g
              key={i}
              onMouseMove={(e) => {
                const svg = e.currentTarget.ownerSVGElement;
                if (!svg) return;
                const rect = svg.getBoundingClientRect();
                setHover({
                  i,
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                });
              }}
              style={{ cursor: "pointer" }}
            >
              {/* bar body */}
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(8, bh)}
                rx={r}
                ry={r}
                fill={fill}
                stroke={stroke}
                strokeWidth="1"
                filter={isHovered ? "url(#softShadow)" : undefined}
              />

              {/* top label (value) */}
              <text
                x={x + barW / 2}
                y={Math.max(14, y - 8)}
                textAnchor="middle"
                fontSize="12"
                fontWeight="800"
                fill="rgba(255,255,255,0.9)"
              >
                {valuePrefix}
                {formatValue(v)}
              </text>

              {/* bottom label */}
              <text
                x={x + barW / 2}
                y={h - 22}
                textAnchor="middle"
                fontSize="12"
                fontWeight="800"
                fill="rgba(255,255,255,0.85)"
              >
                {String(d.label || "")}
              </text>

              {d.subLabel ? (
                <text
                  x={x + barW / 2}
                  y={h - 8}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill="rgba(255,255,255,0.55)"
                >
                  {String(d.subLabel)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>

      {/* tooltip */}
      {hover && data[hover.i] && (
        <div
          style={{
            position: "absolute",
            left: Math.min(hover.x + 12, 520),
            top: Math.max(hover.y - 10, 8),
            padding: "10px 12px",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(10,14,28,0.92)",
            boxShadow: "0 18px 50px rgba(0,0,0,0.55)",
            backdropFilter: "blur(10px)",
            color: "#fff",
            pointerEvents: "none",
            width: 230,
          }}
        >
          <div style={{ fontWeight: 900, marginBottom: 4 }}>{data[hover.i].label}</div>
          {data[hover.i].subLabel ? (
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 8 }}>{data[hover.i].subLabel}</div>
          ) : (
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 8 }}>Hover detail</div>
          )}
          <div style={{ fontWeight: 900, fontSize: 16 }}>
            {valuePrefix}
            {formatValue(Number(data[hover.i].value || 0))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Reports() {
  const nav = useNavigate();

  const now = new Date();
  const [mode, setMode] = useState("monthly"); // daily | monthly | yearly
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  // daily range (default 7 hari)
  const [dStart, setDStart] = useState(ymd(new Date(now.getTime() - 6 * 86400000)));
  const [dEnd, setDEnd] = useState(ymd(now));

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [summary, setSummary] = useState(null); // /reports/summary
  const [calendar, setCalendar] = useState([]); // /reports/calendar

  const [selectedDay, setSelectedDay] = useState(null); // YYYY-MM-DD

  const pageStyle = {
    minHeight: "100vh",
    padding: 24,
    color: "#fff",
    background:
      "radial-gradient(1200px 600px at 20% 10%, rgba(124,58,237,0.35), transparent), radial-gradient(1200px 600px at 90% 10%, rgba(34,197,94,0.25), transparent), #0b1020",
  };

  const btnStyle = (variant = "soft") => {
    const base = {
      height: 44,
      padding: "0 14px",
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.18)",
      cursor: "pointer",
      fontWeight: 800,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      lineHeight: 1,
      whiteSpace: "nowrap",
      color: "#fff",
      fontFamily: "inherit",
    };

    if (variant === "primary") {
      return {
        ...base,
        background: "linear-gradient(90deg, rgba(124,58,237,0.9), rgba(34,197,94,0.8))",
        fontWeight: 900,
      };
    }

    return { ...base, background: "rgba(255,255,255,0.06)" };
  };

  const selectStyle = {
    height: 44,
    padding: "0 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    outline: "none",
    cursor: "pointer",
    fontFamily: "inherit",
  };

  const inputStyle = {
    height: 44,
    padding: "0 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    outline: "none",
    fontFamily: "inherit",
  };

  async function load() {
    setLoading(true);
    setErr("");
    try {
      let qs = "";
      if (mode === "yearly") {
        qs = `?period=yearly&year=${year}`;
      } else if (mode === "monthly") {
        qs = `?period=monthly&year=${year}&month=${month}`;
      } else {
        qs = `?period=daily&start=${dStart}&end=${dEnd}`;
      }

      const s = await api(`/reports/summary${qs}`, { method: "GET" });
      setSummary(s);

      if (mode === "monthly") {
        const cal = await api(`/reports/calendar?year=${year}&month=${month}`, { method: "GET" });
        setCalendar(Array.isArray(cal) ? cal : []);
        const today = ymd(new Date());
        const inMonth = year === new Date().getFullYear() && month === new Date().getMonth() + 1;
        setSelectedDay(inMonth ? today : `${year}-${String(month).padStart(2, "0")}-01`);
      } else {
        setCalendar([]);
        setSelectedDay(null);
      }
    } catch (e) {
      setErr(e?.message || "Gagal load laporan");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, year, month, dStart, dEnd]);

  const selectedDayData = useMemo(() => {
    if (!selectedDay) return null;
    return calendar.find((d) => d.day === selectedDay) || null;
  }, [calendar, selectedDay]);

  const grid = useMemo(() => {
    const first = new Date(year, month - 1, 1);
    const last = new Date(year, month, 0);
    const daysInMonth = last.getDate();

    const jsDay = first.getDay(); // 0..6
    const offset = (jsDay + 6) % 7; // Monday=0

    const cells = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);

    return cells;
  }, [year, month]);

  const calendarMap = useMemo(() => {
    const m = new Map();
    for (const row of calendar || []) {
      if (row?.day) m.set(row.day, row);
    }
    return m;
  }, [calendar]);

  // ===== chart data builders =====
  const chartTitle = useMemo(() => {
    if (!summary) return "Grafik";
    if (summary.period === "daily") return "Grafik Total per Hari";
    if (summary.period === "monthly") return "Grafik Total per Kategori (Bulan)";
    return "Grafik Total per Kategori (Tahun)";
  }, [summary]);

  const chartData = useMemo(() => {
    if (!summary) return [];
    // DAILY: prefer buckets (total per day)
    if (summary.period === "daily" && Array.isArray(summary.buckets)) {
      return summary.buckets.map((b) => ({
        label: String(b.day || "").slice(8, 10), // ambil "DD"
        subLabel: String(b.day || ""),
        value: Number(b.total_amount || 0),
      }));
    }

    // MONTHLY/YEARLY: totals per category
    const totals = summary.totals || {};
    return CATS.map((c) => ({
      label: cap(c),
      subLabel: "Kategori",
      value: Number(totals?.[c] || 0),
    }));
  }, [summary]);

  return (
    <div style={pageStyle} className="reports-page">
      <style>{`
        .reports-wrap{ max-width:1100px; margin:0 auto; display:grid; gap:16px; }
        .reports-header{ display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; align-items:flex-start; }
        .reports-actions{ display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
        .reports-summary-grid{ display:grid; grid-template-columns:1fr 1fr; gap:10px; }

        .reports-monthly-grid{ display:grid; grid-template-columns:1fr 1fr; gap:16px; align-items:start; }
        .cal-grid{ display:grid; grid-template-columns:repeat(7, minmax(0, 1fr)); gap:8px; }
        .cal-dow{
          opacity:.85;
          font-size:12px;
          text-align:center;
          padding:8px 0;
          border-radius:10px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
        }

        .cal-cell{
          width:100%;
          height:64px;
          padding:10px;
          border-radius:14px;
          border:1px solid rgba(255,255,255,0.14);
          background: linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.04));
          color:#fff;
          cursor:pointer;
          text-align:left;
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:8px;
          position:relative;
          transition: transform .08s ease, background .2s ease, border-color .2s ease;
        }
        .cal-cell:hover{
          transform: translateY(-1px);
          border-color: rgba(255,255,255,0.24);
          background: linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.05));
        }
        .cal-cell:active{ transform: translateY(0px); }
        .cal-cell:disabled{
          opacity:.22;
          cursor:default;
          transform:none;
        }

        .cal-daynum{ font-weight:900; font-size:14px; line-height:1; }
        .cal-dot{
          width:8px;
          height:8px;
          border-radius:999px;
          background: rgba(255,255,255,0.28);
          border: 1px solid rgba(255,255,255,0.18);
          margin-top:2px;
          flex: 0 0 auto;
        }
        .cal-dot.has{
          background: rgba(34,197,94,0.95);
          border-color: rgba(34,197,94,0.55);
          box-shadow: 0 0 0 4px rgba(34,197,94,0.12);
        }

        @keyframes todayJitterGlow {
          0%   { transform: translate(0,0) scale(1);   box-shadow: 0 0 0 4px rgba(34,197,94,0.10), 0 0 14px rgba(34,197,94,0.35); }
          22%  { transform: translate(0.2px,-0.2px) scale(1.03); box-shadow: 0 0 0 6px rgba(34,197,94,0.14), 0 0 18px rgba(34,197,94,0.45); }
          46%  { transform: translate(-0.2px,0.2px) scale(0.99); box-shadow: 0 0 0 5px rgba(34,197,94,0.12), 0 0 16px rgba(34,197,94,0.40); }
          70%  { transform: translate(0.15px,0px) scale(1.04); box-shadow: 0 0 0 7px rgba(34,197,94,0.16), 0 0 20px rgba(34,197,94,0.55); }
          100% { transform: translate(0,0) scale(1);   box-shadow: 0 0 0 4px rgba(34,197,94,0.10), 0 0 14px rgba(34,197,94,0.35); }
        }
        .cal-dot.today{
          background: rgba(34,197,94,0.98);
          border-color: rgba(34,197,94,0.65);
          animation: todayJitterGlow 1.25s ease-in-out infinite;
        }

        .mutasi-item{
          padding:12px;
          border-radius:14px;
          border:1px solid rgba(255,255,255,0.12);
          background:rgba(0,0,0,0.16);
          display:flex;
          justify-content:space-between;
          gap:10px;
          flex-wrap:wrap;
        }
        .mutasi-left{ min-width:0; }
        .mutasi-title{ font-weight:800; }
        .mutasi-date{ opacity:.7; font-size:12px; margin-top:4px; }
        .mutasi-amt{ font-weight:900; white-space:nowrap; }

        @media (max-width: 900px){
          .reports-monthly-grid{ grid-template-columns:1fr; }
        }
        @media (max-width: 560px){
          .reports-page{ padding:16px !important; }
          .reports-summary-grid{ grid-template-columns:1fr; }

          .cal-grid{ gap:6px; }
          .cal-dow{ font-size:11px; padding:6px 0; }
          .cal-cell{
            height:48px;
            padding:8px;
            border-radius:12px;
          }
          .cal-daynum{ font-size:13px; }
        }
      `}</style>

      <div className="reports-wrap">
        {/* header */}
        <div className="reports-header">
          <div>
            <div style={{ opacity: 0.8, fontSize: 13 }}>Financial Planning</div>
            <h1 style={{ margin: "6px 0 0", fontSize: 34 }}>Laporan</h1>
          </div>

          <div className="reports-actions">
            <select value={mode} onChange={(e) => setMode(e.target.value)} style={selectStyle}>
              <option value="daily" style={{ color: "#000" }}>
                Harian
              </option>
              <option value="monthly" style={{ color: "#000" }}>
                Bulanan
              </option>
              <option value="yearly" style={{ color: "#000" }}>
                Tahunan
              </option>
            </select>
            <button onClick={() => nav("/dashboard")} style={btnStyle("soft")}>
              Kembali
            </button>
          </div>
        </div>

        {err && (
          <div
            style={{
              padding: 12,
              borderRadius: 12,
              border: "1px solid rgba(239,68,68,0.35)",
              background: "rgba(239,68,68,0.12)",
              color: "#fecaca",
            }}
          >
            {err}
          </div>
        )}

        {/* filters */}
        <Card title="Filter">
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            {(mode === "monthly" || mode === "yearly") && (
              <>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  style={{ ...inputStyle, width: 120 }}
                />
                {mode === "monthly" && (
                  <input
                    type="number"
                    value={month}
                    min={1}
                    max={12}
                    onChange={(e) => setMonth(Number(e.target.value))}
                    style={{ ...inputStyle, width: 90 }}
                  />
                )}
              </>
            )}

            {mode === "daily" && (
              <>
                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>Start</div>
                  <input type="date" value={dStart} onChange={(e) => setDStart(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>End</div>
                  <input type="date" value={dEnd} onChange={(e) => setDEnd(e.target.value)} style={inputStyle} />
                </div>
              </>
            )}

            <button onClick={load} style={btnStyle("primary")}>
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </Card>

        {/* summary */}
        <Card title="Ringkasan">
          {!summary ? (
            <div style={{ opacity: 0.75 }}>Belum ada data.</div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ opacity: 0.85, fontSize: 13 }}>
                Periode: <b>{summary.period}</b> ({summary.start} s/d {summary.end})
              </div>

              <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.15 }}>
                Total: Rp {formatIDR(summary.total_amount)}{" "}
                <span style={{ opacity: 0.75, fontSize: 14 }}>({summary.count} transaksi)</span>
              </div>

              {/* ✅ chart */}
              <div style={{ marginTop: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
                  <div style={{ fontWeight: 900 }}>{chartTitle}</div>
                  <div style={{ opacity: 0.7, fontSize: 12 }}>
                    Hover bar untuk detail
                  </div>
                </div>
                <div style={{ marginTop: 10 }}>
                  <PrettyBarChart
                    data={chartData}
                    height={260}
                    valuePrefix="Rp "
                    formatValue={(v) => formatIDR(v)}
                    emptyText="Belum ada data chart untuk periode ini."
                  />
                </div>
              </div>

              {/* totals per category */}
              <div className="reports-summary-grid">
                {CATS.map((c) => (
                  <div
                    key={c}
                    style={{
                      padding: 12,
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(0,0,0,0.16)",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <div style={{ fontWeight: 800 }}>{cap(c)}</div>
                    <div style={{ fontWeight: 900 }}>Rp {formatIDR(summary.totals?.[c] || 0)}</div>
                  </div>
                ))}
              </div>

              {summary.period === "daily" && Array.isArray(summary.buckets) && summary.buckets.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 800, marginBottom: 8 }}>Detail per hari</div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {summary.buckets.map((b) => (
                      <div
                        key={b.day}
                        style={{
                          padding: 12,
                          borderRadius: 14,
                          border: "1px solid rgba(255,255,255,0.12)",
                          background: "rgba(0,0,0,0.16)",
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ fontWeight: 800 }}>{b.day}</div>
                        <div style={{ fontWeight: 900 }}>
                          Rp {formatIDR(b.total_amount)}{" "}
                          <span style={{ opacity: 0.75, fontSize: 13 }}>({b.count})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* calendar */}
        {mode === "monthly" && (
          <div className="reports-monthly-grid">
            <Card title="Kalender (klik tanggal untuk lihat mutasi)">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                  marginBottom: 10,
                  opacity: 0.9,
                  fontSize: 12,
                }}
              >
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <span className="cal-dot has" /> Ada transaksi
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <span className="cal-dot" /> Kosong
                  </span>
                </div>
                <div style={{ opacity: 0.75, textAlign: "right" }}>Klik tanggal untuk lihat mutasi</div>
              </div>

              <div className="cal-grid">
                {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((d) => (
                  <div key={d} className="cal-dow">
                    {d}
                  </div>
                ))}

                {grid.map((dayNum, idx) => {
                  const ds = dayNum
                    ? `${year}-${String(month).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`
                    : null;

                  const active = ds && selectedDay === ds;
                  const today = ymd(new Date());
                  const isToday = ds && ds === today;

                  const row = ds ? calendarMap.get(ds) : null;
                  const hasTx = !!(row && Number(row.count || 0) > 0);

                  const col = idx % 7;
                  const isWeekend = col === 5 || col === 6;

                  return (
                    <button
                      key={idx}
                      className="cal-cell"
                      disabled={!dayNum}
                      onClick={() => ds && setSelectedDay(ds)}
                      style={{
                        outline: active ? "2px solid rgba(34,197,94,0.6)" : "none",
                        borderColor: active ? "rgba(34,197,94,0.40)" : "rgba(255,255,255,0.14)",
                        background: active
                          ? "linear-gradient(180deg, rgba(34,197,94,0.18), rgba(255,255,255,0.05))"
                          : isWeekend
                          ? "linear-gradient(180deg, rgba(124,58,237,0.10), rgba(255,255,255,0.04))"
                          : "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.04))",
                      }}
                      title={ds ? (hasTx ? "Ada transaksi" : "Tidak ada transaksi") : ""}
                    >
                      <div className="cal-daynum">{dayNum || ""}</div>
                      <div className={`cal-dot ${hasTx ? "has" : ""} ${isToday ? "today" : ""}`} />
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card title={`Mutasi ${selectedDay || "-"}`}>
              {!selectedDayData ? (
                <div style={{ opacity: 0.75 }}>Klik tanggal dulu.</div>
              ) : selectedDayData.count === 0 ? (
                <div style={{ opacity: 0.75 }}>Tidak ada transaksi di hari ini.</div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ fontWeight: 900 }}>
                    Total: Rp {formatIDR(selectedDayData.total_amount)}{" "}
                    <span style={{ opacity: 0.75, fontSize: 13 }}>({selectedDayData.count} transaksi)</span>
                  </div>

                  <div style={{ display: "grid", gap: 8 }}>
                    {selectedDayData.transactions.map((tx) => (
                      <div key={tx.id} className="mutasi-item">
                        <div className="mutasi-left">
                          <div className="mutasi-title">
                            {tx.text} <span style={{ opacity: 0.7, fontWeight: 600 }}>— {cap(tx.category)}</span>
                          </div>
                          <div className="mutasi-date">{fmtDateTimeID(tx.created_at)}</div>
                        </div>
                        <div className="mutasi-amt">Rp {formatIDR(tx.amount)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
