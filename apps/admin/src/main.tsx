import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

import '@/i18n';
import '@/styles/index.css';
import '@/styles/components.css';

import { App } from '@/app/App';
import { AppErrorBoundary } from '@/app/AppErrorBoundary';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { queryClient } from '@/lib/query-client';

const container = document.getElementById('root');

if (container === null) {
  throw new Error('Root container #root is missing from index.html');
}

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppErrorBoundary>
            <App />
          </AppErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
