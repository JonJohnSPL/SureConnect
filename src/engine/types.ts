export type ValidationStatus = "valid" | "warn" | "invalid";
export type PortSide = "left" | "right" | "top" | "bottom";

export interface Port {
  id: string;
  label: string;
  type: string;
  size?: string | null;
  gender: string;
  thread?: string | null;
  ferrule?: boolean | null;
  sealant?: "required" | "forbidden" | "optional" | string | null;
  side: PortSide;
}

export interface Part {
  id: string;
  slug: string;
  category: string;
  icon: string;
  name: string;
  manufacturer: string;
  partNumber: string;
  material: string;
  maxPressure: number;
  gases: string[];
  defaultLengthFt?: number | null;
  notes?: string | null;
  approved?: boolean;
  ports: Port[];
}

export interface AssemblyNode {
  id: string;
  partId: string;
  label: string;
  x: number;
  y: number;
  lengthFt?: number | null;
  tag?: string;
  notes?: string;
}

export interface PortEndpoint {
  nodeId: string;
  portId: string;
}

export interface AssemblyConnection {
  id: string;
  from: PortEndpoint;
  to: PortEndpoint;
}

export interface AssemblyGraph {
  nodes: AssemblyNode[];
  connections: AssemblyConnection[];
}

export interface AssemblyContext {
  gas: string;
  service: string;
  pressure: number;
}

export interface ValidationResult {
  status: ValidationStatus;
  title: string;
  messages: string[];
}

export interface AssemblyIssue {
  status: Exclude<ValidationStatus, "valid">;
  title: string;
  message: string;
}

export interface BomItem {
  partId: string;
  name: string;
  partNumber: string;
  manufacturer: string;
  qty: number;
  lengthFt: number;
  isTubing: boolean;
}

export interface BuildStep {
  index: number;
  title: string;
  detail: string;
  status: ValidationStatus;
  statusTitle: string;
}

