import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';

export function NotFoundPage() {
  return (
    <>
      <PageHeader
        eyebrow="NAVIGATION // UNRESOLVED"
        title="Route not found"
        description="The requested path does not correspond to any module in the GCTIC registry."
      />
      <Panel>
        <EmptyState
          title="No module is registered at this path"
          description="The address may be mistyped, or the module may not exist in this build. Available modules are listed in the navigation rail."
          hint="HTTP 404 — client-side route"
          action={
            <Link className="btn btn--primary" to="/">
              Return to overview
            </Link>
          }
        />
      </Panel>
    </>
  );
}
