import type {
  LoginResponse,
  User,
  HostedZone,
  HostedZoneListResponse,
  RecordResponse,
  RecordListResponse,
  TagResponse,
  TagItem,
  ChangeInfoResponse,
  ApiError,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function setToken(token: string) {
  localStorage.setItem("token", token);
}

export function clearToken() {
  localStorage.removeItem("token");
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errorData = (await res.json().catch(() => null)) as ApiError | null;
    if (res.status === 401 && typeof window !== "undefined") {
      clearToken();
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    throw new Error(
      errorData?.message || `Request failed with status ${res.status}`
    );
  }

  return res.json();
}

// Auth
export const auth = {
  login: (username: string, password: string) =>
    request<LoginResponse>("POST", "/api/auth/login", { username, password }),
  logout: () => request<void>("POST", "/api/auth/logout"),
  me: () => request<User>("GET", "/api/auth/me"),
};

// Zones
export const zones = {
  list: (params?: { search?: string; page?: number; size?: number }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set("search", params.search);
    if (params?.page) q.set("page", String(params.page));
    if (params?.size) q.set("size", String(params.size));
    const qs = q.toString();
    return request<HostedZoneListResponse>("GET", `/api/zones${qs ? `?${qs}` : ""}`);
  },
  get: (id: string) => request<HostedZone>("GET", `/api/zones/${id}`),
  create: (data: { name: string; caller_reference: string; hosted_zone_config?: { comment?: string; private_zone?: boolean } }) =>
    request<HostedZone>("POST", "/api/zones", data),
  update: (id: string, data: { comment?: string }) =>
    request<HostedZone>("PUT", `/api/zones/${id}`, data),
  delete: (id: string) =>
    request<ChangeInfoResponse>("DELETE", `/api/zones/${id}`),
};

// Records
export const records = {
  list: (
    zoneId: string,
    params?: { search?: string; type?: string; page?: number; size?: number }
  ) => {
    const q = new URLSearchParams();
    if (params?.search) q.set("search", params.search);
    if (params?.type) q.set("type", params.type);
    if (params?.page) q.set("page", String(params.page));
    if (params?.size) q.set("size", String(params.size));
    const qs = q.toString();
    return request<RecordListResponse>(
      "GET",
      `/api/zones/${zoneId}/records${qs ? `?${qs}` : ""}`
    );
  },
  change: (
    zoneId: string,
    data: {
      change_batch: {
        changes: {
          action: "CREATE" | "DELETE" | "UPSERT";
          resource_record_set: {
            name: string;
            type: string;
            ttl?: number;
            resource_records?: { value: string }[];
            alias_target?: Record<string, string> | null;
          };
        }[];
        comment?: string;
      };
    }
  ) =>
    request<ChangeInfoResponse>("POST", `/api/zones/${zoneId}/records`, data),
  get: (zoneId: string, recordId: string) =>
    request<RecordResponse>("GET", `/api/zones/${zoneId}/records/${recordId}`),
  update: (zoneId: string, recordId: string, data: Record<string, unknown>) =>
    request<RecordResponse>("PUT", `/api/zones/${zoneId}/records/${recordId}`, data),
  delete: (zoneId: string, recordId: string) =>
    request<{ success: boolean }>("DELETE", `/api/zones/${zoneId}/records/${recordId}`),
};

// Tags
export const tags = {
  list: (zoneId: string) =>
    request<TagResponse>("GET", `/api/zones/${zoneId}/tags`),
  update: (zoneId: string, data: { add_tags?: TagItem[]; remove_tag_keys?: string[] }) =>
    request<TagResponse>("POST", `/api/zones/${zoneId}/tags`, data),
};

// Changes
export const changes = {
  get: (changeId: string) =>
    request<ChangeInfoResponse>("GET", `/api/changes/${changeId}`),
};
