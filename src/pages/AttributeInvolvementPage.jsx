import React, { useEffect, useState } from "react";
import { api } from "../api/client";

export default function AttributeInvolvementPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.listAttributeInvolvement().then(setItems).catch(err => setError(err.message));
  }, []);

  return (
    <>
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Attribute Involvement</h2>
        <div className="muted">Simple view for now. Next step: full editor with default values.</div>
      </div>
      <div className="panel">
        {error ? <div className="error">{error}</div> : <pre>{JSON.stringify(items, null, 2)}</pre>}
      </div>
    </>
  );
}
