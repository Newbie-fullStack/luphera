import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

import '@/i18n';
import '@/styles/index.css';
import '@/styles/components.css';

import { App } from '@/app/App';
import { AppErrorBoundary } from '@/app/AppErrorBoundary';
import { CartProvider } from '@/features/cart/CartProvider';
import { queryClient } from '@/lib/query-client';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root element not found');
}

createRoot(container).render(
  <StrictMode>
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <CartProvider>
            <App />
          </CartProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </AppErrorBoundary>
  </StrictMode>,
);
