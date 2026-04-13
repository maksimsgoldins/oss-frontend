import React, { useEffect, useState } from "react";
import { api } from "../api/client";

const initialForm = { code: "", name: "", value_type: "string", required: false, description: "", possibleValuesText: "" };

export default function AttributesPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");

  async function load() { try { setItems(await api.listAttributes()); } catch (err) { setError(err.message); } }
  useEffect(() => { load(); }, []);

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      await api.createAttribute({
        code: form.code,
        name: form.name,
        value_type: form.value_type,
        required: form.required,
        description: form.description,
        possible_values: form.possibleValuesText.split(",").map(x => x.trim()).filter(Boolean)
      });
      setForm(initialForm);
      await load();
    } catch (err) { setError(err.message); }
  }

  return (
    <>
      <div className="panel"><h2 style={{marginTop:0}}>Attributes</h2></div>
      <div className="panel">
        <h3 style={{marginTop:0}}>Create Attribute</h3>
        <form onSubmit={submit}>
          <div className="field"><label>Code</label><input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></div>
          <div className="field"><label>Name</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div className="field"><label>Value Type</label><select value={form.value_type} onChange={e => setForm({ ...form, value_type: e.target.value })}><option value="string">string</option><option value="number">number</option><option value="boolean">boolean</option><option value="date">date</option><option value="list">list</option></select></div>
          <div className="field"><label>Possible Values (comma-separated)</label><input value={form.possibleValuesText} onChange={e => setForm({ ...form, possibleValuesText: e.target.value })} /></div>
          <div className="field"><label>Description</label><input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          <label style={{display:"block",marginBottom:12}}><input type="checkbox" checked={form.required} onChange={e => setForm({ ...form, required: e.target.checked })} /> Required</label>
          <button className="btn" type="submit">Save</button>
        </form>
        {error && <div className="error" style={{marginTop:10}}>{error}</div>}
      </div>
      <div className="panel">
        <h3 style={{marginTop:0}}>Current Attributes</h3>
        <table className="list-table">
          <thead><tr><th>Code</th><th>Name</th><th>Type</th><th>Required</th><th>Possible Values</th></tr></thead>
          <tbody>{items.map(item => <tr key={item.id}><td>{item.code}</td><td>{item.name}</td><td>{item.value_type}</td><td>{String(item.required)}</td><td>{item.possible_values?.join(", ")}</td></tr>)}</tbody>
        </table>
      </div>
    </>
  );
}
