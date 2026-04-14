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
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  async function load() {
    try {
      const [svc, rel, aims, layout] = await Promise.all([
        api.listServices(),
        api.listRelations(),
        api.listOrderAims(),
        api.listDiagramLayout()
      ]);
      setServices(svc);
      setRelations(rel);
      setOrderAims(aims);
      setLayoutRows(layout);
      setSaved("");
    } catch (err) {
      setError(err?.message || JSON.stringify(err));
    }
  }

  useEffect(() => {
    load();
  }, []);

  const serviceMap = useMemo(
    () => Object.fromEntries(services.map(s => [s.id, s])),
    [services]
  );

  const aimMap = useMemo(
    () => Object.fromEntries(orderAims.map(a => [a.id, a])),
    [orderAims]
  );

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

  function nodeKey(serviceId, aimId, subAimId) {
    return `${serviceId}||${aimId}||${subAimId}`;
  }

  const filteredRelations = useMemo(() => {
    if (!selectedServiceIds.length) return relations;
    return relations.filter(
      r =>
        selectedServiceIds.includes(r.parent_service_id) ||
        selectedServiceIds.includes(r.child_service_id)
    );
  }, [relations, selectedServiceIds]);

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
          data: {
            label: `${svc?.name || rel.parent_service_id}\n${aimLabel(rel.parent_order_aim_id)} / ${subAimLabel(rel.parent_order_aim_id, rel.parent_order_sub_aim_id)}`
          },
          position: { x: 100 + nodeMap.size * 50, y: 100 + nodeMap.size * 30 },
          style: {
            border: "1px solid #94a3b8",
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
            border: "1px solid #94a3b8",
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
        animated: false
      });
    });

    const layoutMap = Object.fromEntries(layoutRows.map(r => [r.node_key, r]));

    const nextNodes = Array.from(nodeMap.values()).map(node => {
      const savedLayout = layoutMap[node.id];
      if (savedLayout) {
        return {
          ...node,
          position: {
            x: Number(savedLayout.x),
            y: Number(savedLayout.y)
          },
          style: {
            ...node.style,
            width: savedLayout.width ? Number(savedLayout.width) : node.style.width
          }
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

  const onSelectionChange = useCallback((event) => {
    const values = Array.from(event.target.selectedOptions).map(o => o.value);
    setSelectedServiceIds(values);
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
          <button className="btn" onClick={saveLayout}>Save layout</button>
        </div>

        <div className="field">
          <label>Filter by service (optional)</label>
          <select multiple value={selectedServiceIds} onChange={onSelectionChange} style={{ minHeight: 120 }}>
            {services.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.type})
              </option>
            ))}
          </select>
          <div className="muted">Use Ctrl or Shift to select multiple services.</div>
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
            fitView
          >
            <MiniMap />
            <Controls />
            <Background />
          </ReactFlow>
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
