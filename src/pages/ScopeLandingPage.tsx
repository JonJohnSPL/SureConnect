import { FlaskConical, Truck } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function ScopeLandingPage() {
  const navigate = useNavigate();

  return (
    <main className="page scope-page">
      <div className="page-toolbar">
        <div>
          <h2>Choose Scope</h2>
          <p>Select the workspace for the connection you are planning.</p>
        </div>
      </div>
      <div className="scope-grid">
        <button className="scope-option" type="button" onClick={() => navigate("/lab/assemblies")}>
          <span className="scope-icon">
            <FlaskConical size={28} />
          </span>
          <strong>Lab</strong>
          <span>Gas-line assemblies, validation, BOMs, and lab build sheets.</span>
        </button>
        <button className="scope-option" type="button" onClick={() => navigate("/field/rig-ups")}>
          <span className="scope-icon">
            <Truck size={28} />
          </span>
          <strong>Field</strong>
          <span>Customer meter-to-truck rig-ups, field parts, and shop tickets.</span>
        </button>
      </div>
    </main>
  );
}
