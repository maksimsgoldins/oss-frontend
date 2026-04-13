import React, { useEffect, useState } from "react";
import { api } from "../api/client";

const initialForm = { code: "", name: "", subAimsText: "" };

export default function OrderAimsPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");

  async function load() { try { setItems(await api.listOrderAims()); } catch (err) { setError(err.message); } }
  useEffect(() => { load(); }, []);

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      await api.createOrderAim({
        code: form.code,
        name: form.name,
        sub_aims: form.subAimsText.split(",").map(x => x.trim()).filter(Boolean).map(x => ({ code: x, name: x }))
      });
      setForm(initialForm);
      await load();
    } catch (err) { setError(err.message); }
  }

  return (
    <>
      <div className="panel"><h2 style={{marginTop:0}}>Order Aims</h2></div>
      <div className="panel">
        <h3 style={{marginTop:0}}>Create Order Aim</h3>
        <form onSubmit={submit}>
          <div className="field"><label>Code</label><input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></div>
          <div className="field"><label>Name</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div className="field"><label>Sub-aims (comma-separated)</label><input value={form.subAimsText} onChange={e => setForm({ ...form, subAimsText: e.target.value })} /></div>
          <button className="btn" type="submit">Save</button>
        </form>
        {error && <div className="error" style={{marginTop:10}}>{error}</div>}
      </div>
      <div className="panel">
        <h3 style={{marginTop:0}}>Current Order Aims</h3>
        <table className="list-table">
          <thead><tr><th>Code</th><th>Name</th><th>Sub-aims</th></tr></thead>
          <tbody>{items.map(item => <tr key={item.id}><td>{item.code}</td><td>{item.name}</td><td>{item.sub_aims?.map(sa => sa.code).join(", ")}</td></tr>)}</tbody>
        </table>
      </div>
    </>
  );
}
