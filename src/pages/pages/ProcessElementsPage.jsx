import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";

const ELEMENT_TYPES = ["task", "gateway", "event"];

const EMPTY_FORM = {
  element_key: "",
  element_type: "task",
  task_spec_id: "",
  gateway_spec_id: "",
  event_spec_id: "",
  name_override: "",
  x: "",
  y: "",
  metadata_json_text: "{}",
};

function prettyJson(value) {
  if (value === null || value === undefined) return "{}";
  return JSON.stringify(value, null, 2);
}

function parseJsonField(text, fieldName) {
  const trimmed = (text || "").trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    throw new Error(`Invalid JSON in ${fieldName}`);
  }
}

export default function ProcessElementsPage() {
  const [processSpecs, setProcessSpecs] = useState([]);
  const [services, setServices] = useState([]);
  const [orderAims, setOrderAims] = useState([]);
  const [taskSpecs, setTaskSpecs] = useState([]);
  const [gatewaySpecs, setGatewaySpecs] = useState([]);
  const [eventSpecs, setEventSpecs] = useState([]);
  const [elements, setElements] = useState([]);

  const [selectedProcessId, setSelectedProcessId] = useState("");
  const [selectedElementId, setSelectedElementId] = useState("");
  const [isNew, setIsNew] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  async function loadAll(keepSelectionId = "") {
    try {
      const [proc, svc, aims, tasks, gateways, events] = await Promise.all([
        api.listProcessSpecs(),
        api.listServices(),
        api.listOrderAims(),
        api.listTaskSpecs(),
        api.listGatewaySpecs(),
        api.listEventSpecs(),
      ]);

      setProcessSpecs(proc);
      setServices(svc);
      setOrderAims(aims);
      setTaskSpecs(tasks);
      setGatewaySpecs(gateways);
      setEventSpecs(events);

      const processIdToUse = selectedProcessId || proc[0]?.id || "";
      if (!selectedProcessId && processIdToUse) {
        setSelectedProcessId(processIdToUse);
      }

      if (processIdToUse) {
        await loadElements(processIdToUse, keepSelectionId);
      } else {
        setElements([]);
      }
    } catch (err) {
      setError(err?.message || JSON.stringify(err));
    }
  }

  async function loadElements(processId, keepSelectionId = "") {
    try {
      const list = await api.listProcessElements(processId);
      setElements(list);

      const targetId = keepSelectionId || selectedElementId;
      if (targetId) {
        const found = list.find(x => x.id === targetId);
        if (found) {
          selectExisting(found);
          return;
        }
      }

      startNew();
    } catch (err) {
      setError(err?.message || JSON.stringify(err));
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startNew() {
    setIsNew(true);
    setSelectedElementId("");
    setSaved("");
    setError("");
    setForm(EMPTY_FORM);
  }

  function selectExisting(item) {
    setIsNew(false);
    setSelectedElementId(item.id);
    setSaved("");
    setError("");
    setForm({
      element_key: item.element_key || "",
      element_type: item.element_type || "task",
      task_spec_id: item.task_spec_id || "",
      gateway_spec_id: item.gateway_spec_id || "",
      event_spec_id: item.event_spec_id || "",
      name_override: item.name_override || "",
      x: item.x ?? "",
      y: item.y ?? "",
      metadata_json_text: prettyJson(item.metadata_json),
    });
  }

  function onChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function serviceLabel(serviceId) {
    const svc = services.find(x => x.id === serviceId);
    return svc ? `${svc.name} (${svc.type})` : serviceId;
  }

  function aimLabel(aimId) {
    const aim = orderAims.find(x => x.id === aimId);
    return aim ? (aim.name || aim.code) : aimId;
  }

  function subAimLabel(aimId, subAimId) {
    const aim = orderAims.find(x => x.id === aimId);
    const sub = aim?.sub_aims?.find(x => x.id === subAimId);
    return sub ? (sub.name || sub.code) : subAimId;
  }

  function processLabel(item) {
    return `${item.name} • ${serviceLabel(item.service_spec_id)} / ${aimLabel(item.order_aim_id)} / ${subAimLabel(item.order_aim_id, item.order_sub_aim_id)}`;
  }

  function referencedSpecLabel(item) {
    if (item.element_type === "task") {
      const task = taskSpecs.find(x => x.id === item.task_spec_id);
      return task ? `${task.name} (${task.code})` : "Task spec";
    }
    if (item.element_type === "gateway") {
      const gateway = gatewaySpecs.find(x => x.id === item.gateway_spec_id);
      return gateway ? `${gateway.name} (${gateway.code})` : "Gateway spec";
    }
    const event = eventSpecs.find(x => x.id === item.event_spec_id);
    return event ? `${event.name} (${event.code})` : "Event spec";
  }

  function clearRefFields(elementType) {
    if (elementType === "task") {
      onChange("gateway_spec_id", "");
      onChange("event_spec_id", "");
    } else if (elementType === "gateway") {
      onChange("task_spec_id", "");
      onChange("event_spec_id", "");
    } else {
      onChange("task_spec_id", "");
      onChange("gateway_spec_id", "");
    }
  }

  async function save() {
    try {
      setError("");
      setSaved("");

      if (!selectedProcessId) return setError("Select a Process Spec first.");
      if (!form.element_key.trim()) return setError("Element key is required.");

      const payloadCreate = {
        process_spec_id: selectedProcessId,
        element_key: form.element_key.trim(),
        element_type: form.element_type,
        task_spec_id: form.element_type === "task" ? (form.task_spec_id || null) : null,
        gateway_spec_id: form.element_type === "gateway" ? (form.gateway_spec_id || null) : null,
        event_spec_id: form.element_type === "event" ? (form.event_spec_id || null) : null,
        name_override: form.name_override.trim() || null,
        x: form.x === "" ? null : Number(form.x),
        y: form.y === "" ? null : Number(form.y),
        metadata_json: parseJsonField(form.metadata_json_text, "metadata_json"),
      };

      if (payloadCreate.element_type === "task" && !payloadCreate.task_spec_id) {
        return setError("Task Spec is required for task element.");
      }
      if (payloadCreate.element_type === "gateway" && !payloadCreate.gateway_spec_id) {
        return setError("Gateway Spec is required for gateway element.");
      }
      if (payloadCreate.element_type === "event" && !payloadCreate.event_spec_id) {
        return setError("Event Spec is required for event element.");
      }

      if (isNew) {
        const created = await api.createProcessElement(payloadCreate);
        setSaved("Process Element created.");
        await loadElements(selectedProcessId, created.id);
      } else {
        const payloadUpdate = {
          name_override: payloadCreate.name_override,
          x: payloadCreate.x,
          y: payloadCreate.y,
          metadata_json: payloadCreate.metadata_json,
        };
        await api.updateProcessElement(selectedElementId, payloadUpdate);
        setSaved("Process Element updated.");
        await loadElements(selectedProcessId, selectedElementId);
      }
    } catch (err) {
      setError(err?.message || JSON.stringify(err));
    }
  }

  async function remove() {
    if (!selectedElementId || isNew) return;
    try {
      setError("");
      setSaved("");
      await api.deleteProcessElement(selectedElementId);
      setSaved("Process Element deleted.");
      startNew();
      await loadElements(selectedProcessId);
    } catch (err) {
      setError(err?.message || JSON.stringify(err));
    }
  }

  return (
    <>
      <div className="panel">
        <div className="header-line">
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 4 }}>Process Elements</h2>
            <div className="muted">Elements inside a selected Process Spec.</div>
          </div>
          <button className="btn" onClick={startNew} disabled={!selectedProcessId}>New Element</button>
        </div>
      </div>

      <div className="panel">
        <div className="field">
          <label>Process Spec</label>
          <select
            value={selectedProcessId}
            onChange={async e => {
              const nextId = e.target.value;
              setSelectedProcessId(nextId);
              setSelectedElementId("");
              startNew();
              if (nextId) await loadElements(nextId);
            }}
          >
            <option value="">Select Process Spec</option>
            {processSpecs.map(item => (
              <option key={item.id} value={item.id}>{processLabel(item)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="split">
        <div className="panel" style={{ minWidth: 360 }}>
          <h3 style={{ marginTop: 0 }}>Current Elements</h3>
          {elements.map(item => (
            <button
              key={item.id}
              className={`list-button${item.id === selectedElementId && !isNew ? " active" : ""}`}
              onClick={() => selectExisting(item)}
            >
              <strong>{item.element_key}</strong>
              <br />
              <span className="muted">{item.element_type} • {referencedSpecLabel(item)}</span>
            </button>
          ))}
          {!elements.length && <div className="muted">No Elements for the selected process.</div>}
        </div>

        <div className="panel" style={{ flex: 1 }}>
          <div className="header-line">
            <div>
              <h3 style={{ marginTop: 0, marginBottom: 4 }}>{isNew ? "New Process Element" : "Edit Process Element"}</h3>
              <div className="muted">{isNew ? "Create mode" : "Edit mode"}</div>
            </div>
            {!isNew && <button className="btn secondary" onClick={remove}>Delete</button>}
          </div>

          <div className="split">
            <div className="field">
              <label>Element Key</label>
              <input
                value={form.element_key}
                onChange={e => onChange("element_key", e.target.value)}
                disabled={!isNew}
                placeholder="reserve_msisdn"
              />
            </div>
            <div className="field">
              <label>Element Type</label>
              <select
                value={form.element_type}
                onChange={e => {
                  onChange("element_type", e.target.value);
                  clearRefFields(e.target.value);
                }}
                disabled={!isNew}
              >
                {ELEMENT_TYPES.map(x => <option key={x} value={x}>{x}</option>)}
              </select>
            </div>
          </div>

          {form.element_type === "task" && (
            <div className="field">
              <label>Task Spec</label>
              <select value={form.task_spec_id} onChange={e => onChange("task_spec_id", e.target.value)} disabled={!isNew}>
                <option value="">Select Task Spec</option>
                {taskSpecs.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.code}) • {item.task_type}
                  </option>
                ))}
              </select>
            </div>
          )}

          {form.element_type === "gateway" && (
            <div className="field">
              <label>Gateway Spec</label>
              <select value={form.gateway_spec_id} onChange={e => onChange("gateway_spec_id", e.target.value)} disabled={!isNew}>
                <option value="">Select Gateway Spec</option>
                {gatewaySpecs.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.code}) • {item.gateway_type}
                  </option>
                ))}
              </select>
            </div>
          )}

          {form.element_type === "event" && (
            <div className="field">
              <label>Event Spec</label>
              <select value={form.event_spec_id} onChange={e => onChange("event_spec_id", e.target.value)} disabled={!isNew}>
                <option value="">Select Event Spec</option>
                {eventSpecs.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.code}) • {item.event_type}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="field">
            <label>Name Override</label>
            <input value={form.name_override} onChange={e => onChange("name_override", e.target.value)} />
          </div>

          <div className="split">
            <div className="field">
              <label>X</label>
              <input type="number" value={form.x} onChange={e => onChange("x", e.target.value)} />
            </div>
            <div className="field">
              <label>Y</label>
              <input type="number" value={form.y} onChange={e => onChange("y", e.target.value)} />
            </div>
          </div>

          <div className="field">
            <label>Metadata JSON</label>
            <textarea
              value={form.metadata_json_text}
              onChange={e => onChange("metadata_json_text", e.target.value)}
              rows={8}
            />
          </div>

          <div className="row">
            <button className="btn" onClick={save}>Save</button>
          </div>

          {saved && <div className="muted" style={{ marginTop: 10 }}>{saved}</div>}
          {error && <div className="error">{error}</div>}
        </div>
      </div>
    </>
  );
}
