// Centralized API service — all backend calls go through here

const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

async function request(endpoint, options = {}) {
  const token = localStorage.getItem("auth_token");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${endpoint}`, {
    credentials: "include", // send cookies (JWT)
    ...options,
    headers,
  });

  const text = await res.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!res.ok) {
    throw new Error(data.message || `Server returned ${res.status}: ${res.statusText || "Error"}`);
  }

  return data;
}

// ─── Auth ──────────────────────────────────────────────────────────────────────

export async function loginUser(employeeName, password) {
  const trimmed = employeeName.trim();
  const payload = {
    employeeName: trimmed,
    username: trimmed,
    password,
  };
  if (!isNaN(trimmed) && trimmed !== "") {
    payload.employeeNo = Number(trimmed);
  }
  const res = await request("/users/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (res?.token) {
    localStorage.setItem("auth_token", res.token);
  }
  return res;
}

export function registerUser(data) {
  return request("/users/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ─── Activities ────────────────────────────────────────────────────────────────

export function getActivities(filters = {}) {
  const params = new URLSearchParams();
  if (filters.facultyId) params.set("facultyId", filters.facultyId);
  if (filters.date) params.set("date", filters.date);
  if (filters.activityLevel) params.set("activityLevel", filters.activityLevel);

  const query = params.toString();
  return request(`/activities${query ? `?${query}` : ""}`);
}

export function createActivity(data) {
  return request("/activities", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function createDailyBatch(data) {
  return request("/activities/daily-batch", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateActivity(id, data) {
  return request(`/activities/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteActivity(id) {
  return request(`/activities/${id}`, {
    method: "DELETE",
  });
}
