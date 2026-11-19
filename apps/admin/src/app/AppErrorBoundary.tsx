import { Component, type ErrorInfo, type ReactNode } from 'react';

import i18n from '@/i18n';

interface State {
  failed: boolean;
}

/**
 * Last line of defence: a render error shows a calm recovery screen instead of
 * a blank console. The error is logged for the developer, never displayed raw.
 */
export class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Admin render error', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.failed) {
      return (
        <div className="grid min-h-dvh place-items-center px-6 text-center">
          <div className="grid max-w-md justify-items-center gap-4">
            <p className="eyebrow">{i18n.t('brand.console')}</p>
            <h1 className="text-3xl">{i18n.t('errors.title')}</h1>
            <p className="text-sm text-brume">{i18n.t('errors.body')}</p>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                window.location.reload();
              }}
            >
              {i18n.t('errors.reload')}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
