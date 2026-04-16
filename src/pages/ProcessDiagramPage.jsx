import React, { useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  MarkerType,
  ReactFlowProvider,
  Handle,
  Position,
  useEdgesState,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";
import { api } from "../api/client";

function elementTypeColor(elementType) {
  if (elementType === "task") return "#dbeafe";
  if (elementType === "gateway") return "#fef3c7";
  if (elementType === "event") return "#dcfce7";
  return "#f3f4f6";
}

function elementTypeBorderColor(elementType) {
  if (elementType === "task") return "#93c5fd";
  if (elementType === "gateway") return "#f59e0b";
  if (elementType === "event") return "#86efac";
  return "#94a3b8";
}

function elementTypeTextColor(elementType) {
  if (elementType === "task") return "#1d4ed8";
  if (elementType === "gateway") return "#b45309";
  if (elementType === "event") return "#15803d";
  return "#475569";
}

function TypeBadge({ elementType }) {
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
        border: `1px solid ${elementTypeBorderColor(elementType)}`,
        color: elementTypeTextColor(elementType),
        marginBottom: 6,
      }}
    >
      {elementType || "element"}
    </span>
  );
}

function ProcessElementNode({ data, selected }) {
  return (
    <div
      style={{
        minWidth: 220,
        maxWidth: 220,
        borderRadius: 14,
        padding: 12,
        background: elementTypeColor(data.elementType),
        border: selected
          ? "3px solid #2563eb"
          : `1px solid ${elementTypeBorderColor(data.elementType)}`,
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

      <TypeBadge elementType={data.elementType} />

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
        {data.title}
      </div>

      <div
        style={{
          fontSize: 12,
          lineHeight: 1.35,
          color: "#334155",
          wordBreak: "break-word",
        }}
      >
        {data.subtitle}
      </div>
    </div>
  );
}

const nodeTypes = {
  processElementNode: ProcessElementNode,
};

export default function ProcessDiagramPage() {
  return (
    <ReactFlowProvider>
      <ProcessDiagramInner />
    </ReactFlowProvider>
  );
}

function ProcessDiagramInner() {
  const [processSpecs, setProcessSpecs] = useState([]);
  const [services, setServices] = useState([]);
  const [orderAims, setOrderAims] = useState([]);
  const [elements, setElements] = useState([]);
  const [flows, setFlows] = useState([]);

  const [selectedProcessId, setSelectedProcessId] = useState("");
  const [selectedElementId, setSelectedElementId] = useState("");
  const [selectedFlowId, setSelectedFlowId] = useState("");

  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  async function loadAll() {
    try {
      const [proc, svc, aims] = await Promise.all([
        api.listProcessSpecs(),
        api.listServices(),
        api.listOrderAims(),
      ]);
      setProcessSpecs(proc);
      setServices(svc);
      setOrderAims(aims);

      const nextProcessId = selectedProcessId || proc[0]?.id || "";
      if (!selectedProcessId && nextProcessId) {
        setSelectedProcessId(nextProcessId);
      }
      if (nextProcessId) {
        await loadProcessGraph(nextProcessId);
      }
    } catch (err) {
      setError(err?.message || JSON.stringify(err));
    }
  }

  async function loadProcessGraph(processId) {
    try {
      const [elementList, flowList] = await Promise.all([
        api.listProcessElements(processId),
        api.listProcessFlows(processId),
      ]);
      setElements(elementList);
      setFlows(flowList);
      setSelectedElementId("");
      setSelectedFlowId("");
      setSaved("");
    } catch (err) {
      setError(err?.message || JSON.stringify(err));
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function serviceLabel(serviceId) {
    const svc = services.find(x => x.id === serviceId);
    return svc ? `${svc.name} (${svc.type})` : serviceId;
  }

  function aimLabel(aimId) {
    const aim = orderAims.find(x => x.id === aimId);
    return aim ? (aim.name || aim.code) : aimId;
  }

  function subAimLabel(aimId, subAimId) {
    const aim = orderAims.find(x => x.id === aimId);
    const sub = aim?.sub_aims?.find(x => x.id === subAimId);
    return sub ? (sub.name || sub.code) : subAimId;
  }

  function processLabel(item) {
    return `${item.name} • ${serviceLabel(item.service_spec_id)} / ${aimLabel(item.order_aim_id)} / ${subAimLabel(item.order_aim_id, item.order_sub_aim_id)}`;
  }

  const selectedProcess = useMemo(
    () => processSpecs.find(x => x.id === selectedProcessId),
    [processSpecs, selectedProcessId]
  );

  const elementMap = useMemo(
    () => Object.fromEntries(elements.map(x => [x.id, x])),
    [elements]
  );

  function referencedSpecSubtitle(item) {
    if (item.element_type === "task") return item.task_spec_id || "task";
    if (item.element_type === "gateway") return item.gateway_spec_id || "gateway";
    return item.event_spec_id || "event";
  }

  const graphData = useMemo(() => {
    const nextNodes = elements.map((item, index) => ({
      id: item.id,
      type: "processElementNode",
      data: {
        elementType: item.element_type,
        title: item.name_override || item.element_key,
        subtitle: referencedSpecSubtitle(item),
      },
      position: {
        x: item.x ?? (100 + index * 80),
        y: item.y ?? (100 + index * 40),
      },
    }));

    const nextEdges = flows.map(item => ({
      id: item.id,
      source: item.source_element_id,
      target: item.target_element_id,
      label: item.label || item.flow_type,
      type: "smoothstep",
      animated: false,
      style: { stroke: "#64748b", strokeWidth: 1.8 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 18,
        height: 18,
        color: "#64748b",
      },
    }));

    return { nextNodes, nextEdges };
  }, [elements, flows]);

  useEffect(() => {
    setNodes(graphData.nextNodes);
    setEdges(graphData.nextEdges);
  }, [graphData, setNodes, setEdges]);

  useEffect(() => {
    setEdges(prev =>
      prev.map(edge => ({
        ...edge,
        animated: edge.id === selectedFlowId,
        style:
          edge.id === selectedFlowId
            ? { ...(edge.style || {}), strokeWidth: 3.2, stroke: "#2563eb" }
            : { ...(edge.style || {}), strokeWidth: 1.8, stroke: "#64748b" },
        markerEnd:
          edge.id === selectedFlowId
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
  }, [selectedFlowId, setEdges]);

  const selectedElement = selectedElementId ? elementMap[selectedElementId] : null;
  const selectedFlow = flows.find(x => x.id === selectedFlowId) || null;

  async function saveLayout() {
    try {
      setError("");
      setSaved("");

      await Promise.all(
        nodes.map(node =>
          api.updateProcessElement(node.id, {
            x: node.position.x,
            y: node.position.y,
          })
        )
      );

      setSaved("Layout saved.");
      await loadProcessGraph(selectedProcessId);
    } catch (err) {
      setError(err?.message || JSON.stringify(err));
    }
  }

  function clearSelection() {
    setSelectedElementId("");
    setSelectedFlowId("");
  }

  return (
    <>
      <div className="panel">
        <div className="header-line">
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 4 }}>Process Diagram</h2>
            <div className="muted">Visual layout for Process Elements and Process Flows.</div>
          </div>
          <div className="row">
            <button className="btn secondary" onClick={clearSelection}>Clear selection</button>
            <button className="btn" onClick={saveLayout} disabled={!selectedProcessId}>Save layout</button>
          </div>
        </div>

        <div className="row" style={{ marginBottom: 12 }}>
          <span className="pill" style={{ background: "#dbeafe", border: "1px solid #93c5fd" }}>task</span>
          <span className="pill" style={{ background: "#fef3c7", border: "1px solid #f59e0b" }}>gateway</span>
          <span className="pill" style={{ background: "#dcfce7", border: "1px solid #86efac" }}>event</span>
        </div>

        <div className="field">
          <label>Process Spec</label>
          <select
            value={selectedProcessId}
            onChange={async e => {
              const nextId = e.target.value;
              setSelectedProcessId(nextId);
              setSelectedElementId("");
              setSelectedFlowId("");
              if (nextId) await loadProcessGraph(nextId);
            }}
          >
            <option value="">Select Process Spec</option>
            {processSpecs.map(item => (
              <option key={item.id} value={item.id}>
                {processLabel(item)}
              </option>
            ))}
          </select>
        </div>

        {selectedProcess && (
          <div className="item-card" style={{ marginTop: 12 }}>
            <div><strong>{selectedProcess.name}</strong></div>
            <div className="muted" style={{ marginTop: 4 }}>
              {serviceLabel(selectedProcess.service_spec_id)} / {aimLabel(selectedProcess.order_aim_id)} / {subAimLabel(selectedProcess.order_aim_id, selectedProcess.order_sub_aim_id)}
            </div>
            <div className="muted" style={{ marginTop: 4 }}>
              {selectedProcess.code} • v{selectedProcess.version} • {selectedProcess.status}
            </div>
          </div>
        )}

        {saved && <div className="muted" style={{ marginTop: 10 }}>{saved}</div>}
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
            onNodeClick={(_, node) => {
              setSelectedElementId(node.id);
              setSelectedFlowId("");
            }}
            onEdgeClick={(_, edge) => {
              setSelectedFlowId(edge.id);
              setSelectedElementId("");
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
          <h3 style={{ marginTop: 0 }}>Selected Element</h3>
          {selectedElement ? (
            <>
              <div className="item-card">
                <div><strong>Key:</strong> {selectedElement.element_key}</div>
                <div className="muted" style={{ marginTop: 6 }}>
                  Type: {selectedElement.element_type}
                </div>
                <div className="muted" style={{ marginTop: 6 }}>
                  Name override: {selectedElement.name_override || "—"}
                </div>
                <div className="muted" style={{ marginTop: 6 }}>
                  X / Y: {selectedElement.x ?? "—"} / {selectedElement.y ?? "—"}
                </div>
              </div>

              <div className="item-card">
                <div><strong>Referenced Spec</strong></div>
                <div className="muted" style={{ marginTop: 6 }}>
                  {selectedElement.element_type === "task" && `Task Spec: ${selectedElement.task_spec_id || "—"}`}
                  {selectedElement.element_type === "gateway" && `Gateway Spec: ${selectedElement.gateway_spec_id || "—"}`}
                  {selectedElement.element_type === "event" && `Event Spec: ${selectedElement.event_spec_id || "—"}`}
                </div>
              </div>
            </>
          ) : (
            <div className="muted">Click a node in the diagram to see element details.</div>
          )}
        </div>

        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Selected Flow</h3>
          {selectedFlow ? (
            <div className="item-card">
              <div><strong>{selectedFlow.label || selectedFlow.flow_type}</strong></div>
              <div className="muted" style={{ marginTop: 6 }}>
                {elementMap[selectedFlow.source_element_id]?.element_key || selectedFlow.source_element_id}
                {" → "}
                {elementMap[selectedFlow.target_element_id]?.element_key || selectedFlow.target_element_id}
              </div>
              <div className="muted" style={{ marginTop: 6 }}>
                Type: {selectedFlow.flow_type}
              </div>
              <div className="muted" style={{ marginTop: 6 }}>
                Default: {selectedFlow.is_default ? "Yes" : "No"}
              </div>
              <div className="muted" style={{ marginTop: 6 }}>
                Condition: {selectedFlow.condition_expression || "—"}
              </div>
            </div>
          ) : (
            <div className="muted">Click an edge in the diagram to see flow details.</div>
          )}
        </div>
      </div>
    </>
  );
}
