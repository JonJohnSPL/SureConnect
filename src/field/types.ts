import type { AssemblyIssue, BomItem, BuildStep, PortEndpoint, ValidationStatus } from "../engine";

export type FieldEndpointKind = "customer" | "truck";

export interface FieldCustomerConfig {
  endpointType: "Meter" | "Connection";
  meterType: string;
  size: string;
  rating: string;
}

export interface FieldTruckConfig {
  type: string;
  connection: string;
}

export interface FieldRigUpContext {
  customer: FieldCustomerConfig;
  truck: FieldTruckConfig;
  pressure: number;
  notes: string;
}

export interface FieldRigUpNode {
  id: string;
  kind: "part" | "endpoint";
  endpoint?: FieldEndpointKind;
  partId?: string;
  label: string;
  x: number;
  y: number;
  lengthFt?: number | null;
  tag?: string;
  notes?: string;
}

export interface FieldRigUpConnection {
  id: string;
  from: PortEndpoint;
  to: PortEndpoint;
}

export interface FieldRigUpGraph {
  nodes: FieldRigUpNode[];
  connections: FieldRigUpConnection[];
}

export interface FieldRigUpSummary {
  id: string;
  name: string;
  status: string;
  customerLabel: string;
  truckLabel: string;
  updatedAt: string;
}

export interface StoredFieldRigUp {
  id: string;
  name: string;
  status: string;
  context: FieldRigUpContext;
  graph: FieldRigUpGraph;
}

export interface FieldConnectionValidation {
  status: ValidationStatus;
  title: string;
  messages: string[];
}

export type FieldIssue = AssemblyIssue;
export type FieldBomItem = BomItem;
export type FieldBuildStep = BuildStep;
