import React from "react";
import { NavLink } from "react-router-dom";

export default function Layout({ children }) {
  const links = [
    ["/", "Dashboard"],
    ["/services", "Services"],
    ["/order-aims", "Order Aims"],
    ["/attributes", "Attributes"],
    ["/attribute-involvement", "Attribute Involvement"],
    ["/relations", "Relations"],
    ["/diagram", "Diagram"]
  ];
  return (
    <div className="app">
      <aside className="sidebar">
        <h2 style={{marginTop:0}}>OSS Catalog</h2>
        <div className="muted" style={{color:"#cbd5e1",marginBottom:16}}>Render frontend starter</div>
        {links.map(([to,label]) => (
          <NavLink key={to} to={to} end={to === "/"} className={({isActive}) => `menu-link${isActive ? " active" : ""}`}>{label}</NavLink>
        ))}
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
