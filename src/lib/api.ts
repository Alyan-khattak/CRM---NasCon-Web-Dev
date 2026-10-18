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
}

export function isLoggedIn(type: "workspace" | "platform" = "workspace"): boolean {
  return !!getToken(type);
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
