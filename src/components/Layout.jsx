import React from "react";
import { NavLink } from "react-router-dom";

export default function Layout({ children }) {
  const groups = [
    { title: "Services", items: [
      ["/services", "Manage Service"],
      ["/decomposition", "Manage Decomposition"],
    ]},
    { title: "Attributes", items: [
      ["/attributes", "Manage Attributes"],
      ["/involvements", "Manage Involvements"],
      ["/attribute-propagation", "Attribute Propagation"],
    ]},
    { title: "Orchestrator", items: [
      ["/orchestrator/task-specs", "Task Specs"],
      ["/orchestrator/process-specs", "Process Specs"],
      ["/orchestrator/process-elements", "Process Elements"],
      ["/orchestrator/process-flows", "Process Flows"],
      ["/orchestrator/process-diagram", "Process Diagram"],
      ["/orchestrator/inter-process-dependencies", "Inter-Process Dependencies"],
    ]},
    { title: "General", items: [
      ["/order-aims", "Order Aims"],
      ["/", "Dashboard"],
      ["/diagram", "Diagram"],
    ]}
  ];

  return (
    <div className="app">
      <aside className="sidebar">
        <h2 style={{ marginTop: 0 }}>OSS Catalog</h2>
        <div className="muted" style={{ color: "#cbd5e1", marginBottom: 16 }}>Web app v3</div>
        {groups.map(group => (
          <div key={group.title}>
            <div className="group-title">{group.title}</div>
            {group.items.map(([to,label]) => (
              <NavLink key={to} to={to} end={to === "/"} className={({isActive}) => `menu-link${isActive ? " active" : ""}`}>
                {label}
              </NavLink>
            ))}
          </div>
        ))}
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
