import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { Part } from "../../engine";
import { PartVisual } from "../canvas/PartVisual";

export function Toolbox({ parts }: { parts: Part[] }) {
  const [query, setQuery] = useState("");
  const grouped = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = parts.filter((part) => {
      if (!needle) return true;
      return [part.name, part.partNumber, part.category, part.manufacturer, part.notes || ""]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
    return filtered.reduce<Record<string, Part[]>>((acc, part) => {
      acc[part.category] ||= [];
      acc[part.category].push(part);
      return acc;
    }, {});
  }, [parts, query]);

  return (
    <aside className="toolbox-panel">
      <div className="panel-header">
        <h2>Parts</h2>
        <label className="search-field">
          <Search size={16} />
          <input value={query} placeholder="Search library" onChange={(event) => setQuery(event.target.value)} />
        </label>
      </div>
      <div className="toolbox-list">
        {Object.entries(grouped).map(([category, items]) => (
          <section key={category}>
            <h3>{category}</h3>
            {items.map((part) => (
              <article
                className="part-card"
                draggable
                key={part.id}
                onDragStart={(event) => {
                  event.dataTransfer.setData("application/connection-master-part-id", part.id);
                  event.dataTransfer.effectAllowed = "copy";
                }}
              >
                <div className="part-card-icon">
                  <PartVisual part={part} variant="toolbox" />
                </div>
                <div>
                  <strong>{part.name}</strong>
                  <span>{part.partNumber}</span>
                  <p>{part.ports.map((port) => port.label).join(" / ")}</p>
                </div>
              </article>
            ))}
          </section>
        ))}
      </div>
    </aside>
  );
}
