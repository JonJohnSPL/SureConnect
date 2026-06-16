import { LogOut, Plus, Table2 } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function AppLayout() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

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
          <NavLink to="/assemblies">
            <Table2 size={16} />
            Assemblies
          </NavLink>
          <button type="button" onClick={() => navigate("/builder")}>
            <Plus size={16} />
            New
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

