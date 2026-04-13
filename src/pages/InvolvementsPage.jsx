import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";

export default function InvolvementsPage() {
  const [items, setItems] = useState([]);
  const [services, setServices] = useState([]);
  const [attributes, setAttributes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState({ id:null, service_id:"", attribute_id:"", allowed_values:[], default_values:[] });
  const [error, setError] = useState("");

  async function load() {
    try {
      const [ai, svc, attr] = await Promise.all([
        api.listAttributeInvolvement(),
        api.listServices(),
        api.listAttributes()
      ]);
      setItems(ai); setServices(svc); setAttributes(attr);
      if (!selectedId && ai.length) setSelectedId(ai[0].id);
    } catch (err) { setError(err.message); }
  }
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const selected = items.find(x => x.id === selectedId);
    if (selected) setForm(selected);
  }, [items, selectedId]);

  const currentAttribute = attributes.find(a => a.id === form.attribute_id);
  const attributeValues = currentAttribute?.possible_values || [];
  const involvementAllowed = form.allowed_values?.length ? form.allowed_values : attributeValues;

  function toggleArray(field, value) {
    const current = new Set(form[field] || []);
    if (current.has(value)) current.delete(value); else current.add(value);
    let next = { ...form, [field]: Array.from(current) };
    if (field === "allowed_values") next.default_values = (next.default_values || []).filter(x => next.allowed_values.includes(x));
    setForm(next);
  }

  async function saveNew() {
    try {
      await api.createAttributeInvolvement({
        service_id: form.service_id,
        attribute_id: form.attribute_id,
        allowed_values: form.allowed_values,
        default_values: form.default_values
      });
      await load();
    } catch (err) { setError(err.message); }
  }

  async function updateCurrent() {
    if (!form.id) return;
    try {
      await api.updateAttributeInvolvement(form.id, {
        allowed_values: form.allowed_values,
        default_values: form.default_values
      });
      await load();
    } catch (err) { setError(err.message); }
  }

  async function removeCurrent() {
    if (!form.id || !confirm("Delete involvement?")) return;
    try {
      await api.deleteAttributeInvolvement(form.id);
      await load();
      setSelectedId(null);
      setForm({ id:null, service_id:"", attribute_id:"", allowed_values:[], default_values:[] });
    } catch (err) { setError(err.message); }
  }

  return (
    <>
      <div className="panel">
        <div className="header-line">
          <div><h2 style={{marginTop:0, marginBottom:4}}>Manage Involvements</h2><div className="muted">Allowed values and defaults are chosen only from the attribute value list.</div></div>
          <button className="btn" onClick={() => { setSelectedId(null); setForm({ id:null, service_id:"", attribute_id:"", allowed_values:[], default_values:[] }); }}>New Involvement</button>
        </div>
      </div>

      <div className="two-col">
        <div className="panel">
          <h3 style={{marginTop:0}}>Current Involvements</h3>
          {items.map(item => (
            <button key={item.id} className={`list-button${item.id === selectedId ? " active" : ""}`} onClick={() => setSelectedId(item.id)}>
              <strong>{item.service_id}</strong><br /><span className="muted">{item.attribute_id}</span>
            </button>
          ))}
        </div>

        <div className="panel">
          <h3 style={{marginTop:0}}>Involvement Editor</h3>
          <div className="field">
            <label>Service</label>
            <select value={form.service_id || ""} onChange={e => setForm({ ...form, service_id:e.target.value })} disabled={!!form.id}>
              <option value="">Select service</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Attribute</label>
            <select value={form.attribute_id || ""} onChange={e => setForm({ ...form, attribute_id:e.target.value, allowed_values:[], default_values:[] })} disabled={!!form.id}>
              <option value="">Select attribute</option>
              {attributes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          <div className="split">
            <div className="panel" style={{boxShadow:"none", padding:0}}>
              <h4>Allowed Values for this Involvement</h4>
              {attributeValues.length ? attributeValues.map(v => (
                <label key={v} style={{display:"block", marginBottom:8}}>
                  <input type="checkbox" checked={(form.allowed_values || []).includes(v)} onChange={() => toggleArray("allowed_values", v)} /> {v}
                </label>
              )) : <div className="muted">No values configured on attribute.</div>}
            </div>

            <div className="panel" style={{boxShadow:"none", padding:0}}>
              <h4>Default Values</h4>
              {involvementAllowed.length ? involvementAllowed.map(v => (
                <label key={v} style={{display:"block", marginBottom:8}}>
                  <input type="checkbox" checked={(form.default_values || []).includes(v)} onChange={() => toggleArray("default_values", v)} /> {v}
                </label>
              )) : <div className="muted">Select allowed values first.</div>}
            </div>
          </div>

          <div className="row">
            {!form.id && <button className="btn" onClick={saveNew}>Create</button>}
            {form.id && <button className="btn" onClick={updateCurrent}>Save</button>}
            {form.id && <button className="btn danger" onClick={removeCurrent}>Delete</button>}
          </div>

          {error && <div className="error">{error}</div>}
        </div>
      </div>
    </>
  );
}
