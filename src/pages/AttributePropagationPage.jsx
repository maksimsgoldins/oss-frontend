import React, { useEffect, useState } from "react";
import { api } from "../api/client";

export default function AttributePropagationPage() {
  const [relations, setRelations] = useState([]);
  const [involvements, setInvolvements] = useState([]);
  const [propagations, setPropagations] = useState([]);
  const [orderAims, setOrderAims] = useState([]);
  const [attributes, setAttributes] = useState([]);
  const [services, setServices] = useState([]);

  const [selectedRelationId, setSelectedRelationId] = useState("");
  const [selectedParentAi, setSelectedParentAi] = useState("");
  const [selectedChildAi, setSelectedChildAi] = useState("");
  const [selectedValues, setSelectedValues] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    try {
      const [rel, ai, prop, aims, attrs, svc] = await Promise.all([
        api.listRelations(),
        api.listAttributeInvolvement(),
        api.listAttributePropagation(),
        api.listOrderAims(),
        api.listAttributes(),
        api.listServices()
      ]);
      setRelations(rel);
      setInvolvements(ai);
      setPropagations(prop);
      setOrderAims(aims);
      setAttributes(attrs);
      setServices(svc);
    } catch (err) {
      setError(err?.message || JSON.stringify(err));
    }
  }

  useEffect(() => {
    load();
  }, []);

  const relation = relations.find(r => r.id === selectedRelationId);
  const parentList = relation
    ? involvements.filter(ai => ai.service_id === relation.parent_service_id)
    : [];
  const childList = relation
    ? involvements.filter(ai => ai.service_id === relation.child_service_id)
    : [];

  const parentInvolvement = involvements.find(x => x.id === selectedParentAi);
  const childInvolvement = involvements.find(x => x.id === selectedChildAi);

  const parentAttribute = attributes.find(a => a.id === parentInvolvement?.attribute_id);
  const childAttribute = attributes.find(a => a.id === childInvolvement?.attribute_id);

  const parentIsFreeForm = !!parentAttribute && (!parentAttribute.possible_values || parentAttribute.possible_values.length === 0);
  const childIsFreeForm = !!childAttribute && (!childAttribute.possible_values || childAttribute.possible_values.length === 0);

  const intersection =
    parentInvolvement && childInvolvement && !parentIsFreeForm && !childIsFreeForm
      ? (parentInvolvement.allowed_values || []).filter(v =>
          (childInvolvement.allowed_values || []).includes(v)
        )
      : [];

  function serviceLabel(serviceId) {
    const s = services.find(x => x.id === serviceId);
    return s ? `${s.name} (${s.type})` : serviceId;
  }

  function attributeLabel(attributeId) {
    const a = attributes.find(x => x.id === attributeId);
    return a ? (a.name || a.code) : attributeId;
  }

  function aimLabel(aimId) {
    const aim = orderAims.find(a => a.id === aimId);
    return aim ? (aim.name || aim.code) : aimId;
  }

  function subAimLabel(aimId, subAimId) {
    const aim = orderAims.find(a => a.id === aimId);
    if (!aim) return subAimId;
    const sub = (aim.sub_aims || []).find(sa => sa.id === subAimId);
    return sub ? (sub.name || sub.code) : subAimId;
  }

  function relationLabel(r) {
    return `${serviceLabel(r.parent_service_id)} / ${aimLabel(r.parent_order_aim_id)} / ${subAimLabel(r.parent_order_aim_id, r.parent_order_sub_aim_id)} → ${serviceLabel(r.child_service_id)} / ${aimLabel(r.child_order_aim_id)} / ${subAimLabel(r.child_order_aim_id, r.child_order_sub_aim_id)}`;
  }

  function involvementLabel(ai) {
    return attributeLabel(ai.attribute_id);
  }

  function involvementValuesLabel(ai) {
    const attr = attributes.find(a => a.id === ai.attribute_id);
    const isFreeForm = !attr?.possible_values || attr.possible_values.length === 0;
    if (isFreeForm) return "free-form";
    return (ai.allowed_values || []).join(", ") || "—";
  }

  function toggleValue(v) {
    setSelectedValues(prev =>
      prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]
    );
  }

  async function save() {
    try {
      setError("");
      await api.createAttributePropagation({
        relation_id: selectedRelationId,
        parent_attribute_involvement_id: selectedParentAi,
        child_attribute_involvement_id: selectedChildAi,
        allowed_values: selectedValues
      });
      await load();
    } catch (err) {
      setError(err?.message || JSON.stringify(err));
    }
  }

  const currentRelationProps = propagations.filter(
    p => p.relation_id === selectedRelationId
  );

  return (
    <>
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Attribute Propagation</h2>
        <div className="muted">
          Choose a relation, map parent involvement to child involvement, then
          select intersecting values.
        </div>
      </div>

      <div className="panel">
        <div className="field">
          <label>Relation</label>
          <select
            value={selectedRelationId}
            onChange={e => {
              setSelectedRelationId(e.target.value);
              setSelectedParentAi("");
              setSelectedChildAi("");
              setSelectedValues([]);
            }}
          >
            <option value="">Select relation</option>
            {relations.map(r => (
              <option key={r.id} value={r.id}>
                {relationLabel(r)}
              </option>
            ))}
          </select>
        </div>

        <div className="split">
          <div className="panel" style={{ boxShadow: "none", padding: 0 }}>
            <h3>Parent Attributes</h3>
            {parentList.map(ai => (
              <button
                key={ai.id}
                className={`list-button${ai.id === selectedParentAi ? " active" : ""}`}
                onClick={() => {
                  setSelectedParentAi(ai.id);
                  setSelectedValues([]);
                }}
              >
                <strong>{involvementLabel(ai)}</strong>
                <br />
                <span className="muted">{involvementValuesLabel(ai)}</span>
              </button>
            ))}
            {!parentList.length && <div className="muted">No parent involvements.</div>}
          </div>

          <div className="panel" style={{ boxShadow: "none", padding: 0 }}>
            <h3>Child Attributes</h3>
            {childList.map(ai => (
              <button
                key={ai.id}
                className={`list-button${ai.id === selectedChildAi ? " active" : ""}`}
                onClick={() => {
                  setSelectedChildAi(ai.id);
                  setSelectedValues([]);
                }}
              >
                <strong>{involvementLabel(ai)}</strong>
                <br />
                <span className="muted">{involvementValuesLabel(ai)}</span>
              </button>
            ))}
            {!childList.length && <div className="muted">No child involvements.</div>}
          </div>
        </div>

        <div className="panel" style={{ boxShadow: "none", padding: 0 }}>
          <h3>Values to propagate</h3>

          {parentInvolvement && childInvolvement ? (
            parentIsFreeForm || childIsFreeForm ? (
              <div className="muted">
                Free-form propagation is not supported in this screen yet.
              </div>
            ) : intersection.length ? (
              intersection.map(v => (
                <label key={v} style={{ display: "block", marginBottom: 8 }}>
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(v)}
                    onChange={() => toggleValue(v)}
                  />{" "}
                  {v}
                </label>
              ))
            ) : (
              <div className="muted">
                No intersecting values between parent and child involvement.
              </div>
            )
          ) : (
            <div className="muted">
              Select parent and child involvement. Only intersecting values are
              allowed.
            </div>
          )}

          <div className="row" style={{ marginTop: 12 }}>
            <button
              className="btn"
              onClick={save}
              disabled={
                !selectedRelationId ||
                !selectedParentAi ||
                !selectedChildAi ||
                parentIsFreeForm ||
                childIsFreeForm
              }
            >
              Save propagation
            </button>
          </div>
        </div>

        {error && <div className="error">{error}</div>}
      </div>

      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Current propagation rules for selected relation</h3>
        {currentRelationProps.map((p, idx) => (
          <div className="item-card" key={idx}>
            <div>
              <strong>
                {involvementLabel(
                  involvements.find(x => x.id === p.parent_attribute_involvement_id) || {
                    attribute_id: p.parent_attribute_involvement_id
                  }
                )}
              </strong>
              {" → "}
              <strong>
                {involvementLabel(
                  involvements.find(x => x.id === p.child_attribute_involvement_id) || {
                    attribute_id: p.child_attribute_involvement_id
                  }
                )}
              </strong>
            </div>
            <div className="muted" style={{ marginTop: 6 }}>
              {p.allowed_values.join(", ") || "—"}
            </div>
          </div>
        ))}
        {!currentRelationProps.length && <div className="muted">No propagation rules.</div>}
      </div>
    </>
  );
}
