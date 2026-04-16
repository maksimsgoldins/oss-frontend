import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";

const STATUS_VALUES = ["draft", "active", "retired"];

const EMPTY_FORM = {
  code: "",
  name: "",
  description: "",
  version: 1,
  status: "draft",
  is_executable: true,
  service_spec_id: "",
  order_aim_id: "",
  order_sub_aim_id: "",
};

export default function ProcessSpecsPage() {
  const [items, setItems] = useState([]);
  const [services, setServices] = useState([]);
  const [orderAims, setOrderAims] = useState([]);

  const [selectedId, setSelectedId] = useState("");
  const [isNew, setIsNew] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  async function load(keepSelectionId = "") {
    try {
      const [processes, svc, aims] = await Promise.all([
        api.listProcessSpecs(),
        api.listServices(),
        api.listOrderAims(),
      ]);

      setItems(processes);
      setServices(svc);
      setOrderAims(aims);

      const targetId = keepSelectionId || selectedId;
      if (targetId) {
        const found = processes.find(x => x.id === targetId);
        if (found) {
          selectExisting(found);
          return;
        }
      }

      if (processes.length && !isNew) {
        selectExisting(processes[0]);
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
      version: item.version ?? 1,
      status: item.status || "draft",
      is_executable: !!item.is_executable,
      service_spec_id: item.service_spec_id || "",
      order_aim_id: item.order_aim_id || "",
      order_sub_aim_id: item.order_sub_aim_id || "",
    });
  }

  const currentAim = useMemo(
    () => orderAims.find(x => x.id === form.order_aim_id),
    [orderAims, form.order_aim_id]
  );

  const availableSubAims = currentAim?.sub_aims || [];

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

  async function save() {
    try {
      setError("");
      setSaved("");

      const payloadCreate = {
        code: form.code.trim(),
        name: form.name.trim(),
        description: form.description.trim() || null,
        version: Number(form.version),
        status: form.status,
        is_executable: !!form.is_executable,
        service_spec_id: form.service_spec_id,
        order_aim_id: form.order_aim_id,
        order_sub_aim_id: form.order_sub_aim_id,
      };

      if (!payloadCreate.code) return setError("Code is required.");
      if (!payloadCreate.name) return setError("Name is required.");
      if (!payloadCreate.service_spec_id) return setError("Service Spec is required.");
      if (!payloadCreate.order_aim_id) return setError("Order Aim is required.");
      if (!payloadCreate.order_sub_aim_id) return setError("Order Sub-aim is required.");

      if (isNew) {
        const created = await api.createProcessSpec(payloadCreate);
        setSaved("Process Spec created.");
        await load(created.id);
      } else {
        const payloadUpdate = {
          name: payloadCreate.name,
          description: payloadCreate.description,
          version: payloadCreate.version,
          status: payloadCreate.status,
          is_executable: payloadCreate.is_executable,
        };
        await api.updateProcessSpec(selectedId, payloadUpdate);
        setSaved("Process Spec updated.");
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
      await api.deleteProcessSpec(selectedId);
      setSaved("Process Spec deleted.");
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
            <h2 style={{ marginTop: 0, marginBottom: 4 }}>Process Specs</h2>
            <div className="muted">Process templates bound to Service / Aim / Sub-aim.</div>
          </div>
          <button className="btn" onClick={startNew}>New Process Spec</button>
        </div>
      </div>

      <div className="split">
        <div className="panel" style={{ minWidth: 360 }}>
          <h3 style={{ marginTop: 0 }}>Current Process Specs</h3>
          {items.map(item => (
            <button
              key={item.id}
              className={`list-button${item.id === selectedId && !isNew ? " active" : ""}`}
              onClick={() => selectExisting(item)}
            >
              <strong>{item.name}</strong>
              <br />
              <span className="muted">{item.code} • v{item.version} • {item.status}</span>
              <br />
              <span className="muted">
                {serviceLabel(item.service_spec_id)} / {aimLabel(item.order_aim_id)} / {subAimLabel(item.order_aim_id, item.order_sub_aim_id)}
              </span>
            </button>
          ))}
          {!items.length && <div className="muted">No Process Specs yet.</div>}
        </div>

        <div className="panel" style={{ flex: 1 }}>
          <div className="header-line">
            <div>
              <h3 style={{ marginTop: 0, marginBottom: 4 }}>{isNew ? "New Process Spec" : "Edit Process Spec"}</h3>
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

          <div className="field">
            <label>Description</label>
            <textarea rows={3} value={form.description} onChange={e => onChange("description", e.target.value)} />
          </div>

          <div className="split">
            <div className="field">
              <label>Service Spec</label>
              <select value={form.service_spec_id} onChange={e => onChange("service_spec_id", e.target.value)} disabled={!isNew}>
                <option value="">Select Service</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.type})</option>)}
              </select>
            </div>
            <div className="field">
              <label>Order Aim</label>
              <select
                value={form.order_aim_id}
                onChange={e => {
                  onChange("order_aim_id", e.target.value);
                  onChange("order_sub_aim_id", "");
                }}
                disabled={!isNew}
              >
                <option value="">Select Aim</option>
                {orderAims.map(aim => <option key={aim.id} value={aim.id}>{aim.name || aim.code}</option>)}
              </select>
            </div>
          </div>

          <div className="split">
            <div className="field">
              <label>Order Sub-aim</label>
              <select
                value={form.order_sub_aim_id}
                onChange={e => onChange("order_sub_aim_id", e.target.value)}
                disabled={!isNew || !form.order_aim_id}
              >
                <option value="">Select Sub-aim</option>
                {availableSubAims.map(sa => <option key={sa.id} value={sa.id}>{sa.name || sa.code}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Status</label>
              <select value={form.status} onChange={e => onChange("status", e.target.value)}>
                {STATUS_VALUES.map(x => <option key={x} value={x}>{x}</option>)}
              </select>
            </div>
          </div>

          <div className="split">
            <div className="field">
              <label>Version</label>
              <input type="number" value={form.version} onChange={e => onChange("version", e.target.value)} />
            </div>
            <div className="field">
              <label>Executable</label>
              <label className="row" style={{ alignItems: "center", gap: 8 }}>
                <input type="checkbox" checked={form.is_executable} onChange={e => onChange("is_executable", e.target.checked)} />
                <span>{form.is_executable ? "Yes" : "No"}</span>
              </label>
            </div>
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
