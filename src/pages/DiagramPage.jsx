import React, { useEffect, useState } from "react";
import { api } from "../api/client";

export default function DiagramPage() {
  const [layout, setLayout] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.listDiagramLayout().then(setLayout).catch(err => setError(err.message));
  }, []);

  return (
    <>
      <div className="panel">
        <h2 style={{marginTop:0}}>Diagram</h2>
        <div className="muted">This starter keeps diagram as a placeholder. Next step: React Flow.</div>
      </div>
      <div className="panel">
        <h3 style={{marginTop:0}}>Diagram Layout Data</h3>
        {error ? <div className="error">{error}</div> : <pre>{JSON.stringify(layout, null, 2)}</pre>}
      </div>
    </>
  );
}
