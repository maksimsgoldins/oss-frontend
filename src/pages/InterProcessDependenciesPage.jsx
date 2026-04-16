import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";

const DEPENDENCY_TYPES = [
  "finish_to_start",
  "start_to_start",
  "finish_to_finish",
  "start_to_finish",
];

const EMPTY_FORM = {
  source_process_spec_id: "",
  source_element_id: "",
  target_process_spec_id: "",
  target_element_id: "",
  service_relation_id: "",
  dependency_type: "finish_to_start",
  label: "",
  condition_expression: "",
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

export default function InterProcessDependenciesPage() {
  const [dependencies, setDependencies] = useState([]);
  const [processSpecs, setProcessSpecs] = useState([]);
  const [services, setServices] = useState([]);
  const [orderAims, setOrderAims] = useState([]);
  const [relations, setRelations] = useState([]);
  const [elementsByProcessId, setElementsByProcessId] = useState({});

  const [selectedId, setSelectedId] = useState("");
  const [isNew, setIsNew] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  async function loadAll(keepSelectionId = "") {
    try {
      const [deps, proc, svc, aims, rels] = await Promise.all([
        api.listInterProcessDependencies(),
        api.listProcessSpecs(),
        api.listServices(),
        api.listOrderAims(),
        api.listRelations(),
      ]);

      setDependencies(deps);
      setProcessSpecs(proc);
      setServices(svc);
      setOrderAims(aims);
      setRelations(rels);

      const elementsEntries = await Promise.all(
        proc.map(async item => {
          const els = await api.listProcessElements(item.id);
          return [item.id, els];
        })
      );
      setElementsByProcessId(Object.fromEntries(elementsEntries));

      const targetId = keepSelectionId || selectedId;
      if (targetId) {
        const found = deps.find(x => x.id === targetId);
        if (found) {
          selectExisting(found);
          return;
        }
      }

      if (deps.length && !isNew) {
        selectExisting(deps[0]);
      } else if (!selectedId) {
        startNew();
      }
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
    setSelectedId("");
    setSaved("");
    setError("");
    setForm(EMPTY_FORM);
  }

  function selectExisting(item) {
    setIsNew(false);
    setSelectedId(item.id);
    setSaved("");
    setError("");
    setForm({
      source_process_spec_id: item.source_process_spec_id || "",
      source_element_id: item.source_element_id || "",
      target_process_spec_id: item.target_process_spec_id || "",
      target_element_id: item.target_element_id || "",
      service_relation_id: item.service_relation_id || "",
      dependency_type: item.dependency_type || "finish_to_start",
      label: item.label || "",
      condition_expression: item.condition_expression || "",
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

  function elementLabel(processId, elementId) {
    const elements = elementsByProcessId[processId] || [];
    const item = elements.find(x => x.id === elementId);
    if (!item) return elementId;
    return `${item.name_override || item.element_key} (${item.element_type})`;
  }

  function relationLabel(relationId) {
    const rel = relations.find(x => x.id === relationId);
    if (!rel) return relationId;
    return `${serviceLabel(rel.parent_service_id)} / ${aimLabel(rel.parent_order_aim_id)} / ${subAimLabel(rel.parent_order_aim_id, rel.parent_order_sub_aim_id)} → ${serviceLabel(rel.child_service_id)} / ${aimLabel(rel.child_order_aim_id)} / ${subAimLabel(rel.child_order_aim_id, rel.child_order_sub_aim_id)}`;
  }

  const sourceTaskElements = useMemo(
    () => (elementsByProcessId[form.source_process_spec_id] || []).filter(x => x.element_type === "task"),
    [elementsByProcessId, form.source_process_spec_id]
  );

  const targetTaskElements = useMemo(
    () => (elementsByProcessId[form.target_process_spec_id] || []).filter(x => x.element_type === "task"),
    [elementsByProcessId, form.target_process_spec_id]
  );

  async function save() {
    try {
      setError("");
      setSaved("");

      const payloadCreate = {
        source_process_spec_id: form.source_process_spec_id,
        source_element_id: form.source_element_id,
        target_process_spec_id: form.target_process_spec_id,
        target_element_id: form.target_element_id,
        service_relation_id: form.service_relation_id || null,
        dependency_type: form.dependency_type,
        label: form.label.trim() || null,
        condition_expression: form.condition_expression.trim() || null,
        metadata_json: parseJsonField(form.metadata_json_text, "metadata_json"),
      };

      if (!payloadCreate.source_process_spec_id) return setError("Source Process is required.");
      if (!payloadCreate.source_element_id) return setError("Source Task Element is required.");
      if (!payloadCreate.target_process_spec_id) return setError("Target Process is required.");
      if (!payloadCreate.target_element_id) return setError("Target Task Element is required.");

      if (isNew) {
        const created = await api.createInterProcessDependency(payloadCreate);
        setSaved("Inter-Process Dependency created.");
        await loadAll(created.id);
      } else {
        const payloadUpdate = {
          service_relation_id: payloadCreate.service_relation_id,
          dependency_type: payloadCreate.dependency_type,
          label: payloadCreate.label,
          condition_expression: payloadCreate.condition_expression,
          metadata_json: payloadCreate.metadata_json,
        };
        await api.updateInterProcessDependency(selectedId, payloadUpdate);
        setSaved("Inter-Process Dependency updated.");
        await loadAll(selectedId);
      }
    } catch (err) {
      setError(err?.message || JSON.stringify(err));
    }
  }

  async function remove() {
    if (!selectedId || isNew) return;
    try {
      setError("");
      setSaved("");
      await api.deleteInterProcessDependency(selectedId);
      setSaved("Inter-Process Dependency deleted.");
      startNew();
      await loadAll();
    } catch (err) {
      setError(err?.message || JSON.stringify(err));
    }
  }

  return (
    <>
      <div className="panel">
        <div className="header-line">
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 4 }}>Inter-Process Dependencies</h2>
            <div className="muted">Dependencies between task elements from different processes.</div>
          </div>
          <button className="btn" onClick={startNew}>New Dependency</button>
        </div>
      </div>

      <div className="split">
        <div className="panel" style={{ minWidth: 420 }}>
          <h3 style={{ marginTop: 0 }}>Current Dependencies</h3>
          {dependencies.map(item => (
            <button
              key={item.id}
              className={`list-button${item.id === selectedId && !isNew ? " active" : ""}`}
              onClick={() => selectExisting(item)}
            >
              <strong>
                {elementLabel(item.source_process_spec_id, item.source_element_id)}
                {" → "}
                {elementLabel(item.target_process_spec_id, item.target_element_id)}
              </strong>
              <br />
              <span className="muted">
                {item.dependency_type} {item.label ? `• ${item.label}` : ""}
              </span>
            </button>
          ))}
          {!dependencies.length && <div className="muted">No Inter-Process Dependencies yet.</div>}
        </div>

        <div className="panel" style={{ flex: 1 }}>
          <div className="header-line">
            <div>
              <h3 style={{ marginTop: 0, marginBottom: 4 }}>{isNew ? "New Inter-Process Dependency" : "Edit Inter-Process Dependency"}</h3>
              <div className="muted">{isNew ? "Create mode" : "Edit mode"}</div>
            </div>
            {!isNew && <button className="btn secondary" onClick={remove}>Delete</button>}
          </div>

          <div className="split">
            <div className="field">
              <label>Source Process</label>
              <select
                value={form.source_process_spec_id}
                onChange={e => {
                  onChange("source_process_spec_id", e.target.value);
                  onChange("source_element_id", "");
                }}
                disabled={!isNew}
              >
                <option value="">Select Source Process</option>
                {processSpecs.map(item => (
                  <option key={item.id} value={item.id}>{processLabel(item)}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Source Task Element</label>
              <select
                value={form.source_element_id}
                onChange={e => onChange("source_element_id", e.target.value)}
                disabled={!isNew || !form.source_process_spec_id}
              >
                <option value="">Select Source Task</option>
                {sourceTaskElements.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name_override || item.element_key}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="split">
            <div className="field">
              <label>Target Process</label>
              <select
                value={form.target_process_spec_id}
                onChange={e => {
                  onChange("target_process_spec_id", e.target.value);
                  onChange("target_element_id", "");
                }}
                disabled={!isNew}
              >
                <option value="">Select Target Process</option>
                {processSpecs.map(item => (
                  <option key={item.id} value={item.id}>{processLabel(item)}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Target Task Element</label>
              <select
                value={form.target_element_id}
                onChange={e => onChange("target_element_id", e.target.value)}
                disabled={!isNew || !form.target_process_spec_id}
              >
                <option value="">Select Target Task</option>
                {targetTaskElements.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name_override || item.element_key}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="split">
            <div className="field">
              <label>Dependency Type</label>
              <select value={form.dependency_type} onChange={e => onChange("dependency_type", e.target.value)}>
                {DEPENDENCY_TYPES.map(x => <option key={x} value={x}>{x}</option>)}
              </select>
            </div>

            <div className="field">
              <label>Service Relation (optional)</label>
              <select value={form.service_relation_id} onChange={e => onChange("service_relation_id", e.target.value)}>
                <option value="">None</option>
                {relations.map(item => (
                  <option key={item.id} value={item.id}>{relationLabel(item.id)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label>Label</label>
            <input value={form.label} onChange={e => onChange("label", e.target.value)} />
          </div>

          <div className="field">
            <label>Condition Expression</label>
            <textarea
              value={form.condition_expression}
              onChange={e => onChange("condition_expression", e.target.value)}
              rows={6}
            />
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
