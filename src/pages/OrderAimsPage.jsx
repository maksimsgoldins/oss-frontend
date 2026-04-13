import React, { useEffect, useState } from "react";
import { api } from "../api/client";

const emptyForm = { id: null, code: "", name: "", subAimsText: "" };

export default function OrderAimsPage() {
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [isEditing, setIsEditing] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      const data = await api.listOrderAims();
      setItems(data);
      if (!selectedId && data.length) setSelectedId(data[0].id);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const selected = items.find(x => x.id === selectedId);
    if (selected && !isEditing && !isNew) {
      setForm({
        id: selected.id,
        code: selected.code,
        name: selected.name,
        subAimsText: (selected.sub_aims || []).map(x => x.code).join(", ")
      });
    }
  }, [items, selectedId, isEditing, isNew]);

  function selectItem(item) {
    setSelectedId(item.id);
    setIsEditing(false);
    setIsNew(false);
    setError("");
  }

  function newItem() {
    setSelectedId(null);
    setForm(emptyForm);
    setIsEditing(true);
    setIsNew(true);
    setError("");
  }

  function cancelEdit() {
    setIsEditing(false);
    setIsNew(false);
    const selected = items.find(x => x.id === selectedId);
    if (selected) {
      setForm({
        id: selected.id,
        code: selected.code,
        name: selected.name,
        subAimsText: (selected.sub_aims || []).map(x => x.code).join(", ")
      });
    } else {
      setForm(emptyForm);
    }
  }

  async function save(e) {
    e.preventDefault();
    setError("");
    try {
      await api.createOrderAim({
        code: form.code,
        name: form.name,
        sub_aims: form.subAimsText
          .split(",")
          .map(x => x.trim())
          .filter(Boolean)
          .map(x => ({ code: x, name: x }))
      });
      await load();
      setIsEditing(false);
      setIsNew(false);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <div className="panel">
        <div className="header-line">
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 4 }}>Order Aims</h2>
            <div className="muted">Aim classifier with sub-aims.</div>
          </div>
          <button className="btn" onClick={newItem}>New Order Aim</button>
        </div>
      </div>

      <div className="two-col">
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Current Order Aims</h3>
          {items.map(item => (
            <button key={item.id} className={`list-button${item.id === selectedId ? " active" : ""}`} onClick={() => selectItem(item)}>
              <strong>{item.name}</strong><br />
              <span className="muted">{item.code}</span>
            </button>
          ))}
          {!items.length && <div className="muted">No order aims yet.</div>}
        </div>

        <div className="panel">
          <div className="header-line">
            <div>
              <h2 style={{ marginTop: 0, marginBottom: 4 }}>Order Aim Details</h2>
              <div className="muted">{isEditing ? "Edit mode" : "Read-only mode"}</div>
            </div>
            <div className="row">
              {!isEditing && !isNew && form.id && <button className="btn secondary" onClick={() => setIsEditing(true)}>Edit</button>}
              {isEditing && <button className="btn secondary" onClick={cancelEdit}>Cancel</button>}
            </div>
          </div>

          <form onSubmit={save} className={isEditing ? "" : "readonly"}>
            <div className="field">
              <label>Code</label>
              <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
            </div>
            <div className="field">
              <label>Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="field">
              <label>Sub-aims (comma-separated)</label>
              <input value={form.subAimsText} onChange={e => setForm({ ...form, subAimsText: e.target.value })} />
            </div>
            {isEditing && <button className="btn" type="submit">Save</button>}
          </form>

          {!isEditing && (
            <div style={{ marginTop: 12 }}>
              {form.subAimsText.split(",").map(x => x.trim()).filter(Boolean).map(x => (
                <span key={x} className="pill">{x}</span>
              ))}
            </div>
          )}

          {error && <div className="error">{error}</div>}
        </div>
      </div>
    </>
  );
}
