import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

import { ErrorState } from '@/components/ui/ErrorState';
import { Panel } from '@/components/ui/Panel';

interface ErrorBoundaryProps {
  readonly children: ReactNode;
}

interface ErrorBoundaryState {
  readonly failed: boolean;
}

/**
 * Last line of defence against an unexpected render failure. The boundary
 * shows a generic, non-sensitive message and never renders a stack trace in
 * the interface.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = { failed: false };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  public override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Diagnostic only; no intelligence data or configuration is logged.
    console.error('[GCTIC] Unhandled render failure', error.name, info.componentStack);
  }

  private readonly handleReset = (): void => {
    this.setState({ failed: false });
  };

  public override render(): ReactNode {
    if (!this.state.failed) {
      return this.props.children;
    }

    return (
      <div className="fatal">
        <Panel label="SYSTEM FAULT" title="Interface failure" tone="warning">
          <ErrorState
            title="The command interface stopped rendering"
            description="An unexpected error interrupted this view. No intelligence data was modified. Reload the application, or return to the command overview."
            onRetry={this.handleReset}
            retryLabel="Attempt recovery"
          />
        </Panel>
      </div>
    );
  }
}
