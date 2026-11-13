import { Component, type ErrorInfo, type ReactNode } from 'react';

import i18n from '@/i18n';
import { Button } from '@/components/ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Sentry is wired in phase 7; until then the console is the only sink.
    console.error('Unhandled UI error', error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="grid min-h-dvh place-items-center bg-nuit px-6 text-center">
        <div className="grid max-w-md justify-items-center gap-5">
          <p className="eyebrow">{i18n.t('brand.name')}</p>
          <h1 className="font-display text-4xl text-ivoire">{i18n.t('errors.title')}</h1>
          <p className="text-texte">{i18n.t('errors.body')}</p>
          <Button onClick={() => window.location.reload()}>{i18n.t('errors.reload')}</Button>
        </div>
      </div>
    );
  }
}
