// src/pages/Transactions.jsx
import { useEffect, useMemo, useState } from "react";
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

function fmtDateTimeID(dtStr) {
  if (!dtStr) return "";

  // Normalisasi ke ISO biar Date() konsisten
  // - kalau backend kirim "2026-02-03 03:18:15" -> jadi "2026-02-03T03:18:15"
  let s = String(dtStr).replace(" ", "T");

  // Kalau string TIDAK punya timezone (Z / +07:00 / -xx:xx),
  // anggap itu UTC dulu (umum di backend), lalu convert ke WIB saat display.
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

function toMs(dtStr) {
  if (!dtStr) return 0;
  let s = String(dtStr).replace(" ", "T");
  const hasTz = /Z$|[+-]\d{2}:\d{2}$/.test(s);
  if (!hasTz) s = s + "Z";
  const d = new Date(s);
  const t = d.getTime();
  return Number.isFinite(t) ? t : 0;
}

function Card({ title, right, children }) {
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
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        <div style={{ fontWeight: 900 }}>{title}</div>
        {right ? <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>{right}</div> : null}
      </div>
      {children}
    </div>
  );
}

export default function Transactions() {
  const nav = useNavigate();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  // ✅ Search + Sort + Filter
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState("all"); // all | needs | ...
  const [sortBy, setSortBy] = useState("date_desc"); // date_desc default
  // alternatif: pakai 2 state sortField + sortDir; tapi biar simpel pakai 1 string.

  // edit
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({
    text: "",
    amount: "",
    category: "needs",
  });
  const [busyEdit, setBusyEdit] = useState(false);
  const [busyDelete, setBusyDelete] = useState(false);

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

  async function loadAll() {
    setLoading(true);
    setErr("");
    setMsg("");
    try {
      const list = await api("/transactions", { method: "GET" });
      setRecords(Array.isArray(list) ? list : []);
    } catch (e) {
      setErr(e?.message || "Gagal load transaksi");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  function startEdit(tx) {
    setErr("");
    setMsg("");
    setEditingId(tx.id);
    setEditDraft({
      text: tx.text ?? "",
      amount: String(tx.amount ?? ""),
      category: tx.category ?? "needs",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft({ text: "", amount: "", category: "needs" });
  }

  async function updateTransactionRequest(txId) {
    setErr("");
    setMsg("");

    const n = Number(editDraft.amount);
    if (!editDraft.text.trim()) return setErr("Teks transaksi kosong.");
    if (!Number.isFinite(n) || n <= 0) return setErr("Nominal harus angka > 0.");
    if (!CATS.includes(editDraft.category)) return setErr("Kategori tidak valid.");

    setBusyEdit(true);
    try {
      await api(`/transactions/${txId}`, {
        method: "PUT",
        body: JSON.stringify({
          text: editDraft.text.trim(),
          amount: Math.floor(n),
          category: editDraft.category,
        }),
      });
      setMsg("✅ Transaksi berhasil diupdate");
      cancelEdit();
      await loadAll();
    } catch (e) {
      setErr(e?.message || "Gagal update transaksi");
    } finally {
      setBusyEdit(false);
    }
  }

  async function deleteTransactionRequest(txId) {
    setErr("");
    setMsg("");

    setBusyDelete(true);
    try {
      await api(`/transactions/${txId}`, { method: "DELETE" });
      setMsg("✅ Transaksi berhasil dihapus");
      if (editingId === txId) cancelEdit();
      await loadAll();
    } catch (e) {
      setErr(e?.message || "Gagal hapus transaksi");
    } finally {
      setBusyDelete(false);
    }
  }

  const statsAll = useMemo(() => {
    const total = records.reduce((a, b) => a + Number(b.amount || 0), 0);
    return { total, count: records.length };
  }, [records]);

  const filteredSorted = useMemo(() => {
    const qq = q.trim().toLowerCase();

    let arr = Array.isArray(records) ? [...records] : [];

    // filter category
    if (catFilter !== "all") {
      arr = arr.filter((r) => String(r.category || "").toLowerCase() === catFilter);
    }

    // search
    if (qq) {
      arr = arr.filter((r) => {
        const text = String(r.text || "").toLowerCase();
        const cat = String(r.category || "").toLowerCase();
        const amt = String(r.amount ?? "").toLowerCase();
        return text.includes(qq) || cat.includes(qq) || amt.includes(qq);
      });
    }

    // sort
    const sort = String(sortBy || "date_desc");

    const cmpText = (a, b) => String(a || "").localeCompare(String(b || ""), "id-ID", { sensitivity: "base" });
    const cmpNum = (a, b) => Number(a || 0) - Number(b || 0);

    arr.sort((A, B) => {
      if (sort === "date_desc") return toMs(B.created_at) - toMs(A.created_at);
      if (sort === "date_asc") return toMs(A.created_at) - toMs(B.created_at);

      if (sort === "amount_desc") return cmpNum(B.amount, A.amount);
      if (sort === "amount_asc") return cmpNum(A.amount, B.amount);

      if (sort === "cat_asc") return cmpText(A.category, B.category);
      if (sort === "cat_desc") return cmpText(B.category, A.category);

      if (sort === "text_asc") return cmpText(A.text, B.text);
      if (sort === "text_desc") return cmpText(B.text, A.text);

      return toMs(B.created_at) - toMs(A.created_at);
    });

    return arr;
  }, [records, q, catFilter, sortBy]);

  const statsView = useMemo(() => {
    const total = filteredSorted.reduce((a, b) => a + Number(b.amount || 0), 0);
    return { total, count: filteredSorted.length };
  }, [filteredSorted]);

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

    if (variant === "danger") {
      return {
        ...base,
        background: "rgba(239,68,68,0.15)",
        color: "#fff",
        fontWeight: 900,
      };
    }

    if (variant === "ghost") {
      return {
        ...base,
        background: "transparent",
        border: "1px solid rgba(255,255,255,0.12)",
        color: "#fff",
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
    fontFamily: "inherit",
  };

  const selectStyle = {
    height: 44,
    padding: "0 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    outline: "none",
    fontFamily: "inherit",
  };

  function resetFilters() {
    setQ("");
    setCatFilter("all");
    setSortBy("date_desc");
  }

  return (
    <div style={pageStyle} className="tx-page">
      <style>{`
        /* Responsive helpers (Transactions) */
        @media (max-width: 820px) {
          .tx-toolbar { grid-template-columns: 1fr !important; }
          .tx-toolbar > div { width: 100%; }
        }
        @media (max-width: 640px) {
          .tx-page { padding: 16px !important; }
          .tx-header { flex-direction: column; align-items: stretch !important; }
          .tx-header-actions { width: 100%; justify-content: flex-start !important; }
          .tx-row { grid-template-columns: 1fr !important; }
          .tx-actions { width: 100%; justify-content: flex-start !important; gap: 10px !important; }
          .tx-amount { width: 100%; }
          .tx-actions > button { flex: 1 1 0; }
          .tx-editgrid { grid-template-columns: 1fr !important; }
          .tx-toolbar-actions { flex-direction: column; align-items: stretch !important; }
          .tx-toolbar-actions > * { width: 100%; }
        }
        @media (max-width: 380px) {
          .tx-actions { flex-direction: column; align-items: stretch !important; }
          .tx-actions > button { width: 100%; }
        }
      `}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gap: 16 }}>
        {/* header */}
        <div
          className="tx-header"
          style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}
        >
          <div>
            <div style={{ opacity: 0.8, fontSize: 13 }}>Financial Planning</div>
            <h1 style={{ margin: "6px 0 0", fontSize: 34 }}>Riwayat Transaksi</h1>
            <div style={{ marginTop: 6, opacity: 0.85, fontSize: 13, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div>
                Semua: <b>Rp {formatIDR(statsAll.total)}</b> · {statsAll.count} transaksi
              </div>
              <div style={{ opacity: 0.75 }}>•</div>
              <div>
                Tampil: <b>Rp {formatIDR(statsView.total)}</b> · {statsView.count} transaksi
              </div>
            </div>
          </div>

          <div className="tx-header-actions" style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <button onClick={() => nav("/dashboard")} style={btnStyle("soft")}>
              Kembali
            </button>
          </div>
        </div>

        {/* alerts */}
        {err && <div style={pillStyle("err")}>{err}</div>}
        {msg && <div style={pillStyle("ok")}>{msg}</div>}

        <Card
          title="Daftar Transaksi"
          right={
            <div className="tx-toolbar-actions" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={loadAll} style={btnStyle("soft")} disabled={loading}>
                {loading ? "Loading..." : "Refresh"}
              </button>
            <button onClick={resetFilters} style={btnStyle("ghost")} title="Reset search & filter">
              Reset
            </button>
            </div>
          }
        >
          {/* Toolbar: Search + Filter + Sort */}
          <div
            className="tx-toolbar"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 12,
              marginBottom: 14,
              alignItems: "start",
            }}
          >
            <div style={{ display: "grid", gap: 10 }}>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder='Search: "makan", "debts", "250000"...'
                style={inputStyle}
              />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} style={selectStyle}>
                  <option value="all" style={{ color: "#000" }}>
                    Semua kategori
                  </option>
                  {CATS.map((c) => (
                    <option key={c} value={c} style={{ color: "#000" }}>
                      {cap(c)}
                    </option>
                  ))}
                </select>

                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={selectStyle}>
                  <option value="date_desc" style={{ color: "#000" }}>
                    Sort: Tanggal (terbaru)
                  </option>
                  <option value="date_asc" style={{ color: "#000" }}>
                    Sort: Tanggal (terlama)
                  </option>
                  <option value="amount_desc" style={{ color: "#000" }}>
                    Sort: Nominal (terbesar)
                  </option>
                  <option value="amount_asc" style={{ color: "#000" }}>
                    Sort: Nominal (terkecil)
                  </option>
                  <option value="cat_asc" style={{ color: "#000" }}>
                    Sort: Kategori (A-Z)
                  </option>
                  <option value="cat_desc" style={{ color: "#000" }}>
                    Sort: Kategori (Z-A)
                  </option>
                  <option value="text_asc" style={{ color: "#000" }}>
                    Sort: Teks (A-Z)
                  </option>
                  <option value="text_desc" style={{ color: "#000" }}>
                    Sort: Teks (Z-A)
                  </option>
                </select>
              </div>

              {(q.trim() || catFilter !== "all") && (
                <div style={{ fontSize: 12, opacity: 0.75 }}>
                  Menampilkan <b>{statsView.count}</b> transaksi dari <b>{statsAll.count}</b>.
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div style={{ opacity: 0.75 }}>Loading...</div>
          ) : filteredSorted.length === 0 ? (
            <div style={{ opacity: 0.75 }}>
              Tidak ada transaksi yang cocok{q.trim() || catFilter !== "all" ? " dengan filter/search." : "."}
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {filteredSorted.map((tx) => {
                const isEditing = editingId === tx.id;

                return (
                  <div
                    key={tx.id}
                    style={{
                      padding: 14,
                      borderRadius: 16,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(0,0,0,0.16)",
                      display: "grid",
                      gap: 12,
                    }}
                  >
                    {!isEditing ? (
                      <div
                        className="tx-row"
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr auto",
                          gap: 14,
                          alignItems: "center",
                        }}
                      >
                        {/* kiri */}
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 900,
                              fontSize: 16,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {tx.text}
                            <span style={{ opacity: 0.7, fontWeight: 700 }}> — {cap(tx.category)}</span>
                          </div>
                          {tx.created_at && (
                            <div style={{ marginTop: 6, opacity: 0.75, fontSize: 12 }}>
                              {fmtDateTimeID(tx.created_at)}
                            </div>
                          )}
                        </div>

                        {/* kanan */}
                        <div
                          className="tx-actions"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            justifyContent: "flex-end",
                            flexWrap: "wrap",
                          }}
                        >
                          <div className="tx-amount" style={{ fontWeight: 900, fontSize: 16 }}>
                            Rp {formatIDR(tx.amount)}
                          </div>

                          <button onClick={() => startEdit(tx)} style={btnStyle("soft")}>
                            Edit
                          </button>

                          <button
                            disabled={busyDelete}
                            onClick={() => {
                              openConfirm({
                                title: "Hapus transaksi?",
                                danger: true,
                                confirmText: "Ya, hapus",
                                cancelText: "Batal",
                                message: (
                                  <div style={{ display: "grid", gap: 10 }}>
                                    <div style={{ opacity: 0.9 }}>Kamu yakin mau hapus transaksi ini?</div>
                                    <div
                                      style={{
                                        padding: 12,
                                        borderRadius: 12,
                                        background: "rgba(255,255,255,0.06)",
                                        border: "1px solid rgba(255,255,255,0.12)",
                                      }}
                                    >
                                      <div>
                                        <b>Teks:</b> {tx.text}
                                      </div>
                                      <div>
                                        <b>Nominal:</b> Rp {formatIDR(tx.amount)}
                                      </div>
                                      <div>
                                        <b>Kategori:</b> {tx.category}
                                      </div>
                                    </div>
                                  </div>
                                ),
                                action: async () => {
                                  await deleteTransactionRequest(tx.id);
                                },
                              });
                            }}
                            style={{ ...btnStyle("danger"), opacity: busyDelete ? 0.7 : 1 }}
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    ) : (
                      // EDIT MODE
                      <div style={{ display: "grid", gap: 12 }}>
                        <div
                          className="tx-editgrid"
                          style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 12 }}
                        >
                          <input
                            value={editDraft.text}
                            onChange={(e) => setEditDraft((p) => ({ ...p, text: e.target.value }))}
                            style={inputStyle}
                            placeholder="Deskripsi transaksi"
                          />
                          <input
                            value={editDraft.amount}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const digitsOnly = raw.replace(/\D/g, "");
                              const cleaned = digitsOnly.replace(/^0+(?=\d)/, "");
                              setEditDraft((p) => ({ ...p, amount: cleaned }));
                            }}
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="Nominal"
                            style={inputStyle}
                          />
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr auto",
                            gap: 12,
                            alignItems: "center",
                          }}
                        >
                          <select
                            value={editDraft.category}
                            onChange={(e) => setEditDraft((p) => ({ ...p, category: e.target.value }))}
                            style={{
                              padding: 12,
                              borderRadius: 12,
                              border: "1px solid rgba(255,255,255,0.18)",
                              background: "rgba(255,255,255,0.06)",
                              color: "#fff",
                              outline: "none",
                              fontFamily: "inherit",
                              height: 44,
                            }}
                          >
                            {CATS.map((c) => (
                              <option key={c} value={c} style={{ color: "#000" }}>
                                {cap(c)}
                              </option>
                            ))}
                          </select>

                          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
                            <button onClick={cancelEdit} style={btnStyle("soft")}>
                              Batal
                            </button>

                            <button
                              disabled={busyEdit}
                              onClick={() => {
                                openConfirm({
                                  title: "Simpan perubahan?",
                                  confirmText: "Ya, update",
                                  cancelText: "Batal",
                                  message: (
                                    <div style={{ display: "grid", gap: 10 }}>
                                      <div style={{ opacity: 0.85 }}>Ini akan mengubah transaksi yang sudah tersimpan.</div>
                                      <div
                                        style={{
                                          padding: 12,
                                          borderRadius: 12,
                                          background: "rgba(255,255,255,0.06)",
                                          border: "1px solid rgba(255,255,255,0.12)",
                                        }}
                                      >
                                        <div>
                                          <b>Teks:</b> {editDraft.text || "-"}
                                        </div>
                                        <div>
                                          <b>Nominal:</b> Rp {formatIDR(Number(editDraft.amount || 0))}
                                        </div>
                                        <div>
                                          <b>Kategori:</b> {editDraft.category}
                                        </div>
                                      </div>
                                    </div>
                                  ),
                                  action: async () => {
                                    await updateTransactionRequest(tx.id);
                                  },
                                });
                              }}
                              style={{ ...btnStyle("primary"), opacity: busyEdit ? 0.7 : 1 }}
                            >
                              {busyEdit ? "Updating..." : "Update"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

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
