/**
 * Preview of collected Raw Records for a source after connector test/fetch.
 * Source moves to In use only after the risk manager approves the sample.
 * If the sample is irrelevant, user can reject and update the connector proposal.
 */
export default function RawRecordsPreview({
  status,
  records = [],
  testResult = null,
  definition = null,
  verification = null,
  error = null,
  sampleApproved = false,
  approving = false,
  onRefresh,
  onTest,
  onApproveSample,
  onRejectSample,
}) {
  if (status === "idle") return null;

  const testOk = !!(testResult?.ok || testResult?.status === "passed");
  const canApprove =
    !sampleApproved &&
    typeof onApproveSample === "function" &&
    records.length > 0 &&
    (testOk || !testResult);

  const attempts = Array.isArray(verification?.attempts) ? verification.attempts : [];

  return (
    <section className="sd-card surface op-card rr-preview fade" aria-live="polite">
      <div className="op-head">
        <div>
          <span className="eyebrow">Connectivity sample</span>
          <h2 className="sd-h2">Raw feed items (unfiltered)</h2>
          <p className="sd-muted op-intro">
            This sample checks that the connector can reach the feed and store items.
            It is <strong>not</strong> filtered by your include/exclude terms yet —
            those apply later when evidence is matched to risk cases. Approve if this
            is the right source and the feed works; reject if the feed itself is wrong.
          </p>
        </div>
        <div className="rr-preview__actions">
          {onTest && !sampleApproved && (
            <button className="btn btn--secondary" type="button" onClick={onTest} disabled={status === "loading" || approving}>
              {status === "loading" ? "Fetching…" : "Fetch again"}
            </button>
          )}
          {onRefresh && (
            <button className="btn btn--ghost" type="button" onClick={onRefresh} disabled={status === "loading" || approving}>
              Refresh
            </button>
          )}
        </div>
      </div>

      {definition && (
        <p className="rr-meta">
          Adapter: <strong>{definition.adapterType || "—"}</strong>
          {definition.config?.endpoint ? (
            <>
              {" · "}
              <a href={definition.config.endpoint} target="_blank" rel="noreferrer">
                verified endpoint
              </a>
            </>
          ) : null}
          {definition.status ? <> · Status: <strong>{definition.status}</strong></> : null}
        </p>
      )}

      {attempts.length > 0 && (
        <details className="rr-verify">
          <summary>
            Automated URL verification
            {verification?.ok ? " — passed" : " — details"}
          </summary>
          <ul>
            {attempts.map((a, i) => (
              <li key={`${a.endpoint}-${i}`}>
                <span className={a.status === "passed" ? "rr-verify__ok" : "rr-verify__bad"}>
                  {a.status === "passed" ? "✓" : "✗"}
                </span>{" "}
                <code>{a.endpoint}</code>
                <span className="rr-verify__origin"> ({a.origin})</span>
                {a.message ? <div className="rr-verify__msg">{a.message}</div> : null}
              </li>
            ))}
          </ul>
        </details>
      )}

      {testResult && (
        <p className={`rr-test ${testOk ? "rr-test--ok" : "rr-test--bad"}`}>
          {testResult.message || (testOk ? "Connector test passed" : "Connector test failed")}
          {typeof testResult.details?.recordsStored === "number"
            ? ` · ${testResult.details.recordsStored} stored`
            : null}
          {!testOk && (testResult.details?.endpoint || definition?.config?.endpoint) ? (
            <>
              <br />
              <span className="rr-test__url">{testResult.details?.endpoint || definition.config.endpoint}</span>
            </>
          ) : null}
        </p>
      )}

      {status === "loading" && <p className="sd-muted">Verifying feeds and collecting sample records…</p>}

      {status === "error" && (
        <div className="sd-error">
          <p>{error || "Could not load raw records."}</p>
          {onRefresh && (
            <button className="btn btn--primary" type="button" onClick={onRefresh}>
              Try again
            </button>
          )}
        </div>
      )}

      {status === "ready" && records.length === 0 && (
        <p className="sd-muted">No records yet. Run a connector fetch to collect sample items.</p>
      )}

      {records.length > 0 && (
        <ul className="rr-list">
          {records.map((record) => {
            const view = presentRecord(record);
            return (
              <li key={record.id} className="rr-item">
                <div className="rr-item__top">
                  <strong>{view.title}</strong>
                  <span>{formatWhen(record.publishedAt || record.receivedAt)}</span>
                </div>
                {view.summary && <p className="rr-item__summary">{view.summary}</p>}
                {view.url && (
                  <a className="rr-item__link" href={view.url} target="_blank" rel="noreferrer">
                    Open source item
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {(canApprove || sampleApproved) && (
        <div className="rr-approve">
          <div>
            <strong>{sampleApproved ? "Sample approved — source is In use" : "Approve connectivity sample?"}</strong>
            <p className="sd-muted">
              {sampleApproved
                ? "The source is active. Topic filters will narrow what attaches to risk cases on later collections."
                : "You are approving the feed connection, not every headline below. Expect broad news; relevance filtering happens at risk-case assessment. Reject only if this is the wrong feed or language for the objective."}
            </p>
          </div>
          {sampleApproved ? (
            <button className="btn btn--accepted" type="button" disabled>
              Approved
            </button>
          ) : (
            <div className="rr-approve__actions">
              {typeof onRejectSample === "function" && (
                <button
                  className="btn btn--ghost"
                  type="button"
                  onClick={onRejectSample}
                  disabled={approving || status === "loading"}
                >
                  Not relevant — update connector
                </button>
              )}
              <button
                className="btn btn--primary"
                type="button"
                onClick={onApproveSample}
                disabled={approving || status === "loading"}
              >
                {approving ? "Approving…" : "Approve feed → In use"}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function formatWhen(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function titleFromHtml(html) {
  const raw = String(html || "");
  const alt = raw.match(/alt=["']([^"']+)["']/i);
  if (alt?.[1]) return stripHtml(alt[1]);
  const titleAttr = raw.match(/title=["']([^"']+)["']/i);
  if (titleAttr?.[1]) return stripHtml(titleAttr[1]);
  return "";
}

function truncate(text, max) {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

/** Clean presentation for risk managers (handles HTML-heavy RSS descriptions). */
function presentRecord(record) {
  const rawSummary = record.summary || record.payload?.description || record.payload?.summary || "";
  const plain =
    record.payload?.plainText ||
    ( /</.test(rawSummary) ? stripHtml(rawSummary) : String(rawSummary || "").trim() );
  let title = String(record.title || "").trim();
  if (!title || title.toLowerCase() === "untitled item") {
    title = titleFromHtml(rawSummary) || plain.slice(0, 80) || "Untitled item";
  }
  const url =
    record.canonicalUrl ||
    record.payload?.link ||
    "";
  return {
    title,
    summary: truncate(plain, 220),
    url,
  };
}
