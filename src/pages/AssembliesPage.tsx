import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit3, Plus, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { deleteAssembly, fetchAssemblySummaries } from "../data/assemblies";
import { isSupabaseConfigured } from "../data/supabase";

export function AssembliesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const assembliesQuery = useQuery({
    queryKey: ["assemblies"],
    queryFn: fetchAssemblySummaries,
    enabled: isSupabaseConfigured,
  });
  const deleteMutation = useMutation({
    mutationFn: deleteAssembly,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assemblies"] }),
  });

  return (
    <main className="page assemblies-page">
      <div className="page-toolbar">
        <div>
          <h2>Assemblies</h2>
          <p>Drafts and validated layouts saved to Supabase.</p>
        </div>
        <button className="primary" type="button" onClick={() => navigate("/builder")}>
          <Plus size={16} />
          New Assembly
        </button>
      </div>

      {!isSupabaseConfigured ? <div className="notice error">Set Supabase env values before loading assemblies.</div> : null}
      {assembliesQuery.isLoading ? <div className="empty-state">Loading assemblies...</div> : null}
      {assembliesQuery.error ? <div className="notice error">{assembliesQuery.error.message}</div> : null}
      {assembliesQuery.data?.length === 0 ? <div className="empty-state">No assemblies saved yet.</div> : null}

      <div className="assembly-list">
        {assembliesQuery.data?.map((assembly) => (
          <article className="assembly-row" key={assembly.id}>
            <div>
              <h3>{assembly.name}</h3>
              <p>
                {assembly.gas} / {assembly.service} / {assembly.pressure} psig
              </p>
              <span className="status-pill status-draft">{assembly.status}</span>
            </div>
            <div className="row-actions">
              <Link className="icon-button" to={`/builder/${assembly.id}`} title="Open assembly">
                <Edit3 size={16} />
              </Link>
              <button
                className="icon-button danger"
                type="button"
                title="Delete assembly"
                onClick={() => deleteMutation.mutate(assembly.id)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}

