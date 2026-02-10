// src/pages/SetupIncome.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

function formatIDR(n) {
  const x = Number(n || 0);
  try {
    return new Intl.NumberFormat("id-ID").format(x);
  } catch {
    return String(x);
  }
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

export default function SetupIncome() {
  const nav = useNavigate();

  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

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

  // samain feel tombol kayak Transactions (tinggi fix)
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

  const inputStyle = {
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    outline: "none",
  };

  const amountNum = useMemo(() => Number(amount || 0), [amount]);

  async function loadIncome() {
    setErr("");
    setMsg("");
    setLoading(true);
    try {
      const inc = await api("/income", { method: "GET" });
      const v = Number(inc?.amount || 0);
      setAmount(v > 0 ? String(v) : "");
    } catch (e) {
      // income belum set => biarin kosong (jangan error merah)
      const m = String(e?.message || "");
      if (!m.toLowerCase().includes("income not set") && !m.includes("404")) {
        setErr(e?.message || "Gagal load income");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadIncome();
  }, []);

  async function onSave() {
    setErr("");
    setMsg("");

    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      setErr("Income harus angka > 0.");
      return;
    }

    setBusy(true);
    try {
      await api("/income", {
        method: "POST",
        body: JSON.stringify({ amount: Math.floor(n) }),
      });
      setMsg("✅ Income berhasil disimpan");
    } catch (e) {
      setErr(e?.message || "Gagal simpan income");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gap: 16 }}>
        {/* header */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ opacity: 0.8, fontSize: 13 }}>Financial Planning</div>
            <h1 style={{ margin: "6px 0 0", fontSize: 34 }}>Set Income</h1>
            <div style={{ marginTop: 6, opacity: 0.8, fontSize: 13 }}>
              Isi income bulanan kamu. Target budget akan ngikut otomatis.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <button onClick={() => nav("/dashboard")} style={btnStyle("soft")}>
              Kembali
            </button>
          </div>
        </div>

        {/* alerts */}
        {err && <div style={pillStyle("err")}>{err}</div>}
        {msg && <div style={pillStyle("ok")}>{msg}</div>}

        <Card title="Income Bulanan (Rp)">
          {loading ? (
            <div style={{ opacity: 0.75 }}>Loading...</div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ fontSize: 13, opacity: 0.85 }}>Nominal</div>

                <input
                  value={amount}
                  onChange={(e) => {
                    // ✅ cuma angka
                    const raw = e.target.value;
                    const digitsOnly = raw.replace(/\D/g, "");
                    const cleaned = digitsOnly.replace(/^0+(?=\d)/, "");
                    setAmount(cleaned);
                  }}
                  placeholder="contoh: 6000000"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  style={inputStyle}
                />

                {/* ✅ preview */}
                <div style={{ fontSize: 13, opacity: 0.85 }}>
                  Preview: <b>Rp {formatIDR(amountNum)}</b>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  onClick={onSave}
                  disabled={busy}
                  style={{ ...btnStyle("primary"), minWidth: 180, opacity: busy ? 0.7 : 1 }}
                >
                  {busy ? "Saving..." : "Save"}
                </button>

                <button onClick={() => nav("/dashboard")} style={btnStyle("soft")}>
                  Go to Dashboard →
                </button>
              </div>

              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
                Tip: kalau income sudah ada, halaman ini bisa dipakai buat edit kapan saja.
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
