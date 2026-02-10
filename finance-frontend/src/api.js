// src/api.js
const BASE_URL = "http://127.0.0.1:8000";
// const BASE_URL = "http://10.68.109.174:8000";

function formatFastApiDetail(detail) {
  // detail bisa string | {detail:...} | array pydantic errors
  if (!detail) return "";

  // Kalau Pydantic validation error: array of { loc, msg, type }
  if (Array.isArray(detail)) {
    const lines = detail.map((e) => {
      const loc = Array.isArray(e.loc) ? e.loc : [];
      // buang prefix "body"
      const cleanLoc = loc.filter((x) => x !== "body");
      const field = cleanLoc.join(".") || "input";
      const msg = e.msg || "Invalid input";
      return `${field}: ${msg}`;
    });
    return lines.join("\n");
  }

  if (typeof detail === "string") return detail;

  // kadang bentuk object lain
  if (typeof detail === "object") {
    if (typeof detail.message === "string") return detail.message;
    try {
      return JSON.stringify(detail);
    } catch {
      return String(detail);
    }
  }

  return String(detail);
}

export async function api(path, options = {}) {
  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  let data = null;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) data = await res.json().catch(() => null);
  else data = await res.text().catch(() => null);

  if (!res.ok) {
    // FastAPI biasanya: { detail: ... }
    const detail =
      data && typeof data === "object" && "detail" in data ? data.detail : data;

    const msg = formatFastApiDetail(detail) || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data;
}
