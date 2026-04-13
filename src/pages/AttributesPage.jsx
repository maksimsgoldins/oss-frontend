import React, { useEffect, useState } from "react";
import { api } from "../api/client";

const emptyForm = { id:null, code:"", name:"", value_type:"string", required:false, possibleValuesText:"", description:"" };

export default function AttributesPage() {
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [isEditing, setIsEditing] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      const data = await api.listAttributes();
      setItems(data);
      if (!selectedId && data.length) setSelectedId(data[0].id);
    } catch (err) { setError(err.message); }
  }
  useEffect(() => { load(); }, []);

  useEffect(() => {
    const selected = items.find(x => x.id === selectedId);
    if (selected && !isEditing && !isNew) {
      setForm({
        id:selected.id, code:selected.code, name:selected.name, value_type:selected.value_type,
        required:!!selected.required, possibleValuesText:(selected.possible_values || []).join(", "),
        description:selected.description || ""
      });
    }
  }, [items, selectedId, isEditing, isNew]);

  function newItem() { setSelectedId(null); setForm(emptyForm); setIsEditing(true); setIsNew(true); setError(""); }
  function selectItem(item) { setSelectedId(item.id); setIsEditing(false); setIsNew(false); setError(""); }
  function cancelEdit() { setIsEditing(false); setIsNew(false); }

  async function save(e) {
    e.preventDefault();
    try {
      await api.createAttribute({
        code:form.code, name:form.name, value_type:form.value_type, required:form.required,
        description:form.description, possible_values: form.possibleValuesText.split(",").map(x => x.trim()).filter(Boolean)
      });
      await load(); setIsEditing(false); setIsNew(false);
    } catch (err) { setError(err.message); }
  }

  async function remove() {
    if (!form.id) return;
    if (!confirm("Delete attribute?")) return;
    try {
      await api.deleteAttribute(form.id);
      await load();
      setSelectedId(null); setForm(emptyForm);
    } catch (err) { setError(err.message); }
  }

  const possibleValues = form.possibleValuesText.split(",").map(x => x.trim()).filter(Boolean);

  return (
    <>
      <div className="panel">
        <div className="header-line">
          <div><h2 style={{marginTop:0, marginBottom:4}}>Manage Attributes</h2><div className="muted">Delete is blocked if the attribute is linked to a service.</div></div>
          <button className="btn" onClick={newItem}>New Attribute</button>
        </div>
      </div>

      <div className="two-col">
        <div className="panel">
          <h3 style={{marginTop:0}}>Current Attributes</h3>
          {items.map(item => (
            <button key={item.id} className={`list-button${item.id === selectedId ? " active" : ""}`} onClick={() => selectItem(item)}>
              <strong>{item.name}</strong><br /><span className="muted">{item.code} · {item.value_type}</span>
            </button>
          ))}
        </div>

        <div className="panel">
          <div className="header-line">
            <div><h2 style={{marginTop:0, marginBottom:4}}>Attribute Details</h2><div className="muted">{isEditing ? "Edit mode" : "Read-only mode"}</div></div>
            <div className="row">
              {!isEditing && !isNew && form.id && <button className="btn secondary" onClick={() => setIsEditing(true)}>Edit</button>}
              {isEditing && <button className="btn secondary" onClick={cancelEdit}>Cancel</button>}
              {!isNew && form.id && <button className="btn danger" onClick={remove}>Delete</button>}
            </div>
          </div>

          <form onSubmit={save} className={isEditing ? "" : "readonly"}>
            <div className="field"><label>Code</label><input value={form.code} onChange={e => setForm({ ...form, code:e.target.value })} /></div>
            <div className="field"><label>Name</label><input value={form.name} onChange={e => setForm({ ...form, name:e.target.value })} /></div>
            <div className="field"><label>Value Type</label><select value={form.value_type} onChange={e => setForm({ ...form, value_type:e.target.value })}><option value="string">string</option><option value="number">number</option><option value="boolean">boolean</option><option value="date">date</option><option value="list">list</option></select></div>
            <label style={{display:"block", marginBottom:12}}><input type="checkbox" checked={form.required} onChange={e => setForm({ ...form, required:e.target.checked })} /> Required</label>
            <div className="field"><label>Possible Values (comma-separated)</label><input value={form.possibleValuesText} onChange={e => setForm({ ...form, possibleValuesText:e.target.value })} /></div>
            <div className="field"><label>Description</label><textarea value={form.description} onChange={e => setForm({ ...form, description:e.target.value })} /></div>
            {isEditing && <button className="btn" type="submit">Save</button>}
          </form>

          {!isEditing && possibleValues.length > 0 && <div style={{marginTop:12}}>{possibleValues.map(x => <span key={x} className="pill">{x}</span>)}</div>}
          {error && <div className="error">{error}</div>}
        </div>
      </div>
    </>
  );
}
