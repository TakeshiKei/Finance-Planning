import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import "../styles/auth.css";

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
    } catch (e2) {
      setErr(e2.message || "Register gagal");
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
              <div className="mini">Buat akun baru</div>
            </div>
          </div>
          <h1 className="auth-title">Create account</h1>
          <p className="auth-subtitle">Isi data di bawah untuk mulai.</p>
        </div>

        <div className="auth-card__body">
          <form className="form" onSubmit={onSubmit}>
            <div className="field">
              <label>Username</label>
              <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>

            <div className="field">
              <label>Email</label>
              <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className="field">
              <label>Password</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>

            <button className="btn" disabled={busy}>
              {busy ? "Loading..." : "Register"}
            </button>

            {err && <div className="alert">Error\n{String(err)}</div>}

            <div className="divider" />
            <p className="footer-note">
              Sudah punya akun? <Link className="link" to="/login">Login</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
