import React, { useEffect, useMemo, useState } from "react";
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
  const [filterMode, setFilterMode] = useState("ALL");
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

  const parentType = parentAttribute?.value_type || "";
  const childType = childAttribute?.value_type || "";

  const parentValues = parentInvolvement?.allowed_values || [];
  const childValues = childInvolvement?.allowed_values || [];

  const parentRestricted = parentValues.length > 0;
  const childRestricted = childValues.length > 0;

  const intersection =
    parentRestricted && childRestricted
      ? parentValues.filter(v => childValues.includes(v))
      : [];

  const currentRelationProps = propagations.filter(p => p.relation_id === selectedRelationId);

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
    const possible = attr?.possible_values || [];
    if (!possible.length) return "free-form";
    return (ai.allowed_values || []).join(", ") || "all configured values";
  }

  function toggleValue(v) {
    setSelectedValues(prev =>
      prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]
    );
  }

  const warnings = useMemo(() => {
    const out = [];
    if (!parentInvolvement || !childInvolvement) return out;

    if (parentAttribute && childAttribute) {
      if ((parentAttribute.name || parentAttribute.code) !== (childAttribute.name || childAttribute.code)) {
        out.push("Attribute names differ.");
      }
      if (parentType && childType && parentType !== childType) {
        out.push("Source and target attribute types differ.");
      }
      if (parentType === "list" && childType !== "list") {
        out.push("Source is multi-value, target is not list.");
      }
      if (parentType !== "list" && childType === "list") {
        out.push("Target is multi-value, source is atomic.");
      }
    }

    if (!parentRestricted && childRestricted) {
      out.push("Source is free-form, target is value-restricted.");
    }
    if (parentRestricted && !childRestricted) {
      out.push("Source is value-restricted, target is free-form.");
    }
    if (parentRestricted && childRestricted && intersection.length === 0) {
      out.push("No intersecting values between source and target.");
    }
    if ((parentRestricted || childRestricted) && filterMode === "SELECTED" && selectedValues.length === 0) {
      out.push("Value filtering mode is selected, but no values are chosen.");
    }

    return out;
  }, [
    parentInvolvement,
    childInvolvement,
    parentAttribute,
    childAttribute,
    parentType,
    childType,
    parentRestricted,
    childRestricted,
    intersection,
    filterMode,
    selectedValues,
  ]);

  async function save() {
    try {
      setError("");

      if (!selectedRelationId || !selectedParentAi || !selectedChildAi) {
        setError("Select relation, parent attribute, and child attribute.");
        return;
      }

      await api.createAttributePropagation({
        relation_id: selectedRelationId,
        parent_attribute_involvement_id: selectedParentAi,
        child_attribute_involvement_id: selectedChildAi,
        allowed_values: filterMode === "SELECTED" ? selectedValues : []
      });

      await load();
    } catch (err) {
      setError(err?.message || JSON.stringify(err));
    }
  }

  return (
    <>
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Attribute Propagation</h2>
        <div className="muted">
          Choose a relation, map any parent attribute to any child attribute, and optionally configure value filtering.
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
              setFilterMode("ALL");
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
          <h3>Propagation mode</h3>

          <label style={{ display: "block", marginBottom: 8 }}>
            <input
              type="radio"
              name="filterMode"
              checked={filterMode === "ALL"}
              onChange={() => {
                setFilterMode("ALL");
                setSelectedValues([]);
              }}
            />{" "}
            Propagate all values
          </label>

          <label style={{ display: "block", marginBottom: 12 }}>
            <input
              type="radio"
              name="filterMode"
              checked={filterMode === "SELECTED"}
              onChange={() => setFilterMode("SELECTED")}
              disabled={!parentRestricted && !childRestricted}
            />{" "}
            Propagate selected values only
          </label>

          {filterMode === "SELECTED" ? (
            parentRestricted && childRestricted ? (
              intersection.length ? (
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
                <div className="muted">No intersecting values between source and target.</div>
              )
            ) : (
              <div className="muted">
                Selected-values filtering is meaningful only when both sides have restricted values.
              </div>
            )
          ) : (
            <div className="muted">
              Value-level filtering is not configured. OM should copy the source value into the target attribute.
            </div>
          )}

          <div className="row" style={{ marginTop: 12 }}>
            <button
              className="btn"
              onClick={save}
              disabled={!selectedRelationId || !selectedParentAi || !selectedChildAi}
            >
              Save propagation
            </button>
          </div>
        </div>

        {!!warnings.length && (
          <div className="panel" style={{ boxShadow: "none", padding: 0 }}>
            <h3>Warnings</h3>
            {warnings.map((w, idx) => (
              <div key={idx} className="muted" style={{ marginBottom: 6 }}>
                • {w}
              </div>
            ))}
          </div>
        )}

        {error && <div className="error">{error}</div>}
      </div>

      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Current propagation rules for selected relation</h3>
        {currentRelationProps.map((p, idx) => {
          const pAi = involvements.find(x => x.id === p.parent_attribute_involvement_id);
          const cAi = involvements.find(x => x.id === p.child_attribute_involvement_id);

          return (
            <div className="item-card" key={idx}>
              <div>
                <strong>{pAi ? involvementLabel(pAi) : p.parent_attribute_involvement_id}</strong>
                {" → "}
                <strong>{cAi ? involvementLabel(cAi) : p.child_attribute_involvement_id}</strong>
              </div>
              <div className="muted" style={{ marginTop: 6 }}>
                {p.allowed_values.length ? p.allowed_values.join(", ") : "All values"}
              </div>
            </div>
          );
        })}
        {!currentRelationProps.length && <div className="muted">No propagation rules.</div>}
      </div>
    </>
  );
}
