import { Printer, X } from "lucide-react";
import type { AssemblyIssue, BomItem, BuildStep } from "../../engine";
import type { FieldRigUpContext, FieldRigUpGraph } from "../../field/types";

interface FieldShopTicketModalProps {
  open: boolean;
  onClose(): void;
  rigUpName: string;
  context: FieldRigUpContext;
  graph: FieldRigUpGraph;
  issues: AssemblyIssue[];
  bom: BomItem[];
  steps: BuildStep[];
}

const physicalChecks = [
  "Verify every field part against the approved field catalog and current inspection status.",
  "Confirm customer flange, gasket, bolt kit, and connection rating before rig-up.",
  "Confirm prover truck connection and hose/adapter compatibility before pressure is applied.",
  "Verify MAOP for the complete rig-up is not exceeded by planned operating pressure.",
  "Inspect hoses for damage, current certification, correct size, and proper restraint.",
  "Confirm valves are oriented correctly and bleed points are controlled.",
  "Pressurize slowly and leak-check all connections before proving work starts.",
  "Attach final rig-up photo and customer/truck signoff to the controlled record.",
];

function ticketStatus(issues: AssemblyIssue[]) {
  if (issues.some((issue) => issue.status === "invalid")) return "BLOCKED - DO NOT RIG UP UNTIL RESOLVED";
  if (issues.some((issue) => issue.status === "warn")) return "REVIEW REQUIRED - VERIFY FIELD SPECS";
  return "VALID DRAFT - VERIFY PHYSICALLY BEFORE USE";
}

export function FieldShopTicketModal({
  open,
  onClose,
  rigUpName,
  context,
  graph,
  issues,
  bom,
  steps,
}: FieldShopTicketModalProps) {
  if (!open) return null;

  const status = ticketStatus(issues);
  const generatedAt = new Date().toLocaleString();

  return (
    <div className="report-backdrop" role="presentation">
      <div className="report-modal" role="dialog" aria-modal="true" aria-labelledby="field-ticket-title">
        <div className="report-modal-head">
          <strong>Field Rig-Up Shop Ticket</strong>
          <div className="report-actions">
            <button type="button" onClick={() => window.print()}>
              <Printer size={16} />
              Print / Save PDF
            </button>
            <button type="button" onClick={onClose}>
              <X size={16} />
              Close
            </button>
          </div>
        </div>
        <div className="report-body">
          <h2 id="field-ticket-title">Field Rig-Up Shop Ticket</h2>
          <p>
            <strong>Rig-Up:</strong> {rigUpName}
          </p>
          <p>
            <strong>Status:</strong> {status}
          </p>
          <p>
            <strong>Generated:</strong> {generatedAt}
            <br />
            <strong>Operating Pressure:</strong> {context.pressure} psig
          </p>

          <h3>Field Endpoints</h3>
          <table>
            <tbody>
              <tr>
                <th>Customer</th>
                <td>
                  {context.customer.endpointType}: {context.customer.meterType}, {context.customer.size} {context.customer.rating}
                </td>
              </tr>
              <tr>
                <th>Truck</th>
                <td>
                  {context.truck.type}, {context.truck.connection}
                </td>
              </tr>
              <tr>
                <th>Canvas</th>
                <td>
                  {graph.nodes.length} nodes / {graph.connections.length} connections
                </td>
              </tr>
            </tbody>
          </table>

          <h3>Bill of Materials</h3>
          <table>
            <thead>
              <tr>
                <th>Qty</th>
                <th>Part</th>
                <th>Part #</th>
                <th>Manufacturer</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {bom.length ? (
                bom.map((item) => (
                  <tr key={item.partId}>
                    <td>
                      {item.qty}
                      {item.lengthFt ? (
                        <>
                          <br />
                          {item.lengthFt} ft total
                        </>
                      ) : null}
                    </td>
                    <td>{item.name}</td>
                    <td>
                      <code>{item.partNumber}</code>
                    </td>
                    <td>{item.manufacturer}</td>
                    <td>Planning-aid catalog entry. Verify approved field specs before use.</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>No field parts in this rig-up.</td>
                </tr>
              )}
            </tbody>
          </table>

          <h3>Connection-by-Connection Rig-Up Steps</h3>
          <table>
            <thead>
              <tr>
                <th>Step</th>
                <th>Connection</th>
                <th>Verification</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {steps.length ? (
                steps.map((step) => (
                  <tr key={step.index}>
                    <td>{step.index}</td>
                    <td>{step.title}</td>
                    <td>{step.detail}</td>
                    <td>{step.statusTitle}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4}>No field connections in this rig-up.</td>
                </tr>
              )}
            </tbody>
          </table>

          <h3>Validation Warnings / Blocks</h3>
          {issues.length ? (
            <table>
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Issue</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((issue, index) => (
                  <tr key={`${issue.title}-${index}`}>
                    <td>{issue.status.toUpperCase()}</td>
                    <td>{issue.title}</td>
                    <td>{issue.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No automated field validation issues detected.</p>
          )}

          <h3>Required Physical Checks</h3>
          <table>
            <tbody>
              {physicalChecks.map((check) => (
                <tr key={check}>
                  <td className="check-cell">[ ]</td>
                  <td>{check}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>Signoff</h3>
          <table>
            <tbody>
              <tr>
                <th>Rigged By</th>
                <td className="signoff-cell" />
                <th>Date</th>
                <td className="signoff-date-cell" />
              </tr>
              <tr>
                <th>Leak Checked By</th>
                <td className="signoff-cell" />
                <th>Date</th>
                <td className="signoff-date-cell" />
              </tr>
              <tr>
                <th>Reviewed By</th>
                <td className="signoff-cell" />
                <th>Date</th>
                <td className="signoff-date-cell" />
              </tr>
            </tbody>
          </table>

          <p>
            <em>
              Field v1 is a planning and ticketing workflow. Final use requires approved procedures, vendor
              specifications, physical inspection, leak testing, and job-site authorization.
            </em>
          </p>
        </div>
      </div>
    </div>
  );
}
