import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit3, Plus, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { deleteFieldRigUp, fetchFieldRigUpSummaries } from "../data/fieldRigUps";
import { isSupabaseConfigured } from "../data/supabase";

export function FieldRigUpsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const rigUpsQuery = useQuery({
    queryKey: ["field-rigups"],
    queryFn: fetchFieldRigUpSummaries,
    enabled: isSupabaseConfigured,
  });
  const deleteMutation = useMutation({
    mutationFn: deleteFieldRigUp,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["field-rigups"] }),
  });

  return (
    <main className="page assemblies-page">
      <div className="page-toolbar">
        <div>
          <h2>Field Rig-Ups</h2>
          <p>Saved customer-to-truck field layouts and shop tickets.</p>
        </div>
        <button className="primary" type="button" onClick={() => navigate("/field/builder")}>
          <Plus size={16} />
          New Field Rig-Up
        </button>
      </div>

      {!isSupabaseConfigured ? <div className="notice error">Set Supabase env values before loading field rig-ups.</div> : null}
      {rigUpsQuery.isLoading ? <div className="empty-state">Loading field rig-ups...</div> : null}
      {rigUpsQuery.error ? <div className="notice error">{rigUpsQuery.error.message}</div> : null}
      {rigUpsQuery.data?.length === 0 ? <div className="empty-state">No field rig-ups saved yet.</div> : null}

      <div className="assembly-list">
        {rigUpsQuery.data?.map((rigUp) => (
          <article className="assembly-row" key={rigUp.id}>
            <div>
              <h3>{rigUp.name}</h3>
              <p>
                {rigUp.customerLabel} / {rigUp.truckLabel}
              </p>
              <span className="status-pill status-draft">{rigUp.status}</span>
            </div>
            <div className="row-actions">
              <Link className="icon-button" to={`/field/builder/${rigUp.id}`} title="Open field rig-up">
                <Edit3 size={16} />
              </Link>
              <button
                className="icon-button danger"
                type="button"
                title="Delete field rig-up"
                onClick={() => deleteMutation.mutate(rigUp.id)}
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
