import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { AssemblyNode, Part, Port, ValidationStatus } from "../../engine";

export interface PartNodeData extends Record<string, unknown> {
  part: Part;
  assemblyNode: AssemblyNode;
  status: ValidationStatus | "draft";
}

type PartFlowNode = Node<PartNodeData, "part">;

const positionBySide = {
  left: Position.Left,
  right: Position.Right,
  top: Position.Top,
  bottom: Position.Bottom,
};

function handleStyle(port: Port, ports: Port[]) {
  const sidePorts = ports.filter((item) => item.side === port.side);
  const index = sidePorts.findIndex((item) => item.id === port.id);
  const offset = `${((index + 1) / (sidePorts.length + 1)) * 100}%`;
  if (port.side === "left" || port.side === "right") return { top: offset };
  return { left: offset };
}

function PartVisual({ icon }: { icon: string }) {
  return (
    <svg className="part-visual" viewBox="0 0 160 80" role="img" aria-label={icon}>
      <path className="visual-line" d="M10 42 H48" />
      <path className="visual-line" d="M112 42 H150" />
      <rect className="visual-body" x="48" y="24" width="64" height="36" rx="6" />
      <text x="80" y="47" textAnchor="middle">
        {icon}
      </text>
    </svg>
  );
}

export function PartNode({ data, selected }: NodeProps<PartFlowNode>) {
  const { part, assemblyNode, status } = data;

  return (
    <div className={`part-node ${selected ? "selected" : ""} ${status}`}>
      <div className="node-head">
        <div className="node-icon">
          <PartVisual icon={part.icon} />
        </div>
        <div>
          <strong>{assemblyNode.label}</strong>
          <span>{part.partNumber}</span>
        </div>
      </div>
      <div className="node-body">
        <PartVisual icon={part.icon} />
        <div className="node-meta">
          <span>{part.material}</span>
          <span>{part.ports.length} ports</span>
          {assemblyNode.lengthFt ? <span>{assemblyNode.lengthFt} ft</span> : null}
        </div>
      </div>
      {part.ports.map((port) => (
        <div className="port-wrap" key={port.id}>
          <Handle
            className="port-handle"
            id={port.id}
            position={positionBySide[port.side]}
            style={handleStyle(port, part.ports)}
            type="source"
          />
          <Handle
            className="port-handle target"
            id={port.id}
            position={positionBySide[port.side]}
            style={handleStyle(port, part.ports)}
            type="target"
          />
        </div>
      ))}
    </div>
  );
}

