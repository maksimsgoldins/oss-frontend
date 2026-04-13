const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      detail = data.detail || JSON.stringify(data);
    } catch (_) {}
    throw new Error(detail);
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  health: () => fetch(API_BASE.replace(/\/api$/, "") + "/health").then(r => r.json()),

  listServices: () => request("/services"),
  createService: (payload) => request("/services", { method: "POST", body: JSON.stringify(payload) }),
  updateService: (id, payload) => request(`/services/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteService: (id) => request(`/services/${id}`, { method: "DELETE" }),

  listOrderAims: () => request("/order-aims"),
  createOrderAim: (payload) => request("/order-aims", { method: "POST", body: JSON.stringify(payload) }),

  listAttributes: () => request("/attributes"),
  createAttribute: (payload) => request("/attributes", { method: "POST", body: JSON.stringify(payload) }),

  listAttributeInvolvement: () => request("/attribute-involvement"),
  listRelations: () => request("/relations"),
  listDiagramLayout: () => request("/diagram-layout")
};

export { API_BASE };
