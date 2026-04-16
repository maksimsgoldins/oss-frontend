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
  if (elementType === "scenario") return "#eef2ff";
  return "#f3f4f6";
}

function elementTypeBorderColor(elementType) {
  if (elementType === "task") return "#93c5fd";
  if (elementType === "gateway") return "#f59e0b";
  if (elementType === "event") return "#86efac";
  if (elementType === "scenario") return "#818cf8";
  return "#94a3b8";
}

function elementTypeTextColor(elementType) {
  if (elementType === "task") return "#1d4ed8";
  if (elementType === "gateway") return "#b45309";
  if (elementType === "event") return "#15803d";
  if (elementType === "scenario") return "#4338ca";
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

function OrchestrationNode({ data, selected }) {
  const isScenario = data.elementType === "scenario";
  return (
    <div
      style={{
        minWidth: isScenario ? 320 : 220,
        maxWidth: isScenario ? 320 : 220,
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
      {!isScenario && (
        <>
          <Handle
            type="target"
            position={Position.Left}
            style={{ width: 10, height: 10, border: "1px solid #64748b", background: "#fff" }}
          />
          <Handle
            type="source"
            position={Position.Right}
            style={{ width: 10, height: 10, border: "1px solid #64748b", background: "#fff" }}
          />
        </>
      )}

      <TypeBadge elementType={data.elementType} />
      <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.25, color: "#0f172a", marginBottom: 6, wordBreak: "break-word" }}>
        {data.title}
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.35, color: "#334155", wordBreak: "break-word" }}>
        {data.subtitle}
      </div>
      {data.extra && (
        <div style={{ fontSize: 11, lineHeight: 1.35, color: "#64748b", wordBreak: "break-word", marginTop: 6 }}>
          {data.extra}
        </div>
      )}
    </div>
  );
}

const nodeTypes = {
  orchestrationNode: OrchestrationNode,
};

export default function CrossProcessDiagramPage() {
  return (
    <ReactFlowProvider>
      <CrossProcessDiagramInner />
    </ReactFlowProvider>
  );
}

function CrossProcessDiagramInner() {
  const [services, setServices] = useState([]);
  const [orderAims, setOrderAims] = useState([]);
  const [processSpecs, setProcessSpecs] = useState([]);
  const [interDeps, setInterDeps] = useState([]);

  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedAimId, setSelectedAimId] = useState("");
  const [selectedSubAimId, setSelectedSubAimId] = useState("");

  const [selectedScenarios, setSelectedScenarios] = useState([]);
  const [scenarioData, setScenarioData] = useState({});

  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [selectedEdgeId, setSelectedEdgeId] = useState("");

  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  async function loadBase() {
    try {
      const [svc, aims, proc, deps] = await Promise.all([
        api.listServices(),
        api.listOrderAims(),
        api.listProcessSpecs(),
        api.listInterProcessDependencies(),
      ]);
      setServices(svc);
      setOrderAims(aims);
      setProcessSpecs(proc);
      setInterDeps(deps);
    } catch (err) {
      setError(err?.message || JSON.stringify(err));
    }
  }

  useEffect(() => {
    loadBase();
  }, []);

  const currentAim = useMemo(
    () => orderAims.find(x => x.id === selectedAimId),
    [orderAims, selectedAimId]
  );

  const availableSubAims = currentAim?.sub_aims || [];

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

  function scenarioKey(serviceId, aimId, subAimId) {
    return `${serviceId}||${aimId}||${subAimId}`;
  }

  function parseNodeId(nodeId) {
    if (!nodeId) return null;
    const parts = nodeId.split("::");
    if (parts[0] === "scenario") {
      return { kind: "scenario", processSpecId: parts[1] };
    }
    if (parts[0] === "element") {
      return { kind: "element", processSpecId: parts[1], elementId: parts[2] };
    }
    return null;
  }

  function findProcessForScenario(serviceId, aimId, subAimId) {
    const matches = processSpecs.filter(
      x =>
        x.service_spec_id === serviceId &&
        x.order_aim_id === aimId &&
        x.order_sub_aim_id === subAimId
    );

    if (!matches.length) return null;

    const active = matches.filter(x => x.status === "active");
    if (active.length === 1) return active[0];
    if (active.length > 1) {
      return active.sort((a, b) => Number(b.version || 0) - Number(a.version || 0))[0];
    }

    return matches.sort((a, b) => Number(b.version || 0) - Number(a.version || 0))[0];
  }

  async function addScenario() {
    try {
      setError("");
      setSaved("");

      if (!selectedServiceId) return setError("Service is required.");
      if (!selectedAimId) return setError("Aim is required.");
      if (!selectedSubAimId) return setError("Sub-aim is required.");

      const key = scenarioKey(selectedServiceId, selectedAimId, selectedSubAimId);
      if (selectedScenarios.some(x => x.key === key)) return;

      const process = findProcessForScenario(selectedServiceId, selectedAimId, selectedSubAimId);
      let elements = [];
      let flows = [];

      if (process) {
        [elements, flows] = await Promise.all([
          api.listProcessElements(process.id),
          api.listProcessFlows(process.id),
        ]);
      }

      const scenario = {
        key,
        service_spec_id: selectedServiceId,
        order_aim_id: selectedAimId,
        order_sub_aim_id: selectedSubAimId,
        process_spec_id: process?.id || null,
      };

      setSelectedScenarios(prev => [...prev, scenario]);
      setScenarioData(prev => ({
        ...prev,
        [key]: {
          process,
          elements,
          flows,
        },
      }));

      setSelectedServiceId("");
      setSelectedAimId("");
      setSelectedSubAimId("");
    } catch (err) {
      setError(err?.message || JSON.stringify(err));
    }
  }

  function removeScenario(key) {
    setSelectedScenarios(prev => prev.filter(x => x.key !== key));
    setScenarioData(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function buildScenarioTitle(s) {
    return `${serviceLabel(s.service_spec_id)} / ${aimLabel(s.order_aim_id)} / ${subAimLabel(s.order_aim_id, s.order_sub_aim_id)}`;
  }

  const visibleProcessIds = useMemo(
    () => new Set(selectedScenarios.map(x => x.process_spec_id).filter(Boolean)),
    [selectedScenarios]
  );

  const graphData = useMemo(() => {
    const nextNodes = [];
    const nextEdges = [];

    selectedScenarios.forEach((scenario, index) => {
      const data = scenarioData[scenario.key] || {};
      const process = data.process || null;
      const elements = data.elements || [];
      const flows = data.flows || [];

      const offsetX = 80 + index * 480;
      const offsetY = 140;

      nextNodes.push({
        id: `scenario::${scenario.process_spec_id || scenario.key}`,
        type: "orchestrationNode",
        data: {
          elementType: "scenario",
          title: buildScenarioTitle(scenario),
          subtitle: process
            ? `${process.name} • ${process.code}`
            : "No Process Spec found",
          extra: process
            ? `v${process.version} • ${process.status}`
            : "Create Process Spec for this service / aim / sub-aim",
        },
        position: { x: offsetX, y: 20 },
        draggable: false,
      });

      elements.forEach((item, elIndex) => {
        nextNodes.push({
          id: `element::${scenario.process_spec_id}::${item.id}`,
          type: "orchestrationNode",
          data: {
            elementType: item.element_type,
            title: item.name_override || item.element_key,
            subtitle: item.element_key,
            extra:
              item.element_type === "task"
                ? `Task Spec: ${item.task_spec_id || "—"}`
                : item.element_type === "gateway"
                  ? `Gateway Spec: ${item.gateway_spec_id || "—"}`
                  : `Event Spec: ${item.event_spec_id || "—"}`,
          },
          position: {
            x: offsetX + (item.x ?? (60 + (elIndex % 2) * 220)),
            y: offsetY + (item.y ?? (elIndex * 110)),
          },
        });
      });

      flows.forEach(item => {
        nextEdges.push({
          id: `flow::${item.id}`,
          source: `element::${scenario.process_spec_id}::${item.source_element_id}`,
          target: `element::${scenario.process_spec_id}::${item.target_element_id}`,
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
          data: { edgeKind: "flow", rawId: item.id, processSpecId: scenario.process_spec_id },
        });
      });
    });

    interDeps
      .filter(dep => visibleProcessIds.has(dep.source_process_spec_id) && visibleProcessIds.has(dep.target_process_spec_id))
      .forEach(dep => {
        nextEdges.push({
          id: `dep::${dep.id}`,
          source: `element::${dep.source_process_spec_id}::${dep.source_element_id}`,
          target: `element::${dep.target_process_spec_id}::${dep.target_element_id}`,
          label: dep.label || dep.dependency_type,
          type: "smoothstep",
          animated: true,
          style: { stroke: "#7c3aed", strokeWidth: 2.4, strokeDasharray: "6 4" },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
            color: "#7c3aed",
          },
          data: { edgeKind: "dependency", rawId: dep.id },
        });
      });

    return { nextNodes, nextEdges };
  }, [selectedScenarios, scenarioData, interDeps, visibleProcessIds, services, orderAims]);

  useEffect(() => {
    setNodes(graphData.nextNodes);
    setEdges(graphData.nextEdges);
  }, [graphData, setNodes, setEdges]);

  useEffect(() => {
    setEdges(prev =>
      prev.map(edge => {
        const isDep = edge.data?.edgeKind === "dependency";
        const baseStyle = isDep
          ? { stroke: "#7c3aed", strokeWidth: 2.4, strokeDasharray: "6 4" }
          : { stroke: "#64748b", strokeWidth: 1.8 };
        const selectedStyle = isDep
          ? { stroke: "#2563eb", strokeWidth: 3.4, strokeDasharray: "6 4" }
          : { stroke: "#2563eb", strokeWidth: 3.2 };
        return {
          ...edge,
          animated: edge.id === selectedEdgeId || isDep,
          style: edge.id === selectedEdgeId ? selectedStyle : baseStyle,
          markerEnd: edge.id === selectedEdgeId
            ? { type: MarkerType.ArrowClosed, width: 20, height: 20, color: "#2563eb" }
            : edge.markerEnd,
        };
      })
    );
  }, [selectedEdgeId, setEdges]);

  const selectedNodeMeta = parseNodeId(selectedNodeId);

  const selectedScenario = useMemo(() => {
    if (!selectedNodeMeta || selectedNodeMeta.kind !== "scenario") return null;
    return selectedScenarios.find(x => x.process_spec_id === selectedNodeMeta.processSpecId) || null;
  }, [selectedNodeMeta, selectedScenarios]);

  const selectedElement = useMemo(() => {
    if (!selectedNodeMeta || selectedNodeMeta.kind !== "element") return null;
    const scenario = selectedScenarios.find(x => x.process_spec_id === selectedNodeMeta.processSpecId);
    if (!scenario) return null;
    const data = scenarioData[scenario.key] || {};
    return (data.elements || []).find(x => x.id === selectedNodeMeta.elementId) || null;
  }, [selectedNodeMeta, selectedScenarios, scenarioData]);

  const selectedFlow = useMemo(() => {
    if (!selectedEdgeId.startsWith("flow::")) return null;
    const rawId = selectedEdgeId.replace("flow::", "");
    for (const scenario of selectedScenarios) {
      const data = scenarioData[scenario.key] || {};
      const found = (data.flows || []).find(x => x.id === rawId);
      if (found) return found;
    }
    return null;
  }, [selectedEdgeId, selectedScenarios, scenarioData]);

  const selectedDependency = useMemo(() => {
    if (!selectedEdgeId.startsWith("dep::")) return null;
    const rawId = selectedEdgeId.replace("dep::", "");
    return interDeps.find(x => x.id === rawId) || null;
  }, [selectedEdgeId, interDeps]);

  async function saveLayout() {
    try {
      setError("");
      setSaved("");

      const updates = nodes
        .filter(n => n.id.startsWith("element::"))
        .map(n => {
          const parts = n.id.split("::");
          return api.updateProcessElement(parts[2], {
            x: n.position.x,
            y: n.position.y,
          });
        });

      await Promise.all(updates);
      setSaved("Layout saved.");
    } catch (err) {
      setError(err?.message || JSON.stringify(err));
    }
  }

  function clearSelection() {
    setSelectedNodeId("");
    setSelectedEdgeId("");
  }

  return (
    <>
      <div className="panel">
        <div className="header-line">
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 4 }}>Cross-Process Diagram</h2>
            <div className="muted">Add 1..n Service / Aim / Sub-aim scenarios and compare their orchestration diagrams together.</div>
          </div>
          <div className="row">
            <button className="btn secondary" onClick={clearSelection}>Clear selection</button>
            <button className="btn" onClick={saveLayout} disabled={!selectedScenarios.length}>Save layout</button>
          </div>
        </div>

        <div className="split">
          <div className="field">
            <label>Service</label>
            <select
              value={selectedServiceId}
              onChange={e => setSelectedServiceId(e.target.value)}
            >
              <option value="">Select Service</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.type})
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Aim</label>
            <select
              value={selectedAimId}
              onChange={e => {
                setSelectedAimId(e.target.value);
                setSelectedSubAimId("");
              }}
            >
              <option value="">Select Aim</option>
              {orderAims.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name || a.code}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Sub-aim</label>
            <select
              value={selectedSubAimId}
              onChange={e => setSelectedSubAimId(e.target.value)}
              disabled={!selectedAimId}
            >
              <option value="">Select Sub-aim</option>
              {availableSubAims.map(sa => (
                <option key={sa.id} value={sa.id}>
                  {sa.name || sa.code}
                </option>
              ))}
            </select>
          </div>

          <div className="field" style={{ alignSelf: "end" }}>
            <button className="btn" onClick={addScenario}>Add</button>
          </div>
        </div>

        {!!selectedScenarios.length && (
          <div className="row" style={{ marginTop: 10, flexWrap: "wrap" }}>
            {selectedScenarios.map(s => (
              <span key={s.key} className="pill">
                {buildScenarioTitle(s)}{" "}
                <button
                  type="button"
                  onClick={() => removeScenario(s.key)}
                  style={{ border: "none", background: "transparent", cursor: "pointer" }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {saved && <div className="muted" style={{ marginTop: 10 }}>{saved}</div>}
        {error && <div className="error">{error}</div>}
      </div>

      <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ height: "72vh", width: "100%" }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={(_, node) => {
              setSelectedNodeId(node.id);
              setSelectedEdgeId("");
            }}
            onEdgeClick={(_, edge) => {
              setSelectedEdgeId(edge.id);
              setSelectedNodeId("");
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
          <h3 style={{ marginTop: 0 }}>Selected Node</h3>
          {selectedScenario ? (
            <div className="item-card">
              <div><strong>{buildScenarioTitle(selectedScenario)}</strong></div>
              <div className="muted" style={{ marginTop: 6 }}>
                Process Spec: {scenarioData[selectedScenario.key]?.process?.name || "No Process Spec"}
              </div>
              <div className="muted" style={{ marginTop: 6 }}>
                {scenarioData[selectedScenario.key]?.process
                  ? `${scenarioData[selectedScenario.key].process.code} • v${scenarioData[selectedScenario.key].process.version} • ${scenarioData[selectedScenario.key].process.status}`
                  : "Create a Process Spec to render this scenario"}
              </div>
            </div>
          ) : selectedElement ? (
            <>
              <div className="item-card">
                <div><strong>{selectedElement.name_override || selectedElement.element_key}</strong></div>
                <div className="muted" style={{ marginTop: 6 }}>Type: {selectedElement.element_type}</div>
                <div className="muted" style={{ marginTop: 6 }}>Key: {selectedElement.element_key}</div>
                <div className="muted" style={{ marginTop: 6 }}>X / Y: {selectedElement.x ?? "—"} / {selectedElement.y ?? "—"}</div>
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
            <div className="muted">Click a scenario title or node to see details.</div>
          )}
        </div>

        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Selected Edge</h3>
          {selectedDependency ? (
            <div className="item-card">
              <div><strong>{selectedDependency.label || selectedDependency.dependency_type}</strong></div>
              <div className="muted" style={{ marginTop: 6 }}>Inter-process dependency</div>
              <div className="muted" style={{ marginTop: 6 }}>
                {elementLabel(selectedDependency.source_process_spec_id, selectedDependency.source_element_id)}
                {" → "}
                {elementLabel(selectedDependency.target_process_spec_id, selectedDependency.target_element_id)}
              </div>
              <div className="muted" style={{ marginTop: 6 }}>Type: {selectedDependency.dependency_type}</div>
              <div className="muted" style={{ marginTop: 6 }}>Condition: {selectedDependency.condition_expression || "—"}</div>
            </div>
          ) : selectedFlow ? (
            <div className="item-card">
              <div><strong>{selectedFlow.label || selectedFlow.flow_type}</strong></div>
              <div className="muted" style={{ marginTop: 6 }}>Intra-process flow</div>
              <div className="muted" style={{ marginTop: 6 }}>Type: {selectedFlow.flow_type}</div>
              <div className="muted" style={{ marginTop: 6 }}>Default: {selectedFlow.is_default ? "Yes" : "No"}</div>
              <div className="muted" style={{ marginTop: 6 }}>Condition: {selectedFlow.condition_expression || "—"}</div>
            </div>
          ) : (
            <div className="muted">Click an edge to see flow or dependency details.</div>
          )}
        </div>
      </div>
    </>
  );
}
