import React, { useEffect, useState } from "react";
import { api, API_BASE } from "../api/client";

export default function DashboardPage() {
  const [status, setStatus] = useState("Loading...");
  const [error, setError] = useState("");
  useEffect(() => {
    api.health().then(data => setStatus(JSON.stringify(data, null, 2))).catch(err => setError(err.message));
  }, []);
  return (
    <>
      <div className="panel">
        <h2 style={{marginTop:0}}>Dashboard</h2>
        <div className="muted">API Base: {API_BASE}</div>
      </div>
      <div className="panel">
        <h3 style={{marginTop:0}}>Backend health</h3>
        {error ? <div className="error">{error}</div> : <pre>{status}</pre>}
      </div>
    </>
  );
}
