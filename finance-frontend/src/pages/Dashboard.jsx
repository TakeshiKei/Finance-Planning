// src/pages/Dashboard.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import ConfirmModal from "../components/ConfirmModal";

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

function pad2(n) {
  return String(n).padStart(2, "0");
}

function ymToYearMonth(ymStr) {
  const [y, m] = String(ymStr || "").split("-");
  return { year: Number(y), month: Number(m) };
}

function monthLabel(ymStr) {
  const { year, month } = ymToYearMonth(ymStr);
  const names = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const idx = Math.max(1, Math.min(12, month)) - 1;
  return `${names[idx]} ${year}`;
}

function Card({ title, children }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 16,
        padding: 16,
        boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
      }}
    >
      <div style={{ fontWeight: 900, marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}

function Meter({ label, targetPct, income, spent }) {
  const budget = Math.floor((Number(income || 0) * Number(targetPct || 0)) / 100);
  const used = Number(spent || 0);

  // ✅ jika budget 0 tapi kepakai > 0 -> Bahaya (biar Debts kebaca)
  const status =
    budget <= 0 ? (used > 0 ? "Bahaya" : "Aman") : used > budget ? "Bahaya" : "Aman";

  // ✅ progress: kalau budget 0 dan used > 0 => pakai 100% supaya keliatan penuh
  const pct =
    budget > 0 ? Math.min(100, Math.round((used / budget) * 100)) : used > 0 ? 100 : 0;

  return (
    <div
      style={{
        padding: 14,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(0,0,0,0.16)",
        display: "grid",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontWeight: 900 }}>
          {label} <span style={{ opacity: 0.75 }}>({targetPct}%)</span>
        </div>
        <div style={{ fontWeight: 800, opacity: 0.9 }}>{status}</div>
      </div>

      <div
        style={{
          height: 10,
          borderRadius: 999,
          background: "rgba(255,255,255,0.10)",
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: "linear-gradient(90deg, rgba(124,58,237,0.9), rgba(34,197,94,0.8))",
          }}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", fontSize: 13 }}>
        <div style={{ opacity: 0.85 }}>Terpakai: Rp {formatIDR(used)}</div>
        <div style={{ opacity: 0.85 }}>Budget: Rp {formatIDR(budget)}</div>
      </div>
    </div>
  );
}

/**
 * MonthPicker custom (mengganti input type="month" biar tampilannya gak default)
 */
function MonthPicker({ valueYm, onChange, inputStyle }) {
  const wrapRef = useRef(null);
  const [open, setOpen] = useState(false);

  const { year: curYear, month: curMonth } = ymToYearMonth(valueYm);
  const [viewYear, setViewYear] = useState(curYear || new Date().getFullYear());

  useEffect(() => {
    if (curYear && Number.isFinite(curYear)) setViewYear(curYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueYm]);

  useEffect(() => {
    function onDocClick(e) {
      if (!open) return;
      if (!wrapRef.current) return;
      if (wrapRef.current.contains(e.target)) return;
      setOpen(false);
    }
    function onEsc(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const months = [
    { key: 1, label: "Jan" },
    { key: 2, label: "Feb" },
    { key: 3, label: "Mar" },
    { key: 4, label: "Apr" },
    { key: 5, label: "Mei" },
    { key: 6, label: "Jun" },
    { key: 7, label: "Jul" },
    { key: 8, label: "Agu" },
    { key: 9, label: "Sep" },
    { key: 10, label: "Okt" },
    { key: 11, label: "Nov" },
    { key: 12, label: "Des" },
  ];

  const pill = {
    ...inputStyle,
    height: 44,
    padding: "0 12px",
    width: 200,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    cursor: "pointer",
    userSelect: "none",
    fontFamily: "inherit",
  };

  const pop = {
    position: "absolute",
    zIndex: 50,
    top: 52,
    left: 0,
    width: 280,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(10,14,28,0.92)",
    boxShadow: "0 18px 50px rgba(0,0,0,0.55)",
    backdropFilter: "blur(10px)",
    padding: 12,
  };

  const yearRow = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: "6px 6px 10px",
    borderBottom: "1px solid rgba(255,255,255,0.10)",
    marginBottom: 10,
  };

  const iconBtn = {
    height: 34,
    width: 34,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    cursor: "pointer",
    display: "grid",
    placeItems: "center",
    fontWeight: 900,
  };

  const monthGrid = {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 8,
    padding: 6,
  };

  const monthBtn = (active) => ({
    height: 40,
    borderRadius: 12,
    border: active ? "1px solid rgba(34,197,94,0.45)" : "1px solid rgba(255,255,255,0.12)",
    background: active
      ? "linear-gradient(90deg, rgba(124,58,237,0.55), rgba(34,197,94,0.35))"
      : "rgba(255,255,255,0.06)",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 900,
    letterSpacing: 0.2,
  });

  return (
    <div ref={wrapRef} style={{ position: "relative", display: "inline-block" }}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setOpen((v) => !v);
        }}
        style={pill}
        title="Pilih bulan"
      >
        <div style={{ display: "grid", gap: 2 }}>
          <div style={{ fontWeight: 900 }}>{monthLabel(valueYm)}</div>
        </div>

        <div
          style={{
            height: 34,
            width: 34,
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.06)",
            display: "grid",
            placeItems: "center",
            opacity: 0.9,
          }}
        >
          📅
        </div>
      </div>

      {open && (
        <div style={pop}>
          <div style={yearRow}>
            <button type="button" onClick={() => setViewYear((y) => y - 1)} style={iconBtn} aria-label="Prev year">
              ‹
            </button>

            <div style={{ display: "grid", gap: 2, textAlign: "center" }}>
              <div style={{ fontWeight: 950, fontSize: 16 }}>{viewYear}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Pilih bulan</div>
            </div>

            <button type="button" onClick={() => setViewYear((y) => y + 1)} style={iconBtn} aria-label="Next year">
              ›
            </button>
          </div>

          <div style={monthGrid}>
            {months.map((m) => {
              const active = viewYear === curYear && m.key === curMonth;
              return (
                <button
                  key={m.key}
                  type="button"
                  style={monthBtn(active)}
                  onClick={() => {
                    onChange(`${viewYear}-${pad2(m.key)}`);
                    setOpen(false);
                  }}
                >
                  {m.label}
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 10, padding: "8px 6px 4px" }}>
            <button
              type="button"
              onClick={() => {
                const n = new Date();
                onChange(`${n.getFullYear()}-${pad2(n.getMonth() + 1)}`);
                setOpen(false);
              }}
              style={{
                flex: 1,
                height: 40,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.06)",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 900,
              }}
            >
              Bulan ini
            </button>

            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                flex: 1,
                height: 40,
                borderRadius: 12,
                border: "1px solid rgba(239,68,68,0.25)",
                background: "rgba(239,68,68,0.10)",
                color: "#fecaca",
                cursor: "pointer",
                fontWeight: 900,
              }}
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [me, setMe] = useState(null); // {id, username, email}

  const [income, setIncome] = useState(0);
  const [targets, setTargets] = useState({
    needs: 50,
    wants: 15,
    debts: 0,
    savings: 15,
    invests: 20,
  });

  const [summary, setSummary] = useState({
    needs: 0,
    wants: 0,
    debts: 0,
    savings: 0,
    invests: 0,
  });

  // ✅ pilih bulan
  const now = new Date();
  const [ym, setYm] = useState(`${now.getFullYear()}-${pad2(now.getMonth() + 1)}`);

  // input transaksi
  const [text, setText] = useState("");
  const [amount, setAmount] = useState("");
  const [pred, setPred] = useState(null);
  const [chosenCat, setChosenCat] = useState("needs");
  const [busyPredict, setBusyPredict] = useState(false);
  const [busySave, setBusySave] = useState(false);

  // confirm modal
  const [confirm, setConfirm] = useState({
    open: false,
    title: "",
    message: null,
    confirmText: "Ya",
    cancelText: "Batal",
    danger: false,
    action: null,
  });

  function openConfirm({ title, message, confirmText, cancelText, danger, action }) {
    setConfirm({
      open: true,
      title: title || "Konfirmasi",
      message,
      confirmText: confirmText || "Ya",
      cancelText: cancelText || "Batal",
      danger: !!danger,
      action,
    });
  }

  function closeConfirm() {
    setConfirm((p) => ({ ...p, open: false, action: null }));
  }

  // ✅ debt detection dari summary (pemakaian bulan itu)
  const hasDebt = useMemo(() => Number(summary.debts || 0) > 0, [summary.debts]);

  // ✅ targets efektif: kalau ada hutang -> Debts 20%, Invests 0% (biar “jalan”)
  const targetsEffective = useMemo(() => {
    const base = { ...targets };
    if (hasDebt) {
      base.debts = 20;
      base.invests = 0;
    }
    // rapihin supaya ada semua kunci
    for (const c of CATS) {
      if (base[c] == null) base[c] = 0;
    }
    return base;
  }, [targets, hasDebt]);

  const totalBudget = useMemo(() => {
    const inc = Number(income || 0);
    const sumPct =
      Number(targetsEffective.needs || 0) +
      Number(targetsEffective.wants || 0) +
      Number(targetsEffective.debts || 0) +
      Number(targetsEffective.savings || 0) +
      Number(targetsEffective.invests || 0);
    return Math.floor((inc * sumPct) / 100);
  }, [income, targetsEffective]);

  // ✅ warning rules (yang kamu minta di bawah Total budget)
  const budgetWarnings = useMemo(() => {
    const warns = [];

    const sumPct =
      Number(targetsEffective.needs || 0) +
      Number(targetsEffective.wants || 0) +
      Number(targetsEffective.debts || 0) +
      Number(targetsEffective.savings || 0) +
      Number(targetsEffective.invests || 0);

    if (sumPct !== 100) {
      warns.push(`⚠️ Total persen target sekarang ${sumPct}%. Idealnya 100% biar budget akurat.`);
    }

    if (hasDebt) {
      warns.push("⚠️ Terdeteksi hutang (Debts > 0). Set: Debts 20% & Invests 0% ✅");
    }

    // contoh warning overspend per kategori (pakai targetsEffective)
    for (const cat of CATS) {
      const budget = Math.floor((Number(income || 0) * Number(targetsEffective[cat] || 0)) / 100);
      const used = Number(summary[cat] || 0);
      if (budget <= 0 && used > 0) {
        warns.push(`⚠️ ${cap(cat)}: target 0% tapi kepakai Rp ${formatIDR(used)} (cek aturan target).`);
      } else if (budget > 0 && used > budget) {
        warns.push(`⚠️ ${cap(cat)}: overspend Rp ${formatIDR(used - budget)} (budget Rp ${formatIDR(budget)}).`);
      }
    }

    return warns;
  }, [targetsEffective, hasDebt, income, summary]);

  async function loadAll() {
    setLoading(true);
    setErr("");
    setMsg("");

    try {
      const meRes = await api("/me", { method: "GET" });
      setMe(meRes);

      const { year, month } = ymToYearMonth(ym);
      const d = await api(`/dashboard?year=${year}&month=${month}`, { method: "GET" });

      setIncome(Number(d?.income || 0));
      setTargets(d?.targets || targets);
      setSummary(d?.spent || summary);
    } catch (e2) {
      setErr(e2?.message || "Gagal load dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ym]);

  function logout() {
    localStorage.removeItem("token");
    nav("/login");
  }

  async function doPredictRequest() {
    setMsg("");
    setErr("");

    if (!text.trim()) {
      setErr("Tulis deskripsi transaksi dulu.");
      return;
    }

    setBusyPredict(true);
    try {
      const p = await api("/predict", {
        method: "POST",
        body: JSON.stringify({ text: text.trim() }),
      });
      setPred(p);
      setChosenCat(p?.category || "needs");
    } catch (e2) {
      setErr(e2?.message || "Predict gagal");
    } finally {
      setBusyPredict(false);
    }
  }

  async function saveTransactionRequest() {
    setMsg("");
    setErr("");

    const n = Number(amount);
    if (!text.trim()) return setErr("Teks transaksi kosong.");
    if (!Number.isFinite(n) || n <= 0) return setErr("Nominal harus angka > 0.");

    setBusySave(true);
    try {
      await api("/transactions", {
        method: "POST",
        body: JSON.stringify({
          text: text.trim(),
          amount: Math.floor(n),
          category: chosenCat,
        }),
      });

      setMsg(`✅ Tersimpan ke ${chosenCat} (+Rp ${formatIDR(Math.floor(n))})`);
      setText("");
      setAmount("");
      setPred(null);

      await loadAll();
    } catch (e2) {
      setErr(e2?.message || "Gagal simpan transaksi");
    } finally {
      setBusySave(false);
    }
  }

  // UI styles
  const pageStyle = {
    minHeight: "100vh",
    padding: 24,
    color: "#fff",
    background:
      "radial-gradient(1200px 600px at 20% 10%, rgba(124,58,237,0.35), transparent), radial-gradient(1200px 600px at 90% 10%, rgba(34,197,94,0.25), transparent), #0b1020",
  };

  const pillStyle = (type) => {
    const isErr = type === "err";
    const isOk = type === "ok";
    return {
      padding: 12,
      borderRadius: 12,
      border: isErr
        ? "1px solid rgba(239,68,68,0.35)"
        : isOk
        ? "1px solid rgba(34,197,94,0.35)"
        : "1px solid rgba(255,255,255,0.12)",
      background: isErr
        ? "rgba(239,68,68,0.12)"
        : isOk
        ? "rgba(34,197,94,0.12)"
        : "rgba(0,0,0,0.18)",
      color: isErr ? "#fecaca" : isOk ? "#bbf7d0" : "#fff",
    };
  };

  const inputStyle = {
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    outline: "none",
    fontFamily: "inherit",
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
      fontFamily: "inherit",
    };

    if (variant === "primary") {
      return {
        ...base,
        background: "linear-gradient(90deg, rgba(124,58,237,0.9), rgba(34,197,94,0.8))",
        color: "#fff",
        fontWeight: 900,
      };
    }

    return {
      ...base,
      background: "rgba(255,255,255,0.06)",
      color: "#fff",
    };
  };

  return (
    <div style={pageStyle} className="dash-page">
      <style>{`
        .dash-wrap{max-width:1100px;margin:0 auto;display:grid;gap:16px}
        .dash-header{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-start}
        .dash-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
        .dash-topgrid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        .dash-meters{display:grid;grid-template-columns:1fr 1fr;gap:14px}

        .period-row{margin-top:10px;display:flex;gap:12px;flex-wrap:wrap;align-items:center}
        .period-note{opacity:0.7;font-size:12px}

        @media (max-width: 900px){
          .dash-topgrid{grid-template-columns:1fr}
        }

        @media (max-width: 720px){
          .dash-page{padding:16px !important}
          .dash-actions{width:100%}
          .dash-actions > button{flex:1 1 auto}
          .dash-meters{grid-template-columns:1fr}
        }

        @media (max-width: 420px){
          .dash-actions > button{width:100%}
        }
      `}</style>

      <div className="dash-wrap">
        {/* header */}
        <div className="dash-header">
          <div>
            <div style={{ opacity: 0.8, fontSize: 13 }}>Financial Planning</div>
            <h1 style={{ margin: "6px 0 0", fontSize: 34 }}>Dashboard</h1>

            <div style={{ marginTop: 8, opacity: 0.9, fontSize: 18, fontWeight: 800 }}>
              Hello{me?.username ? `, ${me.username}` : ""} 👋
            </div>

            <div className="period-row">
              <div style={{ opacity: 0.75, fontSize: 13 }}>Periode dashboard:</div>
              <MonthPicker valueYm={ym} onChange={setYm} inputStyle={inputStyle} />
              <div className="period-note">(Ganti bulan = “reset pemakaian”)</div>
            </div>
          </div>

          <div className="dash-actions">
            <button onClick={() => nav("/setup-income")} style={btnStyle("soft")}>
              Edit Income
            </button>
            <button onClick={() => nav("/transactions")} style={btnStyle("soft")}>
              Riwayat
            </button>
            <button onClick={() => nav("/reports")} style={btnStyle("soft")}>
              Laporan
            </button>
            <button onClick={logout} style={btnStyle("soft")}>
              Logout
            </button>
          </div>
        </div>

        {/* alerts */}
        {err && <div style={pillStyle("err")}>{err}</div>}
        {msg && <div style={pillStyle("ok")}>{msg}</div>}

        {/* top cards */}
        <div className="dash-topgrid">
          <Card title="Income Bulanan">
            <div style={{ fontSize: 28, fontWeight: 900 }}>Rp {formatIDR(income)}</div>

            <div style={{ opacity: 0.75, marginTop: 6, fontSize: 13 }}>
              Total budget (berdasarkan target): Rp {formatIDR(totalBudget)}
            </div>

            {/* ✅ warning list di bawah total budget */}
            {budgetWarnings.length > 0 && (
              <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                {budgetWarnings.map((w, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: 13,
                      opacity: 0.95,
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(245,158,11,0.25)",
                      background: "rgba(245,158,11,0.10)",
                      color: "#fde68a",
                    }}
                  >
                    {w}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Input Transaksi">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                doPredictRequest();
              }}
              style={{ display: "grid", gap: 10 }}
            >
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder='contoh: "bayar cicilan mobil"'
                style={inputStyle}
              />

              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
                placeholder='nominal (contoh: 250000)'
                inputMode="numeric"
                style={inputStyle}
              />

              <div style={{ marginTop: -6, fontSize: 13, opacity: 0.85 }}>
                Preview: <b>Rp {formatIDR(Number(amount || 0))}</b>
              </div>

              <button disabled={busyPredict} style={{ ...btnStyle("soft"), opacity: busyPredict ? 0.7 : 1 }}>
                {busyPredict ? "Predicting..." : "Predict Category"}
              </button>

              {pred && (
                <div
                  style={{
                    marginTop: 6,
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(0,0,0,0.18)",
                    display: "grid",
                    gap: 10,
                  }}
                >
                  <div style={{ fontSize: 13, opacity: 0.9 }}>
                    Prediksi: <b>{pred.category}</b>{" "}
                    {pred.confidence != null && <span>(conf {Math.round((pred.confidence || 0) * 100)}%)</span>}
                  </div>

                  <div style={{ display: "grid", gap: 6 }}>
                    <div style={{ fontSize: 13, opacity: 0.85 }}>Edit kategori</div>
                    <select
                      value={chosenCat}
                      onChange={(e) => setChosenCat(e.target.value)}
                      style={{
                        height: 44,
                        padding: "0 12px",
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.18)",
                        background: "rgba(255,255,255,0.06)",
                        color: "#fff",
                        outline: "none",
                        fontFamily: "inherit",
                      }}
                    >
                      {CATS.map((c) => (
                        <option key={c} value={c} style={{ color: "#000" }}>
                          {cap(c)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      openConfirm({
                        title: "Simpan transaksi?",
                        message: (
                          <div style={{ display: "grid", gap: 10 }}>
                            <div style={{ opacity: 0.85 }}>Pastikan data sudah benar sebelum disimpan.</div>
                            <div
                              style={{
                                padding: 12,
                                borderRadius: 12,
                                background: "rgba(255,255,255,0.06)",
                                border: "1px solid rgba(255,255,255,0.12)",
                              }}
                            >
                              <div>
                                <b>Teks:</b> {text || "-"}
                              </div>
                              <div>
                                <b>Nominal:</b> Rp {formatIDR(Number(amount || 0))}
                              </div>
                              <div>
                                <b>Kategori:</b> {chosenCat}
                              </div>
                              {pred?.confidence != null && (
                                <div>
                                  <b>Confidence:</b> {Math.round((pred.confidence || 0) * 100)}%
                                </div>
                              )}
                            </div>
                          </div>
                        ),
                        confirmText: "Ya, simpan",
                        cancelText: "Batal",
                        action: async () => {
                          await saveTransactionRequest();
                        },
                      });
                    }}
                    disabled={busySave}
                    style={{ ...btnStyle("primary"), opacity: busySave ? 0.7 : 1 }}
                  >
                    {busySave ? "Saving..." : "Konfirmasi & Simpan"}
                  </button>
                </div>
              )}
            </form>
          </Card>
        </div>

        {/* meters */}
        <Card title="Budget Meters">
          {loading ? (
            <div style={{ opacity: 0.75 }}>Loading...</div>
          ) : (
            <div className="dash-meters">
              <Meter label="Needs" targetPct={targetsEffective.needs} income={income} spent={summary.needs} />
              <Meter label="Wants" targetPct={targetsEffective.wants} income={income} spent={summary.wants} />
              <Meter label="Debts" targetPct={targetsEffective.debts} income={income} spent={summary.debts} />
              <Meter label="Savings" targetPct={targetsEffective.savings} income={income} spent={summary.savings} />
              <Meter label="Invests" targetPct={targetsEffective.invests} income={income} spent={summary.invests} />
            </div>
          )}
        </Card>
      </div>

      {/* confirm modal global */}
      <ConfirmModal
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        confirmText={confirm.confirmText}
        cancelText={confirm.cancelText}
        danger={confirm.danger}
        onCancel={closeConfirm}
        onConfirm={async () => {
          const act = confirm.action;
          closeConfirm();
          if (typeof act === "function") await act();
        }}
      />
    </div>
  );
}
