import React, { useEffect, useState } from "react";
import { api } from "../api/client";

const initialForm = { code: "", name: "", type: "CFS", description: "" };

export default function ServicesPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");

  async function load() {
    try { setItems(await api.listServices()); } catch (err) { setError(err.message); }
  }
  useEffect(() => { load(); }, []);

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      await api.createService(form);
      setForm(initialForm);
      await load();
    } catch (err) { setError(err.message); }
  }

  async function remove(id) {
    if (!confirm("Delete service?")) return;
    try { await api.deleteService(id); await load(); } catch (err) { setError(err.message); }
  }

  return (
    <>
      <div className="panel"><h2 style={{marginTop:0}}>Services</h2></div>
      <div className="panel">
        <h3 style={{marginTop:0}}>Create Service</h3>
        <form onSubmit={submit}>
          <div className="field"><label>Code</label><input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></div>
          <div className="field"><label>Name</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div className="field"><label>Type</label><select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option value="CFS">CFS</option><option value="RFS">RFS</option><option value="Resource">Resource</option></select></div>
          <div className="field"><label>Description</label><input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          <button className="btn" type="submit">Save</button>
        </form>
        {error && <div className="error" style={{marginTop:10}}>{error}</div>}
      </div>
      <div className="panel">
        <h3 style={{marginTop:0}}>Current Services</h3>
        <table className="list-table">
          <thead><tr><th>Code</th><th>Name</th><th>Type</th><th>Description</th><th></th></tr></thead>
          <tbody>{items.map(item => <tr key={item.id}><td>{item.code}</td><td>{item.name}</td><td>{item.type}</td><td>{item.description || ""}</td><td><button className="btn secondary" onClick={() => remove(item.id)}>Delete</button></td></tr>)}</tbody>
        </table>
      </div>
    </>
  );
}
