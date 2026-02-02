// src/pages/Dashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

const CATS = ["needs", "wants", "debts", "savings", "invests"];

function formatIDR(n) {
  try {
    return new Intl.NumberFormat("id-ID").format(n);
  } catch {
    return String(n);
  }
}

function cap(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/**
 * FIX: Kalau ada transaksi debts (spent.debts > 0) tapi target debts masih 0%,
 * auto-alokasikan 20% ke debts (ambil dari invests dulu, lalu wants, savings, needs).
 */
function normalizeTargetsWithDebts(targets = {}, spent = {}) {
  const t = {
    needs: targets.needs ?? 50,
    wants: targets.wants ?? 15,
    savings: targets.savings ?? 15,
    debts: targets.debts ?? 0,
    invests: targets.invests ?? 20,
  };

  const usedDebts = Number(spent.debts ?? 0);

  if (usedDebts > 0 && Number(t.debts ?? 0) === 0) {
    const move = 20; // ✅ ubah kalau mau 10/15/20
    t.debts = move;

    // ambil dari invests dulu
    const takeFromInvests = Math.min(Number(t.invests ?? 0), move);
    t.invests = Number(t.invests ?? 0) - takeFromInvests;

    let remaining = move - takeFromInvests;

    // kalau masih kurang, ambil dari wants
    if (remaining > 0) {
      const takeFromWants = Math.min(Number(t.wants ?? 0), remaining);
      t.wants = Number(t.wants ?? 0) - takeFromWants;
      remaining -= takeFromWants;
    }

    // lalu savings
    if (remaining > 0) {
      const takeFromSavings = Math.min(Number(t.savings ?? 0), remaining);
      t.savings = Number(t.savings ?? 0) - takeFromSavings;
      remaining -= takeFromSavings;
    }

    // terakhir needs
    if (remaining > 0) {
      t.needs = Math.max(0, Number(t.needs ?? 0) - remaining);
    }
  }

  return t;
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
      <div style={{ fontWeight: 700, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

function Meter({ label, targetPct, income, spent }) {
  const budget = Math.round((Number(targetPct) / 100) * Number(income || 0));
  const pctUsed =
    budget > 0 ? Math.min(100, Math.round((Number(spent || 0) / budget) * 100)) : 0;

  // status khusus kalau budget 0 tapi ada spent -> "Ada hutang"
  let status = "Aman";
  if (budget <= 0 && Number(spent || 0) > 0) status = "Ada hutang";
  else if (pctUsed >= 100) status = "Over";
  else if (pctUsed >= 80) status = "Waspada";

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontWeight: 600 }}>
          {label} <span style={{ opacity: 0.75 }}>({Number(targetPct || 0)}%)</span>
        </div>
        <div style={{ opacity: 0.85, fontSize: 13 }}>{status}</div>
      </div>

      <div
        style={{
          height: 12,
          borderRadius: 999,
          background: "rgba(255,255,255,0.12)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pctUsed}%`,
            height: "100%",
            background: "linear-gradient(90deg, #7c3aed, #22c55e)",
          }}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, opacity: 0.9 }}>
        <div>Terpakai: Rp {formatIDR(Number(spent || 0))}</div>
        <div>Budget: Rp {formatIDR(Number(budget || 0))}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const nav = useNavigate();

  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  // input transaksi
  const [text, setText] = useState("");
  const [amount, setAmount] = useState("");

  // prediksi
  const [pred, setPred] = useState(null); // {category, confidence}
  const [chosenCat, setChosenCat] = useState("needs");
  const [busyPredict, setBusyPredict] = useState(false);
  const [busySave, setBusySave] = useState(false);

  // msg success
  const [msg, setMsg] = useState("");

  async function loadDashboard() {
    setErr("");
    setLoading(true);
    try {
      const d = await api("/dashboard", { method: "GET" });
      setData(d);
    } catch (e) {
      const m = (e?.message || "").toLowerCase();
      // kalau backend ngasih "Income not set" / 404 income, arahkan ke setup income
      if (m.includes("income") || m.includes("not set")) {
        nav("/setup-income");
        return;
      }
      setErr(e?.message || "Gagal load dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const income = data?.income ?? 0;
  const targets = data?.targets ?? {};
  const spent = data?.spent ?? {};

  // ✅ FIX debts di sini
  const effectiveTargets = useMemo(() => {
    return normalizeTargetsWithDebts(targets, spent);
  }, [targets, spent]);

  const totalBudget = useMemo(() => {
    if (!data) return 0;
    return Object.values(effectiveTargets).reduce(
      (acc, pct) => acc + Math.round((Number(pct) / 100) * Number(income || 0)),
      0
    );
  }, [data, effectiveTargets, income]);

  async function doPredict(e) {
    e.preventDefault();
    setMsg("");
    setErr("");
    setPred(null);

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

  async function confirmSave() {
    setMsg("");
    setErr("");

    const n = Number(amount);
    if (!text.trim()) return setErr("Teks transaksi kosong.");
    if (!Number.isFinite(n) || n <= 0) return setErr("Nominal harus angka > 0.");

    setBusySave(true);
    try {
      // IMPORTANT: confidence di backend kamu sempat int, jadi jangan kirim confidence float
      await api("/transactions", {
        method: "POST",
        body: JSON.stringify({
          text: text.trim(),
          amount: Math.floor(n),
          category: chosenCat,
          // confidence: pred?.confidence, // ❌ jangan kirim biar gak 422
        }),
      });

      setMsg(`✅ Tersimpan ke ${chosenCat} (+Rp ${formatIDR(Math.floor(n))})`);

      // reset form
      setText("");
      setAmount("");
      setPred(null);

      // refresh
      await loadDashboard();
    } catch (e2) {
      setErr(e2?.message || "Gagal simpan transaksi");
    } finally {
      setBusySave(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 24,
        color: "#fff",
        background:
          "radial-gradient(1200px 600px at 20% 10%, rgba(124,58,237,0.35), transparent), radial-gradient(1200px 600px at 90% 10%, rgba(34,197,94,0.25), transparent), #0b1020",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ opacity: 0.8, fontSize: 13 }}>Financial Planning</div>
            <h1 style={{ margin: "6px 0 0", fontSize: 34 }}>Dashboard</h1>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              onClick={() => nav("/setup-income")}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(255,255,255,0.06)",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Edit Income
            </button>

            <button
              onClick={() => {
                localStorage.removeItem("token");
                nav("/login");
              }}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(255,255,255,0.06)",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {(err || msg) && (
          <div
            style={{
              padding: 12,
              borderRadius: 12,
              border: err ? "1px solid rgba(239,68,68,0.35)" : "1px solid rgba(34,197,94,0.35)",
              background: err ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.12)",
              color: err ? "#fecaca" : "#bbf7d0",
              whiteSpace: "pre-wrap",
            }}
          >
            {err || msg}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Card title="Income Bulanan">
            <div style={{ fontSize: 28, fontWeight: 800 }}>Rp {formatIDR(income)}</div>
            <div style={{ opacity: 0.75, marginTop: 6, fontSize: 13 }}>
              Total budget (berdasarkan target): Rp {formatIDR(totalBudget)}
            </div>
          </Card>

          <Card title="Input Transaksi">
            <form onSubmit={doPredict} style={{ display: "grid", gap: 10 }}>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder='contoh: "bayar cicilan mobil"'
                style={{
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  outline: "none",
                }}
              />

              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder='nominal (contoh: 250000)'
                inputMode="numeric"
                style={{
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  outline: "none",
                }}
              />

              <button
                disabled={busyPredict}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(255,255,255,0.10)",
                  color: "#fff",
                  cursor: busyPredict ? "not-allowed" : "pointer",
                  fontWeight: 700,
                }}
              >
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
                    Prediksi: <b>{pred.category}</b> (conf {Math.round((pred.confidence || 0) * 100)}%)
                  </div>

                  <div style={{ display: "grid", gap: 6 }}>
                    <div style={{ fontSize: 13, opacity: 0.85 }}>Edit kategori</div>
                    <select
                      value={chosenCat}
                      onChange={(e) => setChosenCat(e.target.value)}
                      style={{
                        padding: 10,
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.18)",
                        background: "rgba(255,255,255,0.06)",
                        color: "#fff",
                        outline: "none",
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
                    onClick={confirmSave}
                    disabled={busySave}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.18)",
                      background: "linear-gradient(90deg, rgba(124,58,237,0.9), rgba(34,197,94,0.8))",
                      color: "#fff",
                      cursor: busySave ? "not-allowed" : "pointer",
                      fontWeight: 800,
                    }}
                  >
                    {busySave ? "Saving..." : "Konfirmasi & Simpan"}
                  </button>
                </div>
              )}
            </form>
          </Card>
        </div>

        <Card title="Budget Meters">
          {loading ? (
            <div style={{ opacity: 0.75 }}>Loading...</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Meter label="Needs" targetPct={effectiveTargets.needs ?? 0} income={income} spent={spent.needs ?? 0} />
              <Meter label="Wants" targetPct={effectiveTargets.wants ?? 0} income={income} spent={spent.wants ?? 0} />
              <Meter label="Debts" targetPct={effectiveTargets.debts ?? 0} income={income} spent={spent.debts ?? 0} />
              <Meter
                label="Savings"
                targetPct={effectiveTargets.savings ?? 0}
                income={income}
                spent={spent.savings ?? 0}
              />
              <Meter
                label="Invests"
                targetPct={effectiveTargets.invests ?? 0}
                income={income}
                spent={spent.invests ?? 0}
              />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}