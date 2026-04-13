import React, { useEffect, useState } from "react";
import { api } from "../api/client";

export default function RelationsPage() {
  const [items, setItems] = useState([]);
  const [services, setServices] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [form, setForm] = useState({
    parent_service_id: "", parent_order_aim_id: "", parent_order_sub_aim_id: "",
    child_service_id: "", child_order_aim_id: "", child_order_sub_aim_id: "",
    instantiation_mode: "CREATE"
  });
  const [error, setError] = useState("");

  async function load() {
    try {
      const [rels, svc, map] = await Promise.all([
        api.listRelations(),
        api.listServices(),
        api.listServiceAimMappings()
      ]);
      setItems(rels);
      setServices(svc);
      setMappings(map);
    } catch (err) { setError(err.message); }
  }

  useEffect(() => { load(); }, []);

  function mappingsFor(serviceId) {
    return mappings.filter(m => m.service_id === serviceId);
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      await api.createRelation(form);
      await load();
    } catch (err) { setError(err.message); }
  }

  return (
    <>
      <div className="panel"><h2 style={{marginTop:0}}>Relations</h2><div className="muted">Backend validates hierarchy and self-relation rules.</div></div>
      <div className="panel">
        <h3 style={{marginTop:0}}>Create Relation</h3>
        <form onSubmit={submit}>
          <div className="field"><label>Parent Service</label><select value={form.parent_service_id} onChange={e => setForm({ ...form, parent_service_id: e.target.value })}><option value="">Select parent service</option>{services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.type})</option>)}</select></div>
          <div className="field"><label>Parent Mapping</label><select value={`${form.parent_order_aim_id}|${form.parent_order_sub_aim_id}`} onChange={e => { const [aim, sub] = e.target.value.split("|"); setForm({ ...form, parent_order_aim_id: aim || "", parent_order_sub_aim_id: sub || "" }); }}><option value="">Select parent mapping</option>{mappingsFor(form.parent_service_id).map(m => <option key={m.id} value={`${m.order_aim_id}|${m.order_sub_aim_id}`}>{m.order_aim_id} / {m.order_sub_aim_id}</option>)}</select></div>
          <div className="field"><label>Child Service</label><select value={form.child_service_id} onChange={e => setForm({ ...form, child_service_id: e.target.value })}><option value="">Select child service</option>{services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.type})</option>)}</select></div>
          <div className="field"><label>Child Mapping</label><select value={`${form.child_order_aim_id}|${form.child_order_sub_aim_id}`} onChange={e => { const [aim, sub] = e.target.value.split("|"); setForm({ ...form, child_order_aim_id: aim || "", child_order_sub_aim_id: sub || "" }); }}><option value="">Select child mapping</option>{mappingsFor(form.child_service_id).map(m => <option key={m.id} value={`${m.order_aim_id}|${m.order_sub_aim_id}`}>{m.order_aim_id} / {m.order_sub_aim_id}</option>)}</select></div>
          <div className="field"><label>Instantiation Mode</label><select value={form.instantiation_mode} onChange={e => setForm({ ...form, instantiation_mode: e.target.value })}><option value="CREATE">CREATE</option><option value="REUSE">REUSE</option></select></div>
          <button className="btn" type="submit">Save</button>
        </form>
        {error && <div className="error" style={{marginTop:10}}>{error}</div>}
      </div>
      <div className="panel">
        <h3 style={{marginTop:0}}>Current Relations</h3>
        <table className="list-table">
          <thead><tr><th>Parent</th><th>Child</th><th>Mode</th></tr></thead>
          <tbody>{items.map(item => <tr key={item.id}><td>{item.parent_service_id} / {item.parent_order_aim_id} / {item.parent_order_sub_aim_id}</td><td>{item.child_service_id} / {item.child_order_aim_id} / {item.child_order_sub_aim_id}</td><td>{item.instantiation_mode}</td></tr>)}</tbody>
        </table>
      </div>
    </>
  );
}
