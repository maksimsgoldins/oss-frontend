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

  const [viewMode, setViewMode] = useState("FULL"); // FULL | SUBTREE_ONLY | EXPAND_FROM_NODE

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

  function serviceTypeColor(serviceType) {
    if (serviceType === "CFS") return "#dbeafe";
    if (serviceType === "RFS") return "#dcfce7";
    if (serviceType === "Resource") return "#ffedd5";
    return "#f3f4f6";
  }

  function serviceTypeBadgeColor(serviceType) {
    if (serviceType === "CFS") return "#2563eb";
    if (serviceType === "RFS") return "#16a34a";
    if (serviceType === "Resource") return "#ea580c";
    return "#64748b";
  }

  const availableSubAims = useMemo(() => {
    if (!selectedAimIds.length) return [];
    return orderAims
      .filter(a => selectedAimIds.includes(a.id))
      .flatMap(a => (a.sub_aims || []).map(sa => ({ ...sa, order_aim_id: a.id })));
  }, [orderAims, selectedAimIds]);

  const baseFilteredRelations = useMemo(() => {
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

  const relationGraph = useMemo(() => {
    const children = new Map();
    const parents = new Map();

    baseFilteredRelations.forEach(rel => {
      const parentKey = nodeKey(rel.parent_service_id, rel.parent_order_aim_id, rel.parent_order_sub_aim_id);
      const childKey = nodeKey(rel.child_service_id, rel.child_order_aim_id, rel.child_order_sub_aim_id);

      if (!children.has(parentKey)) children.set(parentKey, []);
      if (!parents.has(childKey)) parents.set(childKey, []);

      children.get(parentKey).push({ relation: rel, nodeKey: childKey });
      parents.get(childKey).push({ relation: rel, nodeKey: parentKey });
    });

    return { children, parents };
  }, [baseFilteredRelations]);

  const subtreeNodeKeys = useMemo(() => {
    if (!selectedNodeId || viewMode === "FULL") return null;

    const visited = new Set();
    const queue = [selectedNodeId];
    visited.add(selectedNodeId);

    while (queue.length) {
      const current = queue.shift();
      const nextChildren = relationGraph.children.get(current) || [];
      nextChildren.forEach(item => {
        if (!visited.has(item.nodeKey)) {
          visited.add(item.nodeKey);
          queue.push(item.nodeKey);
        }
      });
    }

    return visited;
  }, [selectedNodeId, viewMode, relationGraph]);

  const expandedNodeKeys = useMemo(() => {
    if (!selectedNodeId || viewMode !== "EXPAND_FROM_NODE") return null;

    const visited = new Set();
    const queue = [selectedNodeId];
    visited.add(selectedNodeId);

    while (queue.length) {
      const current = queue.shift();

      const nextChildren = relationGraph.children.get(current) || [];
      nextChildren.forEach(item => {
        if (!visited.has(item.nodeKey)) {
          visited.add(item.nodeKey);
          queue.push(item.nodeKey);
        }
      });

      const nextParents = relationGraph.parents.get(current) || [];
      nextParents.forEach(item => {
        if (!visited.has(item.nodeKey)) {
          visited.add(item.nodeKey);
          queue.push(item.nodeKey);
        }
      });
    }

    return visited;
  }, [selectedNodeId, viewMode, relationGraph]);

  const activeNodeKeys = useMemo(() => {
    if (viewMode === "SUBTREE_ONLY") return subtreeNodeKeys;
    if (viewMode === "EXPAND_FROM_NODE") return expandedNodeKeys;
    return null;
  }, [viewMode, subtreeNodeKeys, expandedNodeKeys]);

  const filteredRelations = useMemo(() => {
    if (!activeNodeKeys) return baseFilteredRelations;

    return baseFilteredRelations.filter(rel => {
      const parentKey = nodeKey(rel.parent_service_id, rel.parent_order_aim_id, rel.parent_order_sub_aim_id);
      const childKey = nodeKey(rel.child_service_id, rel.child_order_aim_id, rel.child_order_sub_aim_id);
      return activeNodeKeys.has(parentKey) && activeNodeKeys.has(childKey);
    });
  }, [baseFilteredRelations, activeNodeKeys]);

  const graphData = useMemo(() => {
    const nodeMap = new Map();
    const nextEdges = [];

    filteredRelations.forEach((rel, idx) => {
      const parentKey = nodeKey(rel.parent_service_id, rel.parent_order_aim_id, rel.parent_order_sub_aim_id);
      const childKey = nodeKey(rel.child_service_id, rel.child_order_aim_id, rel.child_order_sub_aim_id);

      if (!nodeMap.has(parentKey)) {
        const svc = serviceMap[rel.parent_service_id];
        const serviceType = svc?.type || "";
        const isSelected = selectedNodeId === parentKey;
        nodeMap.set(parentKey, {
          id: parentKey,
          data: {
            label: `${svc?.name || rel.parent_service_id}\n${aimLabel(rel.parent_order_aim_id)} / ${subAimLabel(rel.parent_order_aim_id, rel.parent_order_sub_aim_id)}`,
            serviceType
          },
          position: { x: 100 + nodeMap.size * 50, y: 100 + nodeMap.size * 30 },
          style: {
            border: isSelected ? "3px solid #2563eb" : "1px solid #94a3b8",
            borderRadius: 14,
            padding: 10,
            background: serviceTypeColor(serviceType),
            width: 250,
            whiteSpace: "pre-line",
            boxShadow: isSelected ? "0 0 0 3px rgba(37,99,235,0.15)" : "0 1px 3px rgba(0,0,0,0.08)"
          }
        });
      }

      if (!nodeMap.has(childKey)) {
        const svc = serviceMap[rel.child_service_id];
        const serviceType = svc?.type || "";
        const isSelected = selectedNodeId === childKey;
        nodeMap.set(childKey, {
          id: childKey,
          data: {
            label: `${svc?.name || rel.child_service_id}\n${aimLabel(rel.child_order_aim_id)} / ${subAimLabel(rel.child_order_aim_id, rel.child_order_sub_aim_id)}`,
            serviceType
          },
          position: { x: 400 + nodeMap.size * 50, y: 150 + nodeMap.size * 30 },
          style: {
            border: isSelected ? "3px solid #2563eb" : "1px solid #94a3b8",
            borderRadius: 14,
            padding: 10,
            background: serviceTypeColor(serviceType),
            width: 250,
            whiteSpace: "pre-line",
            boxShadow: isSelected ? "0 0 0 3px rgba(37,99,235,0.15)" : "0 1px 3px rgba(0,0,0,0.08)"
          }
        });
      }

      nextEdges.push({
        id: rel.id || `e-${idx}`,
        source: parentKey,
        target: childKey,
        label: rel.instantiation_mode,
        type: "smoothstep",
        animated: selectedEdgeId === rel.id,
        style: selectedEdgeId === rel.id ? { strokeWidth: 3, stroke: "#2563eb" } : { stroke: "#64748b" },
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
        width: typeof n.width === "number" ? n.width : 250,
        height: typeof n.height === "number" ? n.height : 90
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

  function clearSelection() {
    setSelectedEdgeId("");
    setSelectedNodeId("");
    setViewMode("FULL");
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
            <button className="btn secondary" onClick={clearSelection}>Clear selection</button>
            <button className="btn" onClick={saveLayout}>Save layout</button>
          </div>
        </div>

        <div className="row" style={{ marginBottom: 12 }}>
          <span className="pill" style={{ background: "#dbeafe", border: "1px solid #93c5fd" }}>CFS</span>
          <span className="pill" style={{ background: "#dcfce7", border: "1px solid #86efac" }}>RFS</span>
          <span className="pill" style={{ background: "#ffedd5", border: "1px solid #fdba74" }}>Resource</span>
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

        <div className="field">
          <label>View mode</label>
          <select value={viewMode} onChange={e => setViewMode(e.target.value)} disabled={!selectedNodeId}>
            <option value="FULL">Full graph</option>
            <option value="SUBTREE_ONLY">Show only selected subtree</option>
            <option value="EXPAND_FROM_NODE">Expand from selected node</option>
          </select>
          <div className="muted">Select a node first to enable subtree modes.</div>
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
                <div style={{ marginTop: 8 }}>
                  <span
                    className="pill"
                    style={{
                      background: serviceTypeColor(selectedNodeService.type),
                      border: `1px solid ${serviceTypeBadgeColor(selectedNodeService.type)}`
                    }}
                  >
                    {selectedNodeService.type}
                  </span>
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
