import { ASSESSMENT_GRADES } from '@/config/assessment-grades';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';

export function MethodologyPage() {
  return (
    <>
      <PageHeader
        eyebrow="REFERENCE // INTELLIGENCE METHODOLOGY"
        title="Assessment, provenance and handling"
        description="The rules that govern how intelligence is graded, attributed and displayed. These constraints are enforced in the domain model, not left to reviewer discretion."
        meta={<Badge variant="neutral">Reference — applies to all future modules</Badge>}
      />

      <Panel
        label="GRADING"
        title="Assessment grades"
        description="A record carries exactly one grade. Grade and confidence are always displayed together; neither may be omitted."
        className="panel--flush"
      >
        <div className="table-scroll">
          <table className="data-table">
            <caption className="u-visually-hidden">Assessment grade definitions and handling rules</caption>
            <thead>
              <tr>
                <th scope="col">Grade</th>
                <th scope="col">Definition</th>
                <th scope="col">Handling rule</th>
              </tr>
            </thead>
            <tbody>
              {ASSESSMENT_GRADES.map((grade) => (
                <tr key={grade.id}>
                  <th scope="row" className="data-table__rowhead">
                    <Badge variant={grade.tone === 'neutral' ? 'neutral' : grade.tone}>
                      {grade.label}
                    </Badge>
                    <span className="data-table__mono">{grade.id}</span>
                  </th>
                  <td>{grade.definition}</td>
                  <td>{grade.handlingRule}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="split-grid">
        <Panel
          label="PROVENANCE"
          title="Source attribution requirements"
          description="Provenance is immutable through normalisation, enrichment and storage."
        >
          <div className="prose">
            <p>
              Every record must retain the source that supplied it. A record without provenance is
              not intelligence: it is an unattributable claim, and must be rejected at ingestion.
            </p>
            <ul>
              <li>Stable source identifier and human-readable source name</li>
              <li>Source class: open-source, commercial, community, internal or synthetic</li>
              <li>ISO 8601 UTC retrieval timestamp, recorded by GCTIC rather than the source</li>
              <li>Public source reference where one exists, restricted to http(s)</li>
              <li>Licence or redistribution terms that govern reuse</li>
              <li>Collection notes describing method and known limitations</li>
            </ul>
            <p>
              When two sources disagree, both records are retained and displayed with their
              disagreement intact. Derived records cite the identifiers of the records they
              derive from.
            </p>
          </div>
        </Panel>

        <Panel
          label="ATTRIBUTION"
          title="What an observation does and does not mean"
          description="The single most common analytical error in threat intelligence is treating infrastructure contact as actor identity."
        >
          <div className="prose">
            <p>
              <strong>An indicator is an observation, not a verdict.</strong> An IP address listed
              in a feed is not an attacker, and must never be labelled as one. It is an address
              that some source reported in some context at some time.
            </p>
            <ul>
              <li>
                An IP address may be shared hosting, a content delivery edge, a compromised
                third-party host or a sinkhole.
              </li>
              <li>
                Geolocation of infrastructure is not the location of an operator, and country-level
                precision must not be presented as a facility-level claim.
              </li>
              <li>
                Shared tooling or infrastructure does not establish shared identity between
                intrusion sets.
              </li>
              <li>
                Dynamic or fast-flux infrastructure invalidates historical resolution data unless
                the observation window is stated.
              </li>
              <li>
                Attribution to a state or named group is an analytic judgement and must carry an
                inferred grade and its supporting evidence.
              </li>
            </ul>
          </div>
        </Panel>
      </div>

      <Panel
        label="CONTROLS"
        title="Validation and safe-handling rules"
        description="Implemented in the validation layer and enforced at every trust boundary."
      >
        <div className="control-grid">
          <div className="control">
            <span className="u-label">Input validation</span>
            <p>
              Observables are matched against bounded patterns for IPv4, IPv6, domain, http(s) URL
              and MD5 / SHA-1 / SHA-256 hashes. Unsupported or ambiguous values are rejected rather
              than coerced.
            </p>
          </div>
          <div className="control">
            <span className="u-label">URL safety</span>
            <p>
              Only absolute http(s) URLs are accepted. Embedded credentials, non-web schemes
              (<code>javascript:</code>, <code>data:</code>, <code>file:</code>) and oversized
              values are refused.
            </p>
          </div>
          <div className="control">
            <span className="u-label">Rendering</span>
            <p>
              All values render as React text nodes. Raw HTML injection is prohibited, and control
              characters are stripped from display strings before they reach the interface.
            </p>
          </div>
          <div className="control">
            <span className="u-label">Artefact handling</span>
            <p>
              GCTIC never opens, executes, previews or automatically downloads a URL, sample or file
              referenced by intelligence. Collection is explicit and deliberate.
            </p>
          </div>
          <div className="control">
            <span className="u-label">Data minimisation</span>
            <p>
              Collection is limited to technical observables. Personal identifiers such as email
              addresses are excluded, and no tracking, analytics or advertising scripts are loaded.
            </p>
          </div>
          <div className="control">
            <span className="u-label">Secrets</span>
            <p>
              Credentials never enter browser code. Feed keys will live in server-side environment
              variables consumed by a backend adapter, and are never committed to the repository.
            </p>
          </div>
        </div>
      </Panel>
    </>
  );
}
