import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

function formatIDR(n) {
  try { return new Intl.NumberFormat("id-ID").format(n); }
  catch { return String(n); }
}

export default function SetupIncome() {
  const nav = useNavigate();
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    // coba load income lama (kalau ada)
    (async () => {
      try {
        const d = await api("/income", { method: "GET" });
        if (d?.amount != null) setAmount(String(d.amount));
      } catch {
        // kalau 404 ignore
      }
    })();
  }, []);

  async function save(e) {
    e.preventDefault();
    setErr(""); setMsg("");

    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return setErr("Income harus angka > 0.");

    setBusy(true);
    try {
      const d = await api("/income", {
        method: "POST",
        body: JSON.stringify({ amount: Math.floor(n) }),
      });
      setMsg(`✅ Income tersimpan: Rp ${formatIDR(d.amount)} / bulan`);
    } catch (e2) {
      setErr(e2.message || "Gagal simpan income");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="card" style={{ width: "100%", maxWidth: 760 }}>
        <div className="card-top">
          <div className="brand">
            <div className="brand-badge" />
            <div>
              <div className="brand-title">FINANCIAL PLANNER</div>
              <div className="subtitle">Set gaji bulanan</div>
            </div>
          </div>

          <div className="title">Set Monthly Income</div>
          <p className="subtitle">
            Isi gaji bulanan kamu dulu. Nanti target budgeting otomatis kebagi ke tiap kategori.
          </p>
        </div>

        <div className="card-body">
          <form className="form" onSubmit={save}>
            <div className="field">
              <label>Income (Rp / bulan)</label>
              <input
                className="input"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="numeric"
                placeholder="contoh: 4500000"
              />
            </div>

            <button className="btn" disabled={busy}>
              {busy ? "Saving..." : "Save"}
            </button>

            {err && <div className="alert">{err}</div>}
            {msg && <div className="alert-success">{msg}</div>}

            <button
              type="button"
              className="btn-secondary"
              style={{ marginTop: 6 }}
              onClick={() => nav("/dashboard")}
            >
              Go to Dashboard →
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => nav("/dashboard")}
            >
              Skip (langsung ke dashboard)
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
