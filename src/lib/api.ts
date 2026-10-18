const BASE = "/api";

function getToken(type: "workspace" | "platform" = "workspace"): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(type === "platform" ? "platform_token" : "crm_token");
}

export function setToken(token: string, type: "workspace" | "platform" = "workspace") {
  localStorage.setItem(type === "platform" ? "platform_token" : "crm_token", token);
}

export function clearToken(type: "workspace" | "platform" = "workspace") {
  localStorage.removeItem(type === "platform" ? "platform_token" : "crm_token");
  if (type === "workspace") {
    localStorage.removeItem("crm_refresh_token");
    localStorage.removeItem("crm_role");
    localStorage.removeItem("crm_user_id");
    localStorage.removeItem("crm_workspace_name");
    localStorage.removeItem("crm_workspace_slug");
  }
}

export function isLoggedIn(type: "workspace" | "platform" = "workspace"): boolean {
  return !!getToken(type);
}

export function decodeJwt(token: string): Record<string, unknown> {
  try {
    const b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(b64));
  } catch { return {}; }
}

export function getRole(): number {
  if (typeof window === "undefined") return 3;
  return parseInt(localStorage.getItem("crm_role") ?? "3", 10);
}

export function getUserId(): number | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem("crm_user_id");
  return v ? parseInt(v, 10) : null;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  tokenType: "workspace" | "platform" = "workspace"
): Promise<T> {
  const token = getToken(tokenType);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken(tokenType);
    window.location.href = tokenType === "platform" ? "/platform/login" : "/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// convenience
export const api = {
  get: <T>(path: string, tokenType?: "workspace" | "platform") =>
    request<T>(path, { method: "GET" }, tokenType),
  post: <T>(path: string, body?: unknown, tokenType?: "workspace" | "platform") =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }, tokenType),
  patch: <T>(path: string, body?: unknown, tokenType?: "workspace" | "platform") =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }, tokenType),
  put: <T>(path: string, body?: unknown, tokenType?: "workspace" | "platform") =>
    request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }, tokenType),
  delete: <T>(path: string, tokenType?: "workspace" | "platform") =>
    request<T>(path, { method: "DELETE" }, tokenType),
};
