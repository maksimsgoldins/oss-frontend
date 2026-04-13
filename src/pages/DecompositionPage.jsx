import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";

export default function DecompositionPage() {
  const [services, setServices] = useState([]);
  const [relations, setRelations] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [selectedParentServiceId, setSelectedParentServiceId] = useState("");
  const [form, setForm] = useState({
    id:null,
    parent_service_id:"",
    parent_order_aim_id:"",
    parent_order_sub_aim_id:"",
    child_service_id:"",
    child_order_aim_id:"",
    child_order_sub_aim_id:"",
    instantiation_mode:"CREATE"
  });
  const [error, setError] = useState("");

  async function load() {
    try {
      const [svc, rel, map] = await Promise.all([
        api.listServices(),
        api.listRelations(),
        api.listServiceAimMappings()
      ]);
      setServices(svc); setRelations(rel); setMappings(map);
    } catch (err) { setError(err.message); }
  }
  useEffect(() => { load(); }, []);

  function mappingsFor(serviceId) {
    return mappings.filter(m => m.service_id === serviceId);
  }

  async function save() {
    setError("");
    try {
      if (form.id) {
        await api.updateRelation(form.id, {
          parent_service_id: form.parent_service_id,
          parent_order_aim_id: form.parent_order_aim_id,
          parent_order_sub_aim_id: form.parent_order_sub_aim_id,
          child_service_id: form.child_service_id,
          child_order_aim_id: form.child_order_aim_id,
          child_order_sub_aim_id: form.child_order_sub_aim_id,
          instantiation_mode: form.instantiation_mode
        });
      } else {
        await api.createRelation({
          parent_service_id: form.parent_service_id,
          parent_order_aim_id: form.parent_order_aim_id,
          parent_order_sub_aim_id: form.parent_order_sub_aim_id,
          child_service_id: form.child_service_id,
          child_order_aim_id: form.child_order_aim_id,
          child_order_sub_aim_id: form.child_order_sub_aim_id,
          instantiation_mode: form.instantiation_mode
        });
      }
      setForm({ id:null,parent_service_id:"",parent_order_aim_id:"",parent_order_sub_aim_id:"",child_service_id:"",child_order_aim_id:"",child_order_sub_aim_id:"",instantiation_mode:"CREATE" });
      await load();
    } catch (err) { setError(err.message); }
  }

  async function remove(id) {
    if (!confirm("Delete decomposition?")) return;
    try { await api.deleteRelation(id); await load(); } catch (err) { setError(err.message); }
  }

  const filteredRelations = selectedParentServiceId ? relations.filter(r => r.parent_service_id === selectedParentServiceId) : relations;

  return (
    <>
      <div className="panel">
        <div className="header-line">
          <div><h2 style={{marginTop:0, marginBottom:4}}>Manage Decomposition</h2><div className="muted">DecomposeTo is stored, DecomposeFrom is the reverse view.</div></div>
        </div>
      </div>

      <div className="panel">
        <div className="split">
          <div className="panel" style={{boxShadow:"none", padding:0}}>
            <h3>Parent</h3>
            <div className="field">
              <label>Parent Service</label>
              <select value={form.parent_service_id} onChange={e => setForm({ ...form, parent_service_id:e.target.value, parent_order_aim_id:"", parent_order_sub_aim_id:"" })}>
                <option value="">Select parent</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.type})</option>)}
              </select>
            </div>
            <div className="field">
              <label>Parent Mapping</label>
              <select value={`${form.parent_order_aim_id}|${form.parent_order_sub_aim_id}`} onChange={e => {
                const [aim, sub] = e.target.value.split("|");
                setForm({ ...form, parent_order_aim_id: aim || "", parent_order_sub_aim_id: sub || "" });
              }}>
                <option value="">Select mapping</option>
                {mappingsFor(form.parent_service_id).map(m => (
                  <option key={m.id} value={`${m.order_aim_id}|${m.order_sub_aim_id}`}>{m.order_aim_id} / {m.order_sub_aim_id}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="panel" style={{boxShadow:"none", padding:0}}>
            <h3>Child</h3>
            <div className="field">
              <label>Child Service / Resource</label>
              <select value={form.child_service_id} onChange={e => setForm({ ...form, child_service_id:e.target.value, child_order_aim_id:"", child_order_sub_aim_id:"" })}>
                <option value="">Select child</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.type})</option>)}
              </select>
            </div>
            <div className="field">
              <label>Child Mapping</label>
              <select value={`${form.child_order_aim_id}|${form.child_order_sub_aim_id}`} onChange={e => {
                const [aim, sub] = e.target.value.split("|");
                setForm({ ...form, child_order_aim_id: aim || "", child_order_sub_aim_id: sub || "" });
              }}>
                <option value="">Select mapping</option>
                {mappingsFor(form.child_service_id).map(m => (
                  <option key={m.id} value={`${m.order_aim_id}|${m.order_sub_aim_id}`}>{m.order_aim_id} / {m.order_sub_aim_id}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Instantiation</label>
              <select value={form.instantiation_mode} onChange={e => setForm({ ...form, instantiation_mode:e.target.value })}>
                <option value="CREATE">CREATE</option>
                <option value="REUSE">REUSE</option>
              </select>
            </div>
          </div>
        </div>
        <div className="row">
          <button className="btn" onClick={save}>{form.id ? "Save" : "Create"}</button>
          <button className="btn secondary" onClick={() => setForm({ id:null,parent_service_id:"",parent_order_aim_id:"",parent_order_sub_aim_id:"",child_service_id:"",child_order_aim_id:"",child_order_sub_aim_id:"",instantiation_mode:"CREATE" })}>Clear</button>
        </div>
        {error && <div className="error">{error}</div>}
      </div>

      <div className="panel">
        <div className="field">
          <label>Show relations for parent service</label>
          <select value={selectedParentServiceId} onChange={e => setSelectedParentServiceId(e.target.value)}>
            <option value="">All parents</option>
            {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {filteredRelations.map(rel => (
          <div className="item-card" key={rel.id}>
            <div><strong>DecomposeTo</strong>: {rel.parent_service_id} / {rel.parent_order_aim_id} / {rel.parent_order_sub_aim_id} → {rel.child_service_id} / {rel.child_order_aim_id} / {rel.child_order_sub_aim_id}</div>
            <div className="muted" style={{marginTop:6}}>DecomposeFrom: reverse view | mode: {rel.instantiation_mode}</div>
            <div className="row" style={{marginTop:10}}>
              <button className="btn secondary" onClick={() => setForm({
                id: rel.id,
                parent_service_id: rel.parent_service_id,
                parent_order_aim_id: rel.parent_order_aim_id,
                parent_order_sub_aim_id: rel.parent_order_sub_aim_id,
                child_service_id: rel.child_service_id,
                child_order_aim_id: rel.child_order_aim_id,
                child_order_sub_aim_id: rel.child_order_sub_aim_id,
                instantiation_mode: rel.instantiation_mode
              })}>Edit</button>
              <button className="btn danger" onClick={() => remove(rel.id)}>Delete</button>
            </div>
          </div>
        ))}
        {!filteredRelations.length && <div className="muted">No decomposition relations.</div>}
      </div>
    </>
  );
}
