import type { AssemblyIssue, BomItem, BuildStep } from "../../engine";

export function FieldPanels({ issues, bom, steps }: { issues: AssemblyIssue[]; bom: BomItem[]; steps: BuildStep[] }) {
  return (
    <>
      <section className="inspector-section">
        <h2>Field Validation</h2>
        {issues.length ? (
          <ul className="issue-list">
            {issues.map((issue, index) => (
              <li className={issue.status} key={`${issue.title}-${index}`}>
                <strong>{issue.title}</strong>
                <span>{issue.message}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state compact">No automated field validation issues.</div>
        )}
      </section>
      <section className="inspector-section">
        <h2>Field BOM</h2>
        {bom.length ? (
          <table className="mini-table">
            <thead>
              <tr>
                <th>Qty</th>
                <th>Part</th>
              </tr>
            </thead>
            <tbody>
              {bom.map((item) => (
                <tr key={item.partId}>
                  <td>
                    {item.qty}
                    {item.lengthFt ? <span>{item.lengthFt} ft</span> : null}
                  </td>
                  <td>
                    <strong>{item.name}</strong>
                    <span>{item.partNumber}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state compact">No field parts on canvas.</div>
        )}
      </section>
      <section className="inspector-section">
        <h2>Rig-Up Steps</h2>
        {steps.length ? (
          <ol className="step-list">
            {steps.map((step) => (
              <li key={step.index}>
                <strong>
                  {step.index}. {step.title}
                </strong>
                <span>{step.detail}</span>
              </li>
            ))}
          </ol>
        ) : (
          <div className="empty-state compact">Connect field endpoints and parts to generate steps.</div>
        )}
      </section>
    </>
  );
}
