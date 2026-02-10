import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";

export default function Register() {
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await api("/auth/register", {
        method: "POST",
        body: JSON.stringify({ username, email, password }),
      });
      nav("/login");
    } catch (e) {
      setErr(e.message || "Register gagal");
    } finally {
      setBusy(false);
    }
  }

  const pageStyle = {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 24,
    background:
      "radial-gradient(1200px 600px at 20% 10%, rgba(124,58,237,0.35), transparent), radial-gradient(1200px 600px at 90% 10%, rgba(34,197,94,0.25), transparent), #0b1020",
    color: "#fff",
  };

  const cardStyle = {
    width: "100%",
    maxWidth: 420,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 20,
    padding: 24,
    boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
    display: "grid",
    gap: 18,
  };

  const inputStyle = {
    padding: 14,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    outline: "none",
  };

  const btnStyle = {
    height: 46,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "linear-gradient(90deg, rgba(124,58,237,0.9), rgba(34,197,94,0.8))",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
  };

  return (
    <div style={pageStyle}>
      <form onSubmit={onSubmit} style={cardStyle}>
        <div>
          <div style={{ opacity: 0.8, fontSize: 13 }}>Financial Planner</div>
          <h1 style={{ margin: "6px 0 4px", fontSize: 28 }}>
            Create account
          </h1>
          <div style={{ opacity: 0.8, fontSize: 14 }}>
            Daftar untuk mulai budgeting.
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
              fontSize: 14,
              whiteSpace: "pre-wrap"
            }}
          >
            Error{"\n"}{String(err)}
          </div>
        )}

        <div style={{ display: "grid", gap: 10 }}>
          <label style={{ fontSize: 13, opacity: 0.85 }}>Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <label style={{ fontSize: 13, opacity: 0.85 }}>Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <label style={{ fontSize: 13, opacity: 0.85 }}>
            Password (min. 6 karakter)
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
        </div>

        <button disabled={busy} style={{ ...btnStyle, opacity: busy ? 0.7 : 1 }}>
          {busy ? "Loading..." : "Register"}
        </button>

        <div
          style={{
            marginTop: 6,
            fontSize: 13,
            opacity: 0.85,
            textAlign: "center",
          }}
        >
          Sudah punya akun?{" "}
          <Link to="/login" style={{ color: "#a78bfa", fontWeight: 700 }}>
            Login
          </Link>
        </div>
      </form>
    </div>
  );
}
