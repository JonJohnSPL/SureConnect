import { Printer, X } from "lucide-react";
import type {
  AssemblyContext,
  AssemblyGraph,
  AssemblyIssue,
  BomItem,
  BuildStep,
} from "../../engine";

interface BuildSheetModalProps {
  open: boolean;
  onClose(): void;
  assemblyName: string;
  context: AssemblyContext;
  graph: AssemblyGraph;
  issues: AssemblyIssue[];
  bom: BomItem[];
  steps: BuildStep[];
}

const physicalChecks = [
  "Verify all part numbers against approved SPL part library before assembly.",
  "Confirm gas cylinder/source label and regulator CGA connection.",
  "Inspect tubing cuts: square, deburred, clean, and correct OD.",
  "Verify ferrule orientation and tube insertion depth for compression fittings.",
  "Apply approved NPT sealant only where required. Keep sealant out of flow path.",
  "Pressurize slowly and leak-check every connection.",
  "Record final pressure and leak-check result.",
  "Attach final assembly photo to controlled record.",
];

function reportStatus(issues: AssemblyIssue[]) {
  if (issues.some((issue) => issue.status === "invalid")) return "BLOCKED - DO NOT BUILD UNTIL RESOLVED";
  if (issues.some((issue) => issue.status === "warn")) return "REVIEW REQUIRED";
  return "VALID DRAFT - VERIFY PHYSICALLY BEFORE USE";
}

export function BuildSheetModal({
  open,
  onClose,
  assemblyName,
  context,
  graph,
  issues,
  bom,
  steps,
}: BuildSheetModalProps) {
  if (!open) return null;

  const status = reportStatus(issues);
  const generatedAt = new Date().toLocaleString();

  return (
    <div className="report-backdrop" role="presentation">
      <div className="report-modal" role="dialog" aria-modal="true" aria-labelledby="build-sheet-title">
        <div className="report-modal-head">
          <strong>Connection Master Build Sheet</strong>
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
          <h2 id="build-sheet-title">Connection Master Build Sheet</h2>
          <p>
            <strong>Assembly:</strong> {assemblyName}
          </p>
          <p>
            <strong>Status:</strong> {status}
          </p>
          <p>
            <strong>Generated:</strong> {generatedAt}
            <br />
            <strong>Gas:</strong> {context.gas} <strong>Service:</strong> {context.service}{" "}
            <strong>Pressure:</strong> {context.pressure} psig
          </p>

          <h3>Assembly Summary</h3>
          <table>
            <tbody>
              <tr>
                <th>Total Parts</th>
                <td>{graph.nodes.length}</td>
              </tr>
              <tr>
                <th>Total Connections</th>
                <td>{graph.connections.length}</td>
              </tr>
              <tr>
                <th>Validation Issues</th>
                <td>{issues.length}</td>
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
                    <td>
                      {item.lengthFt
                        ? "Tubing length from drawing. Verify actual routing length before cutting."
                        : ""}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>No parts in this assembly.</td>
                </tr>
              )}
            </tbody>
          </table>

          <h3>Connection-by-Connection Build Steps</h3>
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
                  <td colSpan={4}>No connections in this assembly.</td>
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
            <p>No automated validation issues detected.</p>
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
                <th>Built By</th>
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
              This prototype assists assembly planning only. Final use requires approved procedures, vendor
              specifications, physical inspection, and leak testing.
            </em>
          </p>
        </div>
      </div>
    </div>
  );
}

