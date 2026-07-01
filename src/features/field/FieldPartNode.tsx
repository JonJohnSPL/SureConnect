import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { Part, Port, ValidationStatus } from "../../engine";
import type { FieldRigUpNode } from "../../field/types";
import { PartVisual } from "../canvas/PartVisual";

export interface FieldPartNodeData extends Record<string, unknown> {
  part: Part;
  rigNode: FieldRigUpNode;
  status: ValidationStatus | "draft";
}

type FieldFlowNode = Node<FieldPartNodeData, "fieldPart">;

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

export function FieldPartNode({ data, selected }: NodeProps<FieldFlowNode>) {
  const { part, rigNode, status } = data;
  const isEndpoint = rigNode.kind === "endpoint";

  return (
    <div className={`part-node field-node ${isEndpoint ? `endpoint endpoint-${rigNode.endpoint}` : ""} ${selected ? "selected" : ""} ${status}`}>
      <div className="node-head">
        <div className="node-icon">
          <PartVisual part={part} variant="micro" />
        </div>
        <div>
          <strong>{rigNode.label}</strong>
          <span>{part.partNumber}</span>
        </div>
      </div>
      <div className="node-body">
        <PartVisual part={part} variant="node" />
        <div className="node-meta">
          <span>{part.category.replace(/^Field\s+/, "")}</span>
          <span>{part.ports.map((port) => port.label).join(" / ")}</span>
          {rigNode.lengthFt ? <span>{rigNode.lengthFt} ft</span> : null}
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
