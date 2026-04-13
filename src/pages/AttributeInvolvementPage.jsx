import React, { useEffect, useState } from "react";
import { api } from "../api/client";

export default function AttributeInvolvementPage() {
  const [items, setItems] = useState([]);
  const [services, setServices] = useState([]);
  const [attributes, setAttributes] = useState([]);
  const [form, setForm] = useState({ service_id: "", attribute_id: "", defaultValuesText: "" });
  const [error, setError] = useState("");

  async function load() {
    try {
      const [ai, svc, attr] = await Promise.all([
        api.listAttributeInvolvement(),
        api.listServices(),
        api.listAttributes()
      ]);
      setItems(ai);
      setServices(svc);
      setAttributes(attr);
    } catch (err) { setError(err.message); }
  }

  useEffect(() => { load(); }, []);

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      await api.createAttributeInvolvement({
        service_id: form.service_id,
        attribute_id: form.attribute_id,
        default_values: form.defaultValuesText.split(",").map(x => x.trim()).filter(Boolean)
      });
      setForm({ service_id: "", attribute_id: "", defaultValuesText: "" });
      await load();
    } catch (err) { setError(err.message); }
  }

  return (
    <>
      <div className="panel"><h2 style={{marginTop:0}}>Attribute Involvement</h2></div>
      <div className="panel">
        <h3 style={{marginTop:0}}>Create Involvement</h3>
        <form onSubmit={submit}>
          <div className="field"><label>Service</label><select value={form.service_id} onChange={e => setForm({ ...form, service_id: e.target.value })}><option value="">Select service</option>{services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <div className="field"><label>Attribute</label><select value={form.attribute_id} onChange={e => setForm({ ...form, attribute_id: e.target.value })}><option value="">Select attribute</option>{attributes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
          <div className="field"><label>Default values (comma-separated)</label><input value={form.defaultValuesText} onChange={e => setForm({ ...form, defaultValuesText: e.target.value })} /></div>
          <button className="btn" type="submit">Save</button>
        </form>
        {error && <div className="error" style={{marginTop:10}}>{error}</div>}
      </div>
      <div className="panel">
        <h3 style={{marginTop:0}}>Current Attribute Involvement</h3>
        <table className="list-table">
          <thead><tr><th>Service ID</th><th>Attribute ID</th><th>Default Values</th></tr></thead>
          <tbody>{items.map(item => <tr key={item.id}><td>{item.service_id}</td><td>{item.attribute_id}</td><td>{item.default_values?.join(", ")}</td></tr>)}</tbody>
        </table>
      </div>
    </>
  );
}
