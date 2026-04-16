const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      detail = data.detail || JSON.stringify(data);
    } catch {}
    throw new Error(detail);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  health: () => fetch(API_BASE.replace(/\/api$/, "") + "/health").then(r => r.json()),

  // Catalog
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

  listDiagramLayout: () => request("/diagram-layout"),
  replaceDiagramLayout: payload => request("/diagram-layout", { method:"PUT", body: JSON.stringify(payload) }),

  // Orchestrator
  listTaskSpecs: (taskType="", isActive="") => {
    const params = new URLSearchParams();
    if (taskType) params.set("task_type", taskType);
    if (isActive !== "") params.set("is_active", String(isActive));
    const qs = params.toString();
    return request(`/task-specs${qs ? `?${qs}` : ""}`);
  },
  createTaskSpec: payload => request("/task-specs", { method:"POST", body: JSON.stringify(payload) }),
  updateTaskSpec: (id,payload) => request(`/task-specs/${id}`, { method:"PUT", body: JSON.stringify(payload) }),
  deleteTaskSpec: id => request(`/task-specs/${id}`, { method:"DELETE" }),

  listGatewaySpecs: () => request("/gateway-specs"),
  createGatewaySpec: payload => request("/gateway-specs", { method:"POST", body: JSON.stringify(payload) }),
  updateGatewaySpec: (id,payload) => request(`/gateway-specs/${id}`, { method:"PUT", body: JSON.stringify(payload) }),
  deleteGatewaySpec: id => request(`/gateway-specs/${id}`, { method:"DELETE" }),

  listEventSpecs: () => request("/event-specs"),
  createEventSpec: payload => request("/event-specs", { method:"POST", body: JSON.stringify(payload) }),
  updateEventSpec: (id,payload) => request(`/event-specs/${id}`, { method:"PUT", body: JSON.stringify(payload) }),
  deleteEventSpec: id => request(`/event-specs/${id}`, { method:"DELETE" }),

  listProcessSpecs: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.service_spec_id) params.set("service_spec_id", filters.service_spec_id);
    if (filters.order_aim_id) params.set("order_aim_id", filters.order_aim_id);
    if (filters.order_sub_aim_id) params.set("order_sub_aim_id", filters.order_sub_aim_id);
    if (filters.status) params.set("status", filters.status);
    const qs = params.toString();
    return request(`/process-specs${qs ? `?${qs}` : ""}`);
  },
  createProcessSpec: payload => request("/process-specs", { method:"POST", body: JSON.stringify(payload) }),
  updateProcessSpec: (id,payload) => request(`/process-specs/${id}`, { method:"PUT", body: JSON.stringify(payload) }),
  deleteProcessSpec: id => request(`/process-specs/${id}`, { method:"DELETE" }),

  listProcessElements: (processSpecId="") => request(`/process-elements${processSpecId ? `?process_spec_id=${processSpecId}` : ""}`),
  createProcessElement: payload => request("/process-elements", { method:"POST", body: JSON.stringify(payload) }),
  updateProcessElement: (id,payload) => request(`/process-elements/${id}`, { method:"PUT", body: JSON.stringify(payload) }),
  deleteProcessElement: id => request(`/process-elements/${id}`, { method:"DELETE" }),

  listProcessFlows: (processSpecId="") => request(`/process-flows${processSpecId ? `?process_spec_id=${processSpecId}` : ""}`),
  createProcessFlow: payload => request("/process-flows", { method:"POST", body: JSON.stringify(payload) }),
  updateProcessFlow: (id,payload) => request(`/process-flows/${id}`, { method:"PUT", body: JSON.stringify(payload) }),
  deleteProcessFlow: id => request(`/process-flows/${id}`, { method:"DELETE" }),

  listInterProcessDependencies: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.source_process_spec_id) params.set("source_process_spec_id", filters.source_process_spec_id);
    if (filters.target_process_spec_id) params.set("target_process_spec_id", filters.target_process_spec_id);
    if (filters.service_relation_id) params.set("service_relation_id", filters.service_relation_id);
    const qs = params.toString();
    return request(`/inter-process-dependencies${qs ? `?${qs}` : ""}`);
  },
  createInterProcessDependency: payload => request("/inter-process-dependencies", { method:"POST", body: JSON.stringify(payload) }),
  updateInterProcessDependency: (id,payload) => request(`/inter-process-dependencies/${id}`, { method:"PUT", body: JSON.stringify(payload) }),
  deleteInterProcessDependency: id => request(`/inter-process-dependencies/${id}`, { method:"DELETE" })
};

export { API_BASE };
