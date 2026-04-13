import React, { useEffect, useState } from "react";
import { api } from "../api/client";

const emptyForm = { id: null, code: "", name: "", type: "CFS", description: "" };

export default function ServicesPage() {
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [isEditing, setIsEditing] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      const data = await api.listServices();
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
        type: selected.type,
        description: selected.description || ""
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
        type: selected.type,
        description: selected.description || ""
      });
    } else {
      setForm(emptyForm);
    }
  }

  async function save(e) {
    e.preventDefault();
    setError("");
    try {
      if (isNew) {
        await api.createService({
          code: form.code,
          name: form.name,
          type: form.type,
          description: form.description
        });
      } else {
        await api.updateService(form.id, {
          name: form.name,
          type: form.type,
          description: form.description
        });
      }
      await load();
      setIsEditing(false);
      setIsNew(false);
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove() {
    if (!form.id) return;
    if (!confirm("Delete service?")) return;
    try {
      await api.deleteService(form.id);
      const data = await api.listServices();
      setItems(data);
      setSelectedId(data[0]?.id || null);
      setIsEditing(false);
      setIsNew(false);
      setForm(emptyForm);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <div className="panel">
        <div className="header-line">
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 4 }}>Services</h2>
            <div className="muted">List on the left, read-only details on the right, edit/new/delete.</div>
          </div>
          <button className="btn" onClick={newItem}>New Service</button>
        </div>
      </div>

      <div className="two-col">
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Current Services</h3>
          {items.map(item => (
            <button key={item.id} className={`list-button${item.id === selectedId ? " active" : ""}`} onClick={() => selectItem(item)}>
              <strong>{item.name}</strong><br />
              <span className="muted">{item.code} · {item.type}</span>
            </button>
          ))}
          {!items.length && <div className="muted">No services yet.</div>}
        </div>

        <div className="panel">
          <div className="header-line">
            <div>
              <h2 style={{ marginTop: 0, marginBottom: 4 }}>Service Details</h2>
              <div className="muted">{isEditing ? "Edit mode" : "Read-only mode"}</div>
            </div>
            <div className="row">
              {!isEditing && !isNew && form.id && <button className="btn secondary" onClick={() => setIsEditing(true)}>Edit</button>}
              {!isEditing && !isNew && form.id && <button className="btn secondary" onClick={() => setIsEditing(true)}>Edit</button>}
              {isEditing && <button className="btn secondary" onClick={cancelEdit}>Cancel</button>}
              {!isNew && form.id && <button className="btn danger" onClick={remove}>Delete</button>}
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
              <label>Type</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option value="CFS">CFS</option>
                <option value="RFS">RFS</option>
                <option value="Resource">Resource</option>
              </select>
            </div>
            <div className="field">
              <label>Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            {isEditing && <button className="btn" type="submit">Save</button>}
          </form>

          {error && <div className="error">{error}</div>}
        </div>
      </div>
    </>
  );
}
