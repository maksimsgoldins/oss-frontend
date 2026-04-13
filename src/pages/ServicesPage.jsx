import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";

const emptyForm = { id:null, code:"", name:"", type:"CFS", description:"", mappings:[{ aimId:"", subAimId:"" }] };

export default function ServicesPage() {
  const [services, setServices] = useState([]);
  const [orderAims, setOrderAims] = useState([]);
  const [allMappings, setAllMappings] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [isEditing, setIsEditing] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      const [svc, aims, maps] = await Promise.all([
        api.listServices(),
        api.listOrderAims(),
        api.listServiceAimMappings()
      ]);
      setServices(svc); setOrderAims(aims); setAllMappings(maps);
      if (!selectedId && svc.length) setSelectedId(svc[0].id);
    } catch (err) { setError(err.message); }
  }
  useEffect(() => { load(); }, []);

  useEffect(() => {
    const selected = services.find(x => x.id === selectedId);
    if (selected && !isEditing && !isNew) {
      const mappings = allMappings.filter(m => m.service_id === selected.id).map(m => ({ mapId:m.id, aimId:m.order_aim_id, subAimId:m.order_sub_aim_id }));
      setForm({
        id:selected.id, code:selected.code, name:selected.name, type:selected.type, description:selected.description || "",
        mappings: mappings.length ? mappings : [{ aimId:"", subAimId:"" }]
      });
    }
  }, [services, allMappings, selectedId, isEditing, isNew]);

  function newItem() {
    setSelectedId(null); setForm(emptyForm); setIsEditing(true); setIsNew(true); setError("");
  }
  function selectItem(item) {
    setSelectedId(item.id); setIsEditing(false); setIsNew(false); setError("");
  }
  function cancelEdit() {
    setIsEditing(false); setIsNew(false);
    const selected = services.find(x => x.id === selectedId);
    if (selected) {
      const mappings = allMappings.filter(m => m.service_id === selected.id).map(m => ({ mapId:m.id, aimId:m.order_aim_id, subAimId:m.order_sub_aim_id }));
      setForm({ id:selected.id, code:selected.code, name:selected.name, type:selected.type, description:selected.description || "", mappings: mappings.length ? mappings : [{ aimId:"", subAimId:"" }] });
    } else setForm(emptyForm);
  }
  function updateMapping(index, patch) {
    const next = [...form.mappings];
    next[index] = { ...next[index], ...patch };
    if (patch.aimId !== undefined) next[index].subAimId = "";
    setForm({ ...form, mappings: next });
  }
  function addMappingRow() {
    setForm({ ...form, mappings: [...form.mappings, { aimId:"", subAimId:"" }] });
  }
  function removeMappingRow(index) {
    const next = form.mappings.filter((_,i) => i !== index);
    setForm({ ...form, mappings: next.length ? next : [{ aimId:"", subAimId:"" }] });
  }

  async function save(e) {
    e.preventDefault();
    setError("");
    try {
      let serviceId = form.id;
      if (isNew) {
        const created = await api.createService({ code: form.code, name: form.name, type: form.type, description: form.description });
        serviceId = created.id;
      } else {
        await api.updateService(serviceId, { name: form.name, type: form.type, description: form.description });
        const existing = allMappings.filter(m => m.service_id === serviceId);
        for (const m of existing) await api.deleteServiceAimMapping(m.id);
      }

      const desired = form.mappings.filter(m => m.aimId && m.subAimId);
      for (const m of desired) {
        await api.createServiceAimMapping({
          service_id: serviceId,
          order_aim_id: m.aimId,
          order_sub_aim_id: m.subAimId
        });
      }

      await load();
      setSelectedId(serviceId);
      setIsEditing(false);
      setIsNew(false);
    } catch (err) { setError(err.message); }
  }

  async function remove() {
    if (!form.id) return;
    if (!confirm("Delete service?")) return;
    try {
      await api.deleteService(form.id);
      await load();
      setForm(emptyForm); setIsEditing(false); setIsNew(false);
    } catch (err) { setError(err.message); }
  }

  function subAimsFor(aimId) {
    return orderAims.find(a => a.id === aimId)?.sub_aims || [];
  }

  return (
    <>
      <div className="panel">
        <div className="header-line">
          <div>
            <h2 style={{marginTop:0, marginBottom:4}}>Manage Service</h2>
            <div className="muted">Includes list of Order Aim / Sub-aim mappings.</div>
          </div>
          <button className="btn" onClick={newItem}>New Service</button>
        </div>
      </div>

      <div className="two-col">
        <div className="panel">
          <h3 style={{marginTop:0}}>Current Services</h3>
          {services.map(item => (
            <button key={item.id} className={`list-button${item.id === selectedId ? " active" : ""}`} onClick={() => selectItem(item)}>
              <strong>{item.name}</strong><br /><span className="muted">{item.code} · {item.type}</span>
            </button>
          ))}
          {!services.length && <div className="muted">No services yet.</div>}
        </div>

        <div className="panel">
          <div className="header-line">
            <div>
              <h2 style={{marginTop:0, marginBottom:4}}>Service Details</h2>
              <div className="muted">{isEditing ? "Edit mode" : "Read-only mode"}</div>
            </div>
            <div className="row">
              {!isEditing && !isNew && form.id && <button className="btn secondary" onClick={() => setIsEditing(true)}>Edit</button>}
              {isEditing && <button className="btn secondary" onClick={cancelEdit}>Cancel</button>}
              {!isNew && form.id && <button className="btn danger" onClick={remove}>Delete</button>}
            </div>
          </div>

          <form onSubmit={save} className={isEditing ? "" : "readonly"}>
            <div className="field"><label>Code</label><input value={form.code} onChange={e => setForm({ ...form, code:e.target.value })} /></div>
            <div className="field"><label>Name</label><input value={form.name} onChange={e => setForm({ ...form, name:e.target.value })} /></div>
            <div className="field"><label>Type</label><select value={form.type} onChange={e => setForm({ ...form, type:e.target.value })}><option value="CFS">CFS</option><option value="RFS">RFS</option><option value="Resource">Resource</option></select></div>
            <div className="field"><label>Description</label><textarea value={form.description} onChange={e => setForm({ ...form, description:e.target.value })} /></div>

            <div className="field">
              <label>Order Aim / Sub-aim Mappings</label>
              {form.mappings.map((m, idx) => (
                <div className="mapping-row" key={idx}>
                  <select value={m.aimId} onChange={e => updateMapping(idx, { aimId:e.target.value })}>
                    <option value="">Select aim</option>
                    {orderAims.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                  <select value={m.subAimId} onChange={e => updateMapping(idx, { subAimId:e.target.value })}>
                    <option value="">Select sub-aim</option>
                    {subAimsFor(m.aimId).map(sa => <option key={sa.code} value={sa.id || sa.code}>{sa.name || sa.code}</option>)}
                  </select>
                  <button type="button" className="btn danger small" onClick={() => removeMappingRow(idx)}>Remove</button>
                </div>
              ))}
              {isEditing && <button type="button" className="btn secondary" onClick={addMappingRow}>Add aim/sub-aim</button>}
            </div>

            {isEditing && <button className="btn" type="submit">Save</button>}
          </form>

          {!isEditing && form.mappings.filter(m => m.aimId && m.subAimId).length > 0 && (
            <div style={{marginTop:12}}>
              {form.mappings.filter(m => m.aimId && m.subAimId).map((m, idx) => <span className="pill" key={idx}>{m.aimId} / {m.subAimId}</span>)}
            </div>
          )}

          {error && <div className="error">{error}</div>}
        </div>
      </div>
    </>
  );
}
