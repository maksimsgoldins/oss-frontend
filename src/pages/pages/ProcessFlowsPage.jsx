import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";

const EMPTY_FORM = {
  source_element_id: "",
  target_element_id: "",
  flow_type: "sequenceFlow",
  label: "",
  condition_expression: "",
  is_default: false,
};

export default function ProcessFlowsPage() {
  const [processSpecs, setProcessSpecs] = useState([]);
  const [services, setServices] = useState([]);
  const [orderAims, setOrderAims] = useState([]);
  const [elements, setElements] = useState([]);
  const [flows, setFlows] = useState([]);

  const [selectedProcessId, setSelectedProcessId] = useState("");
  const [selectedFlowId, setSelectedFlowId] = useState("");
  const [isNew, setIsNew] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  async function loadAll(keepSelectionId = "") {
    try {
      const [proc, svc, aims] = await Promise.all([
        api.listProcessSpecs(),
        api.listServices(),
        api.listOrderAims(),
      ]);

      setProcessSpecs(proc);
      setServices(svc);
      setOrderAims(aims);

      const processIdToUse = selectedProcessId || proc[0]?.id || "";
      if (!selectedProcessId && processIdToUse) {
        setSelectedProcessId(processIdToUse);
      }

      if (processIdToUse) {
        await loadForProcess(processIdToUse, keepSelectionId);
      } else {
        setElements([]);
        setFlows([]);
      }
    } catch (err) {
      setError(err?.message || JSON.stringify(err));
    }
  }

  async function loadForProcess(processId, keepSelectionId = "") {
    try {
      const [elementList, flowList] = await Promise.all([
        api.listProcessElements(processId),
        api.listProcessFlows(processId),
      ]);
      setElements(elementList);
      setFlows(flowList);

      const targetId = keepSelectionId || selectedFlowId;
      if (targetId) {
        const found = flowList.find(x => x.id === targetId);
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
    setSelectedFlowId("");
    setSaved("");
    setError("");
    setForm(EMPTY_FORM);
  }

  function selectExisting(item) {
    setIsNew(false);
    setSelectedFlowId(item.id);
    setSaved("");
    setError("");
    setForm({
      source_element_id: item.source_element_id || "",
      target_element_id: item.target_element_id || "",
      flow_type: item.flow_type || "sequenceFlow",
      label: item.label || "",
      condition_expression: item.condition_expression || "",
      is_default: !!item.is_default,
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

  function elementLabel(id) {
    const el = elements.find(x => x.id === id);
    if (!el) return id;
    return `${el.element_key} (${el.element_type})`;
  }

  async function save() {
    try {
      setError("");
      setSaved("");

      if (!selectedProcessId) return setError("Select a Process Spec first.");
      if (!form.source_element_id) return setError("Source Element is required.");
      if (!form.target_element_id) return setError("Target Element is required.");

      const payloadCreate = {
        process_spec_id: selectedProcessId,
        source_element_id: form.source_element_id,
        target_element_id: form.target_element_id,
        flow_type: form.flow_type,
        label: form.label.trim() || null,
        condition_expression: form.condition_expression.trim() || null,
        is_default: !!form.is_default,
      };

      if (isNew) {
        const created = await api.createProcessFlow(payloadCreate);
        setSaved("Process Flow created.");
        await loadForProcess(selectedProcessId, created.id);
      } else {
        const payloadUpdate = {
          flow_type: payloadCreate.flow_type,
          label: payloadCreate.label,
          condition_expression: payloadCreate.condition_expression,
          is_default: payloadCreate.is_default,
        };
        await api.updateProcessFlow(selectedFlowId, payloadUpdate);
        setSaved("Process Flow updated.");
        await loadForProcess(selectedProcessId, selectedFlowId);
      }
    } catch (err) {
      setError(err?.message || JSON.stringify(err));
    }
  }

  async function remove() {
    if (!selectedFlowId || isNew) return;
    try {
      setError("");
      setSaved("");
      await api.deleteProcessFlow(selectedFlowId);
      setSaved("Process Flow deleted.");
      startNew();
      await loadForProcess(selectedProcessId);
    } catch (err) {
      setError(err?.message || JSON.stringify(err));
    }
  }

  const canCreateFlow = useMemo(() => elements.length >= 2, [elements.length]);

  return (
    <>
      <div className="panel">
        <div className="header-line">
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 4 }}>Process Flows</h2>
            <div className="muted">Sequence flows inside a selected Process Spec.</div>
          </div>
          <button className="btn" onClick={startNew} disabled={!selectedProcessId}>New Flow</button>
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
              setSelectedFlowId("");
              startNew();
              if (nextId) await loadForProcess(nextId);
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
          <h3 style={{ marginTop: 0 }}>Current Flows</h3>
          {flows.map(item => (
            <button
              key={item.id}
              className={`list-button${item.id === selectedFlowId && !isNew ? " active" : ""}`}
              onClick={() => selectExisting(item)}
            >
              <strong>{elementLabel(item.source_element_id)} → {elementLabel(item.target_element_id)}</strong>
              <br />
              <span className="muted">
                {item.flow_type} {item.label ? `• ${item.label}` : ""} {item.is_default ? "• default" : ""}
              </span>
            </button>
          ))}
          {!flows.length && <div className="muted">No Flows for the selected process.</div>}
        </div>

        <div className="panel" style={{ flex: 1 }}>
          <div className="header-line">
            <div>
              <h3 style={{ marginTop: 0, marginBottom: 4 }}>{isNew ? "New Process Flow" : "Edit Process Flow"}</h3>
              <div className="muted">{isNew ? "Create mode" : "Edit mode"}</div>
            </div>
            {!isNew && <button className="btn secondary" onClick={remove}>Delete</button>}
          </div>

          {!canCreateFlow && isNew && (
            <div className="muted" style={{ marginBottom: 12 }}>
              At least 2 Process Elements are needed before creating a flow.
            </div>
          )}

          <div className="split">
            <div className="field">
              <label>Source Element</label>
              <select
                value={form.source_element_id}
                onChange={e => onChange("source_element_id", e.target.value)}
                disabled={!isNew}
              >
                <option value="">Select Source</option>
                {elements.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.element_key} ({item.element_type})
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Target Element</label>
              <select
                value={form.target_element_id}
                onChange={e => onChange("target_element_id", e.target.value)}
                disabled={!isNew}
              >
                <option value="">Select Target</option>
                {elements.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.element_key} ({item.element_type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="split">
            <div className="field">
              <label>Flow Type</label>
              <select value={form.flow_type} onChange={e => onChange("flow_type", e.target.value)}>
                <option value="sequenceFlow">sequenceFlow</option>
              </select>
            </div>
            <div className="field">
              <label>Default</label>
              <label className="row" style={{ alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={form.is_default}
                  onChange={e => onChange("is_default", e.target.checked)}
                />
                <span>{form.is_default ? "Yes" : "No"}</span>
              </label>
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

          <div className="row">
            <button className="btn" onClick={save} disabled={isNew && !canCreateFlow}>Save</button>
          </div>

          {saved && <div className="muted" style={{ marginTop: 10 }}>{saved}</div>}
          {error && <div className="error">{error}</div>}
        </div>
      </div>
    </>
  );
}
