import React, { useCallback, useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";
import { api } from "../api/client";

function DiagramInner() {
  const [services, setServices] = useState([]);
  const [relations, setRelations] = useState([]);
  const [orderAims, setOrderAims] = useState([]);
  const [layoutRows, setLayoutRows] = useState([]);
  const [involvements, setInvolvements] = useState([]);
  const [propagations, setPropagations] = useState([]);
  const [attributes, setAttributes] = useState([]);

  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [selectedAimIds, setSelectedAimIds] = useState([]);
  const [selectedSubAimIds, setSelectedSubAimIds] = useState([]);

  const [selectedEdgeId, setSelectedEdgeId] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState("");

  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  async function load() {
    try {
      const [svc, rel, aims, layout, ai, prop, attrs] = await Promise.all([
        api.listServices(),
        api.listRelations(),
        api.listOrderAims(),
        api.listDiagramLayout(),
        api.listAttributeInvolvement(),
        api.listAttributePropagation(),
        api.listAttributes()
      ]);
      setServices(svc);
      setRelations(rel);
      setOrderAims(aims);
      setLayoutRows(layout);
      setInvolvements(ai);
      setPropagations(prop);
      setAttributes(attrs);
      setSaved("");
    } catch (err) {
      setError(err?.message || JSON.stringify(err));
    }
  }

  useEffect(() => {
    load();
  }, []);

  const serviceMap = useMemo(() => Object.fromEntries(services.map(s => [s.id, s])), [services]);
  const aimMap = useMemo(() => Object.fromEntries(orderAims.map(a => [a.id, a])), [orderAims]);
  const attributeMap = useMemo(() => Object.fromEntries(attributes.map(a => [a.id, a])), [attributes]);
  const involvementMap = useMemo(() => Object.fromEntries(involvements.map(i => [i.id, i])), [involvements]);

  function aimLabel(aimId) {
    const aim = aimMap[aimId];
    return aim ? (aim.name || aim.code) : aimId;
  }

  function subAimLabel(aimId, subAimId) {
    const aim = aimMap[aimId];
    if (!aim) return subAimId;
    const sub = (aim.sub_aims || []).find(x => x.id === subAimId);
    return sub ? (sub.name || sub.code) : subAimId;
  }

  function serviceLabel(serviceId) {
    const svc = serviceMap[serviceId];
    return svc ? `${svc.name} (${svc.type})` : serviceId;
  }

  function attributeLabel(attributeId) {
    const attr = attributeMap[attributeId];
    return attr ? (attr.name || attr.code) : attributeId;
  }

  function involvementLabel(involvementId) {
    const inv = involvementMap[involvementId];
    if (!inv) return involvementId;
    return attributeLabel(inv.attribute_id);
  }

  function nodeKey(serviceId, aimId, subAimId) {
    return `${serviceId}||${aimId}||${subAimId}`;
  }

  function parseNodeKey(key) {
    const [serviceId, aimId, subAimId] = key.split("||");
    return { serviceId, aimId, subAimId };
  }

  const availableSubAims = useMemo(() => {
    if (!selectedAimIds.length) return [];
    return orderAims
      .filter(a => selectedAimIds.includes(a.id))
      .flatMap(a => (a.sub_aims || []).map(sa => ({ ...sa, order_aim_id: a.id })));
  }, [orderAims, selectedAimIds]);

  const filteredRelations = useMemo(() => {
    return relations.filter(r => {
      const serviceMatch =
        !selectedServiceIds.length ||
        selectedServiceIds.includes(r.parent_service_id) ||
        selectedServiceIds.includes(r.child_service_id);

      const aimMatch =
        !selectedAimIds.length ||
        selectedAimIds.includes(r.parent_order_aim_id) ||
        selectedAimIds.includes(r.child_order_aim_id);

      const subAimMatch =
        !selectedSubAimIds.length ||
        selectedSubAimIds.includes(r.parent_order_sub_aim_id) ||
        selectedSubAimIds.includes(r.child_order_sub_aim_id);

      return serviceMatch && aimMatch && subAimMatch;
    });
  }, [relations, selectedServiceIds, selectedAimIds, selectedSubAimIds]);

  const graphData = useMemo(() => {
    const nodeMap = new Map();
    const nextEdges = [];

    filteredRelations.forEach((rel, idx) => {
      const parentKey = nodeKey(rel.parent_service_id, rel.parent_order_aim_id, rel.parent_order_sub_aim_id);
      const childKey = nodeKey(rel.child_service_id, rel.child_order_aim_id, rel.child_order_sub_aim_id);

      if (!nodeMap.has(parentKey)) {
        const svc = serviceMap[rel.parent_service_id];
        nodeMap.set(parentKey, {
          id: parentKey,
          data: {
            label: `${svc?.name || rel.parent_service_id}\n${aimLabel(rel.parent_order_aim_id)} / ${subAimLabel(rel.parent_order_aim_id, rel.parent_order_sub_aim_id)}`
          },
          position: { x: 100 + nodeMap.size * 50, y: 100 + nodeMap.size * 30 },
          style: {
            border: selectedNodeId === parentKey ? "2px solid #2563eb" : "1px solid #94a3b8",
            borderRadius: 12,
            padding: 8,
            background: "#ffffff",
            width: 240,
            whiteSpace: "pre-line"
          }
        });
      }

      if (!nodeMap.has(childKey)) {
        const svc = serviceMap[rel.child_service_id];
        nodeMap.set(childKey, {
          id: childKey,
          data: {
            label: `${svc?.name || rel.child_service_id}\n${aimLabel(rel.child_order_aim_id)} / ${subAimLabel(rel.child_order_aim_id, rel.child_order_sub_aim_id)}`
          },
          position: { x: 400 + nodeMap.size * 50, y: 150 + nodeMap.size * 30 },
          style: {
            border: selectedNodeId === childKey ? "2px solid #2563eb" : "1px solid #94a3b8",
            borderRadius: 12,
            padding: 8,
            background: "#ffffff",
            width: 240,
            whiteSpace: "pre-line"
          }
        });
      }

      nextEdges.push({
        id: rel.id || `e-${idx}`,
        source: parentKey,
        target: childKey,
        label: rel.instantiation_mode,
        type: "smoothstep",
        animated: false,
        style: selectedEdgeId === rel.id ? { strokeWidth: 3 } : {},
        data: { relationId: rel.id }
      });
    });

    const layoutMap = Object.fromEntries(layoutRows.map(r => [r.node_key, r]));

    const nextNodes = Array.from(nodeMap.values()).map(node => {
      const savedLayout = layoutMap[node.id];
      if (savedLayout) {
        return {
          ...node,
          position: { x: Number(savedLayout.x), y: Number(savedLayout.y) },
          style: {
            ...node.style,
            width: savedLayout.width ? Number(savedLayout.width) : node.style.width
          }
        };
      }
      return node;
    });

    return { nextNodes, nextEdges };
  }, [filteredRelations, serviceMap, aimMap, layoutRows, selectedEdgeId, selectedNodeId]);

  useEffect(() => {
    setNodes(graphData.nextNodes);
    setEdges(graphData.nextEdges);
  }, [graphData, setNodes, setEdges]);

  const onMultiSelectChange = useCallback((setter) => (event) => {
    const values = Array.from(event.target.selectedOptions).map(o => o.value);
    setter(values);
  }, []);

  async function saveLayout() {
    try {
      setError("");
      const payload = nodes.map(n => ({
        node_key: n.id,
        x: n.position.x,
        y: n.position.y,
        width: typeof n.width === "number" ? n.width : 240,
        height: typeof n.height === "number" ? n.height : 80
      }));
      await api.replaceDiagramLayout(payload);
      setSaved("Layout saved.");
      await load();
    } catch (err) {
      setError(err?.message || JSON.stringify(err));
    }
  }

  const selectedRelation = relations.find(r => r.id === selectedEdgeId);
  const selectedPropagationRules = propagations.filter(p => p.relation_id === selectedEdgeId);

  const selectedNode = selectedNodeId ? parseNodeKey(selectedNodeId) : null;
  const selectedNodeService = selectedNode ? serviceMap[selectedNode.serviceId] : null;
  const selectedNodeInvolvements = selectedNode
    ? involvements.filter(i => i.service_id === selectedNode.serviceId)
    : [];

  function clearFilters() {
    setSelectedServiceIds([]);
    setSelectedAimIds([]);
    setSelectedSubAimIds([]);
  }

  return (
    <>
      <div className="panel">
        <div className="header-line">
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 4 }}>Diagram</h2>
            <div className="muted">
              Node = Service + Aim + Sub-aim. Edge = Decomposition relation.
            </div>
          </div>
          <div className="row">
            <button className="btn secondary" onClick={clearFilters}>Clear filters</button>
            <button className="btn" onClick={saveLayout}>Save layout</button>
          </div>
        </div>

        <div className="split">
          <div className="field">
            <label>Filter by service</label>
            <select multiple value={selectedServiceIds} onChange={onMultiSelectChange(setSelectedServiceIds)} style={{ minHeight: 120 }}>
              {services.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.type})
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Filter by aim</label>
            <select multiple value={selectedAimIds} onChange={onMultiSelectChange(setSelectedAimIds)} style={{ minHeight: 120 }}>
              {orderAims.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name || a.code}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label>Filter by sub-aim</label>
          <select multiple value={selectedSubAimIds} onChange={onMultiSelectChange(setSelectedSubAimIds)} style={{ minHeight: 120 }}>
            {availableSubAims.map(sa => (
              <option key={sa.id} value={sa.id}>
                {(sa.name || sa.code)} ({aimLabel(sa.order_aim_id)})
              </option>
            ))}
          </select>
          <div className="muted">If no aim is selected, sub-aim filter list stays empty.</div>
        </div>

        {saved && <div className="muted" style={{ marginTop: 8 }}>{saved}</div>}
        {error && <div className="error">{error}</div>}
      </div>

      <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ height: "70vh", width: "100%" }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onEdgeClick={(_, edge) => {
              setSelectedEdgeId(edge.id);
              setSelectedNodeId("");
            }}
            onNodeClick={(_, node) => {
              setSelectedNodeId(node.id);
              setSelectedEdgeId("");
            }}
            fitView
          >
            <MiniMap />
            <Controls />
            <Background />
          </ReactFlow>
        </div>
      </div>

      <div className="split">
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Selected relation details</h3>
          {selectedRelation ? (
            <>
              <div className="item-card">
                <div>
                  <strong>DecomposeTo:</strong>{" "}
                  {serviceLabel(selectedRelation.parent_service_id)} / {aimLabel(selectedRelation.parent_order_aim_id)} / {subAimLabel(selectedRelation.parent_order_aim_id, selectedRelation.parent_order_sub_aim_id)}
                  {" → "}
                  {serviceLabel(selectedRelation.child_service_id)} / {aimLabel(selectedRelation.child_order_aim_id)} / {subAimLabel(selectedRelation.child_order_aim_id, selectedRelation.child_order_sub_aim_id)}
                </div>
                <div className="muted" style={{ marginTop: 6 }}>
                  Instantiation: {selectedRelation.instantiation_mode}
                </div>
              </div>

              <h4>Attribute propagation</h4>
              {selectedPropagationRules.length ? (
                selectedPropagationRules.map((rule, idx) => (
                  <div className="item-card" key={idx}>
                    <div>
                      <strong>{involvementLabel(rule.parent_attribute_involvement_id)}</strong>
                      {" → "}
                      <strong>{involvementLabel(rule.child_attribute_involvement_id)}</strong>
                    </div>
                    <div className="muted" style={{ marginTop: 6 }}>
                      {rule.allowed_values.length ? rule.allowed_values.join(", ") : "All values"}
                    </div>
                  </div>
                ))
              ) : (
                <div className="muted">No propagation rules for this relation.</div>
              )}
            </>
          ) : (
            <div className="muted">Click an edge in the diagram to see relation and propagation details.</div>
          )}
        </div>

        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Selected node details</h3>
          {selectedNode && selectedNodeService ? (
            <>
              <div className="item-card">
                <div><strong>Service:</strong> {selectedNodeService.name} ({selectedNodeService.type})</div>
                <div className="muted" style={{ marginTop: 6 }}>
                  {aimLabel(selectedNode.aimId)} / {subAimLabel(selectedNode.aimId, selectedNode.subAimId)}
                </div>
              </div>

              <h4>Involvements</h4>
              {selectedNodeInvolvements.length ? (
                selectedNodeInvolvements.map(inv => (
                  <div className="item-card" key={inv.id}>
                    <div><strong>{attributeLabel(inv.attribute_id)}</strong></div>
                    <div className="muted" style={{ marginTop: 6 }}>
                      Allowed: {(inv.allowed_values || []).length ? inv.allowed_values.join(", ") : "free-form / all"}
                    </div>
                    <div className="muted" style={{ marginTop: 6 }}>
                      Default: {(inv.default_values || []).length ? inv.default_values.join(", ") : "—"}
                    </div>
                  </div>
                ))
              ) : (
                <div className="muted">No involvements for this service.</div>
              )}
            </>
          ) : (
            <div className="muted">Click a node in the diagram to see service and involvement details.</div>
          )}
        </div>
      </div>
    </>
  );
}

export default function DiagramPage() {
  return (
    <ReactFlowProvider>
      <DiagramInner />
    </ReactFlowProvider>
  );
}
