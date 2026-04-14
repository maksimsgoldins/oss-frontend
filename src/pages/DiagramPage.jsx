import React, { useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  MarkerType,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  Handle,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import { api } from "../api/client";

function serviceTypeColor(serviceType) {
  if (serviceType === "CFS") return "#dbeafe";
  if (serviceType === "RFS") return "#dcfce7";
  if (serviceType === "Resource") return "#ffedd5";
  return "#f3f4f6";
}

function serviceTypeBorderColor(serviceType) {
  if (serviceType === "CFS") return "#93c5fd";
  if (serviceType === "RFS") return "#86efac";
  if (serviceType === "Resource") return "#fdba74";
  return "#94a3b8";
}

function serviceTypeTextColor(serviceType) {
  if (serviceType === "CFS") return "#1d4ed8";
  if (serviceType === "RFS") return "#15803d";
  if (serviceType === "Resource") return "#c2410c";
  return "#475569";
}

function TypeBadge({ serviceType }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.03em",
        background: "#ffffffaa",
        border: `1px solid ${serviceTypeBorderColor(serviceType)}`,
        color: serviceTypeTextColor(serviceType),
        marginBottom: 6,
      }}
    >
      {serviceType || "Service"}
    </span>
  );
}

function ServiceNode({ data, selected }) {
  return (
    <div
      style={{
        minWidth: 250,
        maxWidth: 250,
        borderRadius: 14,
        padding: 12,
        background: serviceTypeColor(data.serviceType),
        border: selected
          ? "3px solid #2563eb"
          : `1px solid ${serviceTypeBorderColor(data.serviceType)}`,
        boxShadow: selected
          ? "0 0 0 3px rgba(37,99,235,0.15)"
          : "0 2px 6px rgba(0,0,0,0.08)",
        position: "relative",
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{
          width: 10,
          height: 10,
          border: "1px solid #64748b",
          background: "#fff",
        }}
      />

      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: 10,
          height: 10,
          border: "1px solid #64748b",
          background: "#fff",
        }}
      />

      <TypeBadge serviceType={data.serviceType} />

      <div
        style={{
          fontWeight: 700,
          fontSize: 14,
          lineHeight: 1.25,
          color: "#0f172a",
          marginBottom: 6,
          wordBreak: "break-word",
        }}
      >
        {data.serviceName}
      </div>

      <div
        style={{
          fontSize: 12,
          lineHeight: 1.35,
          color: "#334155",
          wordBreak: "break-word",
        }}
      >
        {data.aimLabel} / {data.subAimLabel}
      </div>
    </div>
  );
}

const nodeTypes = {
  serviceNode: ServiceNode,
};

function DiagramInner() {
  const [services, setServices] = useState([]);
  const [relations, setRelations] = useState([]);
  const [orderAims, setOrderAims] = useState([]);
  const [layoutRows, setLayoutRows] = useState([]);
  const [involvements, setInvolvements] = useState([]);
  const [propagations, setPropagations] = useState([]);
  const [attributes, setAttributes] = useState([]);

  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [serviceToAdd, setServiceToAdd] = useState("");

  const [focusParentServiceId, setFocusParentServiceId] = useState("");
  const [focusAimId, setFocusAimId] = useState("");
  const [focusSubAimId, setFocusSubAimId] = useState("");

  const [selectedEdgeId, setSelectedEdgeId] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState("");

  const [viewMode, setViewMode] = useState("FULL");
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
        api.listAttributes(),
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

  const serviceMap = useMemo(
    () => Object.fromEntries(services.map((s) => [s.id, s])),
    [services]
  );
  const aimMap = useMemo(
    () => Object.fromEntries(orderAims.map((a) => [a.id, a])),
    [orderAims]
  );
  const attributeMap = useMemo(
    () => Object.fromEntries(attributes.map((a) => [a.id, a])),
    [attributes]
  );
  const involvementMap = useMemo(
    () => Object.fromEntries(involvements.map((i) => [i.id, i])),
    [involvements]
  );

  function aimLabel(aimId) {
    const aim = aimMap[aimId];
    return aim ? aim.name || aim.code : aimId;
  }

  function subAimLabel(aimId, subAimId) {
    const aim = aimMap[aimId];
    if (!aim) return subAimId;
    const sub = (aim.sub_aims || []).find((x) => x.id === subAimId);
    return sub ? sub.name || sub.code : subAimId;
  }

  function serviceLabel(serviceId) {
    const svc = serviceMap[serviceId];
    return svc ? `${svc.name} (${svc.type})` : serviceId;
  }

  function attributeLabel(attributeId) {
    const attr = attributeMap[attributeId];
    return attr ? attr.name || attr.code : attributeId;
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

  const availableServicesToAdd = useMemo(
    () => services.filter((s) => !selectedServiceIds.includes(s.id)),
    [services, selectedServiceIds]
  );

  const serviceFilteredRelations = useMemo(() => {
    if (!selectedServiceIds.length) return relations;
    return relations.filter(
      (r) =>
        selectedServiceIds.includes(r.parent_service_id) ||
        selectedServiceIds.includes(r.child_service_id)
    );
  }, [relations, selectedServiceIds]);

  const availableFocusAims = useMemo(() => {
    if (!focusParentServiceId) return [];
    const ids = [
      ...new Set(
        serviceFilteredRelations
          .filter((r) => r.parent_service_id === focusParentServiceId)
          .map((r) => r.parent_order_aim_id)
      ),
    ];
    return ids.map((id) => aimMap[id]).filter(Boolean);
  }, [focusParentServiceId, serviceFilteredRelations, aimMap]);

  const availableFocusSubAims = useMemo(() => {
    if (!focusParentServiceId || !focusAimId) return [];
    const ids = [
      ...new Set(
        serviceFilteredRelations
          .filter(
            (r) =>
              r.parent_service_id === focusParentServiceId &&
              r.parent_order_aim_id === focusAimId
          )
          .map((r) => r.parent_order_sub_aim_id)
      ),
    ];
    const aim = aimMap[focusAimId];
    return (aim?.sub_aims || []).filter((sa) => ids.includes(sa.id));
  }, [focusParentServiceId, focusAimId, serviceFilteredRelations, aimMap]);

  const focusRootNodeId = useMemo(() => {
    if (!focusParentServiceId || !focusAimId || !focusSubAimId) return "";
    return nodeKey(focusParentServiceId, focusAimId, focusSubAimId);
  }, [focusParentServiceId, focusAimId, focusSubAimId]);

  const relationIndex = useMemo(() => {
    const children = new Map();
    const parents = new Map();

    serviceFilteredRelations.forEach((rel) => {
      const parentKey = nodeKey(
        rel.parent_service_id,
        rel.parent_order_aim_id,
        rel.parent_order_sub_aim_id
      );
      const childKey = nodeKey(
        rel.child_service_id,
        rel.child_order_aim_id,
        rel.child_order_sub_aim_id
      );

      if (!children.has(parentKey)) children.set(parentKey, []);
      if (!parents.has(childKey)) parents.set(childKey, []);

      children.get(parentKey).push({ relation: rel, nodeKey: childKey });
      parents.get(childKey).push({ relation: rel, nodeKey: parentKey });
    });

    return { children, parents };
  }, [serviceFilteredRelations]);

  const activeRootNodeId = selectedNodeId || focusRootNodeId;

  const activeNodeSet = useMemo(() => {
    if (!activeRootNodeId || viewMode === "FULL") return null;

    if (viewMode === "FOCUS_ONLY") {
      return new Set([activeRootNodeId]);
    }

    const visited = new Set([activeRootNodeId]);
    const queue = [activeRootNodeId];

    while (queue.length) {
      const current = queue.shift();

      const nextChildren = relationIndex.children.get(current) || [];
      nextChildren.forEach((item) => {
        if (!visited.has(item.nodeKey)) {
          visited.add(item.nodeKey);
          queue.push(item.nodeKey);
        }
      });

      if (viewMode === "EXPAND_FROM_NODE") {
        const nextParents = relationIndex.parents.get(current) || [];
        nextParents.forEach((item) => {
          if (!visited.has(item.nodeKey)) {
            visited.add(item.nodeKey);
            queue.push(item.nodeKey);
          }
        });
      }
    }

    return visited;
  }, [activeRootNodeId, viewMode, relationIndex]);

  const filteredRelations = useMemo(() => {
    if (viewMode === "FULL") return serviceFilteredRelations;

    if (viewMode === "FOCUS_ONLY") {
      if (!activeRootNodeId) return serviceFilteredRelations;
      const root = parseNodeKey(activeRootNodeId);
      return serviceFilteredRelations.filter(
        (r) =>
          r.parent_service_id === root.serviceId &&
          r.parent_order_aim_id === root.aimId &&
          r.parent_order_sub_aim_id === root.subAimId
      );
    }

    if (!activeNodeSet) return serviceFilteredRelations;

    return serviceFilteredRelations.filter((rel) => {
      const parentKey = nodeKey(
        rel.parent_service_id,
        rel.parent_order_aim_id,
        rel.parent_order_sub_aim_id
      );
      const childKey = nodeKey(
        rel.child_service_id,
        rel.child_order_aim_id,
        rel.child_order_sub_aim_id
      );
      return activeNodeSet.has(parentKey) && activeNodeSet.has(childKey);
    });
  }, [serviceFilteredRelations, viewMode, activeRootNodeId, activeNodeSet]);

  const graphData = useMemo(() => {
    const nodeMap = new Map();
    const nextEdges = [];

    filteredRelations.forEach((rel, idx) => {
      const parentKey = nodeKey(
        rel.parent_service_id,
        rel.parent_order_aim_id,
        rel.parent_order_sub_aim_id
      );
      const childKey = nodeKey(
        rel.child_service_id,
        rel.child_order_aim_id,
        rel.child_order_sub_aim_id
      );

      if (!nodeMap.has(parentKey)) {
        const svc = serviceMap[rel.parent_service_id];
        nodeMap.set(parentKey, {
          id: parentKey,
          type: "serviceNode",
          data: {
            serviceName: svc?.name || rel.parent_service_id,
            serviceType: svc?.type || "",
            aimLabel: aimLabel(rel.parent_order_aim_id),
            subAimLabel: subAimLabel(
              rel.parent_order_aim_id,
              rel.parent_order_sub_aim_id
            ),
          },
          position: { x: 100 + nodeMap.size * 50, y: 100 + nodeMap.size * 30 },
        });
      }

      if (!nodeMap.has(childKey)) {
        const svc = serviceMap[rel.child_service_id];
        nodeMap.set(childKey, {
          id: childKey,
          type: "serviceNode",
          data: {
            serviceName: svc?.name || rel.child_service_id,
            serviceType: svc?.type || "",
            aimLabel: aimLabel(rel.child_order_aim_id),
            subAimLabel: subAimLabel(
              rel.child_order_aim_id,
              rel.child_order_sub_aim_id
            ),
          },
          position: { x: 400 + nodeMap.size * 50, y: 150 + nodeMap.size * 30 },
        });
      }

      nextEdges.push({
        id: rel.id || `e-${idx}`,
        source: parentKey,
        target: childKey,
        label: rel.instantiation_mode,
        type: "smoothstep",
        animated: false,
        style: { stroke: "#64748b", strokeWidth: 1.8 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 18,
          height: 18,
          color: "#64748b",
        },
        data: { relationId: rel.id },
      });
    });

    const layoutMap = Object.fromEntries(layoutRows.map((r) => [r.node_key, r]));

    const nextNodes = Array.from(nodeMap.values()).map((node) => {
      const savedLayout = layoutMap[node.id];
      if (savedLayout) {
        return {
          ...node,
          position: { x: Number(savedLayout.x), y: Number(savedLayout.y) },
        };
      }
      return node;
    });

    return { nextNodes, nextEdges };
  }, [filteredRelations, serviceMap, aimMap, layoutRows]);

  useEffect(() => {
    setNodes(graphData.nextNodes);
    setEdges(graphData.nextEdges);
  }, [graphData, setNodes, setEdges]);

  useEffect(() => {
    setEdges((prev) =>
      prev.map((edge) => ({
        ...edge,
        animated: edge.id === selectedEdgeId,
        style:
          edge.id === selectedEdgeId
            ? { ...(edge.style || {}), strokeWidth: 3.2, stroke: "#2563eb" }
            : { ...(edge.style || {}), strokeWidth: 1.8, stroke: "#64748b" },
        markerEnd:
          edge.id === selectedEdgeId
            ? {
                type: MarkerType.ArrowClosed,
                width: 20,
                height: 20,
                color: "#2563eb",
              }
            : {
                type: MarkerType.ArrowClosed,
                width: 18,
                height: 18,
                color: "#64748b",
              },
      }))
    );
  }, [selectedEdgeId, setEdges]);

  async function saveLayout() {
    try {
      setError("");
      const payload = nodes.map((n) => ({
        node_key: n.id,
        x: n.position.x,
        y: n.position.y,
        width: 250,
        height: 90,
      }));
      await api.replaceDiagramLayout(payload);
      setSaved("Layout saved.");
      await load();
    } catch (err) {
      setError(err?.message || JSON.stringify(err));
    }
  }

  const selectedRelation = relations.find((r) => r.id === selectedEdgeId);
  const selectedPropagationRules = propagations.filter(
    (p) => p.relation_id === selectedEdgeId
  );

  const selectedNode = selectedNodeId ? parseNodeKey(selectedNodeId) : null;
  const selectedNodeService = selectedNode
    ? serviceMap[selectedNode.serviceId]
    : null;
  const selectedNodeInvolvements = selectedNode
    ? involvements.filter((i) => i.service_id === selectedNode.serviceId)
    : [];

  function addServiceFilter() {
    if (!serviceToAdd) return;
    if (selectedServiceIds.includes(serviceToAdd)) return;
    setSelectedServiceIds((prev) => [...prev, serviceToAdd]);
    setServiceToAdd("");
  }

  function removeServiceFilter(serviceId) {
    setSelectedServiceIds((prev) => prev.filter((x) => x !== serviceId));
  }

  function clearFilters() {
    setSelectedServiceIds([]);
    setServiceToAdd("");
    setFocusParentServiceId("");
    setFocusAimId("");
    setFocusSubAimId("");
  }

  function clearSelection() {
    setSelectedEdgeId("");
    setSelectedNodeId("");
    setViewMode("FULL");
  }

  function useNodeAsFocus() {
    if (!selectedNode) return;
    setFocusParentServiceId(selectedNode.serviceId);
    setFocusAimId(selectedNode.aimId);
    setFocusSubAimId(selectedNode.subAimId);
  }

  function showSubtreeFromNode() {
    if (!selectedNode) return;
    useNodeAsFocus();
    setViewMode("SUBTREE_ONLY");
  }

  function expandFromNode() {
    if (!selectedNode) return;
    useNodeAsFocus();
    setViewMode("EXPAND_FROM_NODE");
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
            <button className="btn secondary" onClick={clearFilters}>
              Clear filters
            </button>
            <button className="btn secondary" onClick={clearSelection}>
              Clear selection
            </button>
            <button className="btn" onClick={saveLayout}>
              Save layout
            </button>
          </div>
        </div>

        <div className="row" style={{ marginBottom: 12 }}>
          <span
            className="pill"
            style={{ background: "#dbeafe", border: "1px solid #93c5fd" }}
          >
            CFS
          </span>
          <span
            className="pill"
            style={{ background: "#dcfce7", border: "1px solid #86efac" }}
          >
            RFS
          </span>
          <span
            className="pill"
            style={{ background: "#ffedd5", border: "1px solid #fdba74" }}
          >
            Resource
          </span>
        </div>

        <div className="split">
          <div className="field">
            <label>Add service filter</label>
            <div className="row">
              <select
                value={serviceToAdd}
                onChange={(e) => setServiceToAdd(e.target.value)}
              >
                <option value="">Select service</option>
                {availableServicesToAdd.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.type})
                  </option>
                ))}
              </select>
              <button
                className="btn secondary"
                type="button"
                onClick={addServiceFilter}
              >
                Add
              </button>
            </div>
            {!!selectedServiceIds.length && (
              <div className="row" style={{ marginTop: 8 }}>
                {selectedServiceIds.map((id) => (
                  <span key={id} className="pill">
                    {serviceLabel(id)}{" "}
                    <button
                      type="button"
                      onClick={() => removeServiceFilter(id)}
                      style={{
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="field">
            <label>Focus parent service</label>
            <select
              value={focusParentServiceId}
              onChange={(e) => {
                setFocusParentServiceId(e.target.value);
                setFocusAimId("");
                setFocusSubAimId("");
              }}
            >
              <option value="">None</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.type})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="split">
          <div className="field">
            <label>Focus aim</label>
            <select
              value={focusAimId}
              onChange={(e) => {
                setFocusAimId(e.target.value);
                setFocusSubAimId("");
              }}
              disabled={!focusParentServiceId}
            >
              <option value="">None</option>
              {availableFocusAims.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name || a.code}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Focus sub-aim</label>
            <select
              value={focusSubAimId}
              onChange={(e) => setFocusSubAimId(e.target.value)}
              disabled={!focusAimId}
            >
              <option value="">None</option>
              {availableFocusSubAims.map((sa) => (
                <option key={sa.id} value={sa.id}>
                  {sa.name || sa.code}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label>View mode</label>
          <select value={viewMode} onChange={(e) => setViewMode(e.target.value)}>
            <option value="FULL">Full graph</option>
            <option value="FOCUS_ONLY">
              Show only focus node outgoing relations
            </option>
            <option value="SUBTREE_ONLY">Show only selected subtree</option>
            <option value="EXPAND_FROM_NODE">Expand from selected node</option>
          </select>
          <div className="muted">
            `FOCUS_ONLY` uses Focus Parent Service / Aim / Sub-aim.
            `SUBTREE_ONLY` and `EXPAND_FROM_NODE` use clicked node first, then
            fall back to focus scenario if set.
          </div>
        </div>

        {saved && <div className="muted" style={{ marginTop: 8 }}>{saved}</div>}
        {error && <div className="error">{error}</div>}
      </div>

      <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ height: "70vh", width: "100%" }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
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
                  {serviceLabel(selectedRelation.parent_service_id)} /{" "}
                  {aimLabel(selectedRelation.parent_order_aim_id)} /{" "}
                  {subAimLabel(
                    selectedRelation.parent_order_aim_id,
                    selectedRelation.parent_order_sub_aim_id
                  )}
                  {" → "}
                  {serviceLabel(selectedRelation.child_service_id)} /{" "}
                  {aimLabel(selectedRelation.child_order_aim_id)} /{" "}
                  {subAimLabel(
                    selectedRelation.child_order_aim_id,
                    selectedRelation.child_order_sub_aim_id
                  )}
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
                      <strong>
                        {involvementLabel(rule.parent_attribute_involvement_id)}
                      </strong>
                      {" → "}
                      <strong>
                        {involvementLabel(rule.child_attribute_involvement_id)}
                      </strong>
                    </div>
                    <div className="muted" style={{ marginTop: 6 }}>
                      {rule.allowed_values.length
                        ? rule.allowed_values.join(", ")
                        : "All values"}
                    </div>
                  </div>
                ))
              ) : (
                <div className="muted">
                  No propagation rules for this relation.
                </div>
              )}
            </>
          ) : (
            <div className="muted">
              Click an edge in the diagram to see relation and propagation
              details.
            </div>
          )}
        </div>

        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Selected node details</h3>
          {selectedNode && selectedNodeService ? (
            <>
              <div className="item-card">
                <div>
                  <strong>Service:</strong> {selectedNodeService.name} (
                  {selectedNodeService.type})
                </div>
                <div className="muted" style={{ marginTop: 6 }}>
                  {aimLabel(selectedNode.aimId)} /{" "}
                  {subAimLabel(selectedNode.aimId, selectedNode.subAimId)}
                </div>
                <div className="row" style={{ marginTop: 10 }}>
                  <button
                    className="btn secondary"
                    type="button"
                    onClick={useNodeAsFocus}
                  >
                    Use as focus
                  </button>
                  <button
                    className="btn secondary"
                    type="button"
                    onClick={showSubtreeFromNode}
                  >
                    Show subtree
                  </button>
                  <button
                    className="btn secondary"
                    type="button"
                    onClick={expandFromNode}
                  >
                    Expand from here
                  </button>
                </div>
              </div>

              <h4>Involvements</h4>
              {selectedNodeInvolvements.length ? (
                selectedNodeInvolvements.map((inv) => (
                  <div className="item-card" key={inv.id}>
                    <div>
                      <strong>{attributeLabel(inv.attribute_id)}</strong>
                    </div>
                    <div className="muted" style={{ marginTop: 6 }}>
                      Allowed:{" "}
                      {(inv.allowed_values || []).length
                        ? inv.allowed_values.join(", ")
                        : "free-form / all"}
                    </div>
                    <div className="muted" style={{ marginTop: 6 }}>
                      Default:{" "}
                      {(inv.default_values || []).length
                        ? inv.default_values.join(", ")
                        : "—"}
                    </div>
                  </div>
                ))
              ) : (
                <div className="muted">No involvements for this service.</div>
              )}
            </>
          ) : (
            <div className="muted">
              Click a node in the diagram to see service and involvement details.
            </div>
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
