import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";

const TASK_TYPES = [
  "serviceTask",
  "userTask",
  "manualTask",
  "scriptTask",
  "callActivity",
  "sendTask",
  "receiveTask",
  "businessRuleTask",
];

const EXECUTOR_TYPES = ["", "api_call", "script", "subprocess", "manual"];

const EMPTY_FORM = {
  code: "",
  name: "",
  description: "",
  task_type: "serviceTask",
  executor_type: "",
  executor_config_json_text: "{}",
  timeout_sec: "",
  retry_policy_json_text: "{}",
  input_mapping_json_text: "{}",
  output_mapping_json_text: "{}",
  is_active: true,
};

function parseJsonField(text, fieldName) {
  const trimmed = (text || "").trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    throw new Error(`Invalid JSON in ${fieldName}`);
  }
}

function prettyJson(value) {
  if (value === null || value === undefined) return "{}";
  return JSON.stringify(value, null, 2);
}

export default function TaskSpecsPage() {
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [isNew, setIsNew] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  async function load(keepSelectionId = "") {
    try {
      const list = await api.listTaskSpecs();
      setItems(list);

      const targetId = keepSelectionId || selectedId;
      if (targetId) {
        const found = list.find(x => x.id === targetId);
        if (found) {
          selectExisting(found);
          return;
        }
      }

      if (list.length && !isNew) {
        selectExisting(list[0]);
      } else if (!selectedId) {
        startNew();
      }
    } catch (err) {
      setError(err?.message || JSON.stringify(err));
    }
  }

  useEffect(() => {
    load();
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
      code: item.code || "",
      name: item.name || "",
      description: item.description || "",
      task_type: item.task_type || "serviceTask",
      executor_type: item.executor_type || "",
      executor_config_json_text: prettyJson(item.executor_config_json),
      timeout_sec: item.timeout_sec ?? "",
      retry_policy_json_text: prettyJson(item.retry_policy_json),
      input_mapping_json_text: prettyJson(item.input_mapping_json),
      output_mapping_json_text: prettyJson(item.output_mapping_json),
      is_active: !!item.is_active,
    });
  }

  const selectedLabel = useMemo(() => {
    if (isNew) return "New Task Spec";
    const item = items.find(x => x.id === selectedId);
    return item ? `${item.name} (${item.code})` : "Task Spec";
  }, [isNew, items, selectedId]);

  function onChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function save() {
    try {
      setError("");
      setSaved("");

      const payloadCreate = {
        code: form.code.trim(),
        name: form.name.trim(),
        description: form.description.trim() || null,
        task_type: form.task_type,
        executor_type: form.executor_type || null,
        executor_config_json: parseJsonField(form.executor_config_json_text, "executor_config_json"),
        timeout_sec: form.timeout_sec === "" ? null : Number(form.timeout_sec),
        retry_policy_json: parseJsonField(form.retry_policy_json_text, "retry_policy_json"),
        input_mapping_json: parseJsonField(form.input_mapping_json_text, "input_mapping_json"),
        output_mapping_json: parseJsonField(form.output_mapping_json_text, "output_mapping_json"),
        is_active: !!form.is_active,
      };

      if (!payloadCreate.code) return setError("Code is required.");
      if (!payloadCreate.name) return setError("Name is required.");

      if (isNew) {
        const created = await api.createTaskSpec(payloadCreate);
        setSaved("Task Spec created.");
        await load(created.id);
      } else {
        const payloadUpdate = {
          name: payloadCreate.name,
          description: payloadCreate.description,
          task_type: payloadCreate.task_type,
          executor_type: payloadCreate.executor_type,
          executor_config_json: payloadCreate.executor_config_json,
          timeout_sec: payloadCreate.timeout_sec,
          retry_policy_json: payloadCreate.retry_policy_json,
          input_mapping_json: payloadCreate.input_mapping_json,
          output_mapping_json: payloadCreate.output_mapping_json,
          is_active: payloadCreate.is_active,
        };
        await api.updateTaskSpec(selectedId, payloadUpdate);
        setSaved("Task Spec updated.");
        await load(selectedId);
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
      await api.deleteTaskSpec(selectedId);
      setSaved("Task Spec deleted.");
      startNew();
      await load();
    } catch (err) {
      setError(err?.message || JSON.stringify(err));
    }
  }

  return (
    <>
      <div className="panel">
        <div className="header-line">
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 4 }}>Task Specs</h2>
            <div className="muted">Reusable orchestration task templates.</div>
          </div>
          <button className="btn" onClick={startNew}>New Task Spec</button>
        </div>
      </div>

      <div className="split">
        <div className="panel" style={{ minWidth: 320 }}>
          <h3 style={{ marginTop: 0 }}>Current Task Specs</h3>
          {items.map(item => (
            <button
              key={item.id}
              className={`list-button${item.id === selectedId && !isNew ? " active" : ""}`}
              onClick={() => selectExisting(item)}
            >
              <strong>{item.name}</strong>
              <br />
              <span className="muted">
                {item.code} • {item.task_type} • {item.is_active ? "active" : "inactive"}
              </span>
            </button>
          ))}
          {!items.length && <div className="muted">No Task Specs yet.</div>}
        </div>

        <div className="panel" style={{ flex: 1 }}>
          <div className="header-line">
            <div>
              <h3 style={{ marginTop: 0, marginBottom: 4 }}>{selectedLabel}</h3>
              <div className="muted">{isNew ? "Create mode" : "Edit mode"}</div>
            </div>
            {!isNew && <button className="btn secondary" onClick={remove}>Delete</button>}
          </div>

          <div className="split">
            <div className="field">
              <label>Code</label>
              <input value={form.code} onChange={e => onChange("code", e.target.value)} disabled={!isNew} />
            </div>
            <div className="field">
              <label>Name</label>
              <input value={form.name} onChange={e => onChange("name", e.target.value)} />
            </div>
          </div>

          <div className="split">
            <div className="field">
              <label>Task Type</label>
              <select value={form.task_type} onChange={e => onChange("task_type", e.target.value)}>
                {TASK_TYPES.map(x => <option key={x} value={x}>{x}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Executor Type</label>
              <select value={form.executor_type} onChange={e => onChange("executor_type", e.target.value)}>
                {EXECUTOR_TYPES.map(x => <option key={x} value={x}>{x || "None"}</option>)}
              </select>
            </div>
          </div>

          <div className="split">
            <div className="field">
              <label>Timeout (sec)</label>
              <input type="number" value={form.timeout_sec} onChange={e => onChange("timeout_sec", e.target.value)} />
            </div>
            <div className="field">
              <label>Status</label>
              <label className="row" style={{ alignItems: "center", gap: 8 }}>
                <input type="checkbox" checked={form.is_active} onChange={e => onChange("is_active", e.target.checked)} />
                <span>{form.is_active ? "Active" : "Inactive"}</span>
              </label>
            </div>
          </div>

          <div className="field">
            <label>Description</label>
            <textarea value={form.description} onChange={e => onChange("description", e.target.value)} rows={3} />
          </div>

          <div className="field">
            <label>Executor Config JSON</label>
            <textarea value={form.executor_config_json_text} onChange={e => onChange("executor_config_json_text", e.target.value)} rows={6} />
          </div>

          <div className="split">
            <div className="field">
              <label>Retry Policy JSON</label>
              <textarea value={form.retry_policy_json_text} onChange={e => onChange("retry_policy_json_text", e.target.value)} rows={6} />
            </div>
            <div className="field">
              <label>Input Mapping JSON</label>
              <textarea value={form.input_mapping_json_text} onChange={e => onChange("input_mapping_json_text", e.target.value)} rows={6} />
            </div>
          </div>

          <div className="field">
            <label>Output Mapping JSON</label>
            <textarea value={form.output_mapping_json_text} onChange={e => onChange("output_mapping_json_text", e.target.value)} rows={6} />
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
