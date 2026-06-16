import { Trash2 } from "lucide-react";
import { validateConnection, type AssemblyContext, type AssemblyGraph, type AssemblyNode, type Part } from "../../engine";

export type BuilderSelection = { type: "node" | "edge"; id: string } | null;

interface InspectorProps {
  context: AssemblyContext;
  graph: AssemblyGraph;
  parts: Part[];
  selection: BuilderSelection;
  onDelete(): void;
  onUpdateNode(id: string, patch: Partial<AssemblyNode>): void;
}

export function Inspector({ context, graph, parts, selection, onDelete, onUpdateNode }: InspectorProps) {
  if (!selection) {
    return (
      <section className="inspector-section">
        <h2>Inspector</h2>
        <div className="empty-state compact">Select a part or connection.</div>
      </section>
    );
  }

  if (selection.type === "node") {
    const node = graph.nodes.find((item) => item.id === selection.id);
    const part = parts.find((item) => item.id === node?.partId);
    if (!node || !part) return null;

    return (
      <section className="inspector-section">
        <div className="panel-title-row">
          <h2>Part</h2>
          <button className="icon-button danger" type="button" title="Delete part" onClick={onDelete}>
            <Trash2 size={16} />
          </button>
        </div>
        <label>
          Label
          <input value={node.label} onChange={(event) => onUpdateNode(node.id, { label: event.target.value })} />
        </label>
        {part.category === "Tubing" ? (
          <label>
            Tubing Length, ft
            <input
              min={0}
              step={0.1}
              type="number"
              value={node.lengthFt ?? 0}
              onChange={(event) => onUpdateNode(node.id, { lengthFt: Number(event.target.value || 0) })}
            />
          </label>
        ) : null}
        <label>
          Asset / Tag
          <input value={node.tag || ""} onChange={(event) => onUpdateNode(node.id, { tag: event.target.value })} />
        </label>
        <label>
          Notes
          <textarea value={node.notes || ""} onChange={(event) => onUpdateNode(node.id, { notes: event.target.value })} />
        </label>
        <dl className="definition-list">
          <dt>Part</dt>
          <dd>{part.name}</dd>
          <dt>Material</dt>
          <dd>{part.material}</dd>
          <dt>Rating</dt>
          <dd>{part.maxPressure} psig</dd>
        </dl>
      </section>
    );
  }

  const edge = graph.connections.find((item) => item.id === selection.id);
  if (!edge) return null;
  const validation = validateConnection(graph, parts, context, edge.from, edge.to);

  return (
    <section className="inspector-section">
      <div className="panel-title-row">
        <h2>Connection</h2>
        <button className="icon-button danger" type="button" title="Delete connection" onClick={onDelete}>
          <Trash2 size={16} />
        </button>
      </div>
      <span className={`status-pill status-${validation.status}`}>{validation.title}</span>
      <ul className="plain-list">
        {validation.messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </section>
  );
}

