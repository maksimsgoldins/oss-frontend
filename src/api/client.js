const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try { const data = await res.json(); detail = data.detail || JSON.stringify(data); } catch {}
    throw new Error(detail);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  health: () => fetch(API_BASE.replace(/\/api$/, "") + "/health").then(r => r.json()),

  listServices: () => request("/services"),
  createService: payload => request("/services", { method:"POST", body: JSON.stringify(payload) }),
  updateService: (id,payload) => request(`/services/${id}`, { method:"PUT", body: JSON.stringify(payload) }),
  deleteService: id => request(`/services/${id}`, { method:"DELETE" }),

  listOrderAims: () => request("/order-aims"),
  createOrderAim: payload => request("/order-aims", { method:"POST", body: JSON.stringify(payload) }),

  listAttributes: () => request("/attributes"),
  createAttribute: payload => request("/attributes", { method:"POST", body: JSON.stringify(payload) }),
  deleteAttribute: id => request(`/attributes/${id}`, { method:"DELETE" }),

  listServiceAimMappings: (serviceId="") => request(`/service-aim-mappings${serviceId ? `?service_id=${serviceId}` : ""}`),
  createServiceAimMapping: payload => request("/service-aim-mappings", { method:"POST", body: JSON.stringify(payload) }),
  deleteServiceAimMapping: id => request(`/service-aim-mappings/${id}`, { method:"DELETE" }),

  listRelations: (parentServiceId="") => request(`/relations${parentServiceId ? `?parent_service_id=${parentServiceId}` : ""}`),
  createRelation: payload => request("/relations", { method:"POST", body: JSON.stringify(payload) }),
  updateRelation: (id,payload) => request(`/relations/${id}`, { method:"PUT", body: JSON.stringify(payload) }),
  deleteRelation: id => request(`/relations/${id}`, { method:"DELETE" }),

  listAttributeInvolvement: (serviceId="") => request(`/attribute-involvement${serviceId ? `?service_id=${serviceId}` : ""}`),
  createAttributeInvolvement: payload => request("/attribute-involvement", { method:"POST", body: JSON.stringify(payload) }),
  updateAttributeInvolvement: (id,payload) => request(`/attribute-involvement/${id}`, { method:"PUT", body: JSON.stringify(payload) }),
  deleteAttributeInvolvement: id => request(`/attribute-involvement/${id}`, { method:"DELETE" }),

  listAttributePropagation: (relationId="") => request(`/attribute-propagation${relationId ? `?relation_id=${relationId}` : ""}`),
  createAttributePropagation: payload => request("/attribute-propagation", { method:"POST", body: JSON.stringify(payload) }),

  listDiagramLayout: () => request("/diagram-layout")
};

export { API_BASE };
