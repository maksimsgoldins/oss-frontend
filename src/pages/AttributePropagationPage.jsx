import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";

export default function AttributePropagationPage() {
  const [relations, setRelations] = useState([]);
  const [involvements, setInvolvements] = useState([]);
  const [propagations, setPropagations] = useState([]);
  const [selectedRelationId, setSelectedRelationId] = useState("");
  const [selectedParentAi, setSelectedParentAi] = useState("");
  const [selectedChildAi, setSelectedChildAi] = useState("");
  const [selectedValues, setSelectedValues] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    try {
      const [rel, ai, prop] = await Promise.all([
        api.listRelations(),
        api.listAttributeInvolvement(),
        api.listAttributePropagation()
      ]);
      setRelations(rel); setInvolvements(ai); setPropagations(prop);
    } catch (err) { setError(err.message); }
  }
  useEffect(() => { load(); }, []);

  const relation = relations.find(r => r.id === selectedRelationId);
  const parentList = relation ? involvements.filter(ai => ai.service_id === relation.parent_service_id) : [];
  const childList = relation ? involvements.filter(ai => ai.service_id === relation.child_service_id) : [];
  const parentInvolvement = involvements.find(x => x.id === selectedParentAi);
  const childInvolvement = involvements.find(x => x.id === selectedChildAi);
  const intersection = parentInvolvement && childInvolvement
    ? (parentInvolvement.allowed_values || []).filter(v => (childInvolvement.allowed_values || []).includes(v))
    : [];

  function toggleValue(v) {
    setSelectedValues(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  }

  async function save() {
    try {
      await api.createAttributePropagation({
        relation_id: selectedRelationId,
        parent_attribute_involvement_id: selectedParentAi,
        child_attribute_involvement_id: selectedChildAi,
        allowed_values: selectedValues
      });
      await load();
    } catch (err) { setError(err.message); }
  }

  const currentRelationProps = propagations.filter(p => p.relation_id === selectedRelationId);

  return (
    <>
      <div className="panel">
        <h2 style={{marginTop:0}}>Attribute Propagation</h2>
        <div className="muted">Choose a relation, map parent involvement to child involvement, then select intersecting values.</div>
      </div>

      <div className="panel">
        <div className="field">
          <label>Relation</label>
          <select value={selectedRelationId} onChange={e => { setSelectedRelationId(e.target.value); setSelectedParentAi(""); setSelectedChildAi(""); setSelectedValues([]); }}>
            <option value="">Select relation</option>
            {relations.map(r => <option key={r.id} value={r.id}>{r.parent_service_id} / {r.parent_order_aim_id} / {r.parent_order_sub_aim_id} → {r.child_service_id} / {r.child_order_aim_id} / {r.child_order_sub_aim_id}</option>)}
          </select>
        </div>

        <div className="split">
          <div className="panel" style={{boxShadow:"none", padding:0}}>
            <h3>Parent Attributes</h3>
            {parentList.map(ai => (
              <button key={ai.id} className={`list-button${ai.id === selectedParentAi ? " active" : ""}`} onClick={() => setSelectedParentAi(ai.id)}>
                <strong>{ai.attribute_id}</strong><br /><span className="muted">{(ai.allowed_values || []).join(", ") || "—"}</span>
              </button>
            ))}
          </div>
          <div className="panel" style={{boxShadow:"none", padding:0}}>
            <h3>Child Attributes</h3>
            {childList.map(ai => (
              <button key={ai.id} className={`list-button${ai.id === selectedChildAi ? " active" : ""}`} onClick={() => setSelectedChildAi(ai.id)}>
                <strong>{ai.attribute_id}</strong><br /><span className="muted">{(ai.allowed_values || []).join(", ") || "—"}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="panel" style={{boxShadow:"none", padding:0}}>
          <h3>Values to propagate</h3>
          {intersection.length ? intersection.map(v => (
            <label key={v} style={{display:"block", marginBottom:8}}>
              <input type="checkbox" checked={selectedValues.includes(v)} onChange={() => toggleValue(v)} /> {v}
            </label>
          )) : <div className="muted">Select parent and child involvement. Only intersecting values are allowed.</div>}
          <div className="row" style={{marginTop:12}}>
            <button className="btn" onClick={save}>Save propagation</button>
          </div>
        </div>

        {error && <div className="error">{error}</div>}
      </div>

      <div className="panel">
        <h3 style={{marginTop:0}}>Current propagation rules for selected relation</h3>
        {currentRelationProps.map((p, idx) => (
          <div className="item-card" key={idx}>
            <div><strong>{p.parent_attribute_involvement_id}</strong> → <strong>{p.child_attribute_involvement_id}</strong></div>
            <div className="muted" style={{marginTop:6}}>{p.allowed_values.join(", ") || "—"}</div>
          </div>
        ))}
        {!currentRelationProps.length && <div className="muted">No propagation rules.</div>}
      </div>
    </>
  );
}
