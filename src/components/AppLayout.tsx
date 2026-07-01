import { FlaskConical, Home, LogOut, Plus, Table2 } from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function AppLayout() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isField = location.pathname.startsWith("/field");

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <div className="brand-mark">CM</div>
          <div>
            <h1>Connection Master</h1>
            <span>{user?.email}</span>
          </div>
        </div>
        <nav className="nav-tabs">
          <NavLink to="/">
            <Home size={16} />
            Scope
          </NavLink>
          <NavLink to="/lab/assemblies">
            <FlaskConical size={16} />
            Lab
          </NavLink>
          <NavLink to="/field/rig-ups">
            <Table2 size={16} />
            Field
          </NavLink>
          <button type="button" onClick={() => navigate(isField ? "/field/builder" : "/lab/builder")}>
            <Plus size={16} />
            {isField ? "New Field" : "New Lab"}
          </button>
          <button type="button" onClick={() => void signOut()}>
            <LogOut size={16} />
            Sign out
          </button>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
