import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import "../styles/auth.css";

export default function Login() {
  const nav = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const res = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier, password }),
      });
      localStorage.setItem("token", res.access_token);
      nav("/setup-income");
    } catch (e2) {
      setErr(e2.message || "Login gagal");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__top">
          <div className="brand">
            <div className="brand-badge" />
            <div>
              <div className="brand-title">Financial Planner</div>
              <div className="mini">Login untuk lanjut budgeting</div>
            </div>
          </div>
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Masuk pakai username atau email.</p>
        </div>

        <div className="auth-card__body">
          <form className="form" onSubmit={onSubmit}>
            <div className="field">
              <label>Username / Email</label>
              <input className="input" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
            </div>

            <div className="field">
              <div className="row">
                <label>Password</label>
                <span className="mini">min. 6 karakter</span>
              </div>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>

            <button className="btn" disabled={busy}>
              {busy ? "Loading..." : "Login"}
            </button>

            {err && <div className="alert">Error\n{String(err)}</div>}

            <div className="divider" />
            <p className="footer-note">
              Belum punya akun? <Link className="link" to="/register">Register</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
