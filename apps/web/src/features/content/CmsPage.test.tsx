import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchPage } from '@/features/content/api';
import { CmsPage } from '@/features/content/CmsPage';
import { ApiError } from '@/lib/api/client';
import { testQueryClient } from '@/test/auth';

vi.mock('@/features/content/api', () => ({
  fetchPage: vi.fn(),
  fetchPages: vi.fn(),
}));

const mockedFetchPage = vi.mocked(fetchPage);

function renderPage(slug = 'histoire') {
  return render(
    <QueryClientProvider client={testQueryClient()}>
      <MemoryRouter>
        <CmsPage slug={slug} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('CmsPage', () => {
  beforeEach(() => {
    mockedFetchPage.mockReset();
  });

  it('renders a published page and its paragraphs', async () => {
    mockedFetchPage.mockResolvedValue({
      slug: 'histoire',
      title: 'La maison',
      body: 'Premier paragraphe.\n\nSecond paragraphe.',
      meta: { title: 'La maison Luphéra', description: 'Origines et gestes.' },
      updated_at: '2026-11-19T10:00:00+00:00',
    });

    renderPage();

    expect(await screen.findByRole('heading', { level: 1, name: 'La maison' })).toBeInTheDocument();
    expect(screen.getByText('Premier paragraphe.')).toBeInTheDocument();
    expect(screen.getByText('Second paragraphe.')).toBeInTheDocument();
    expect(screen.getByText('Origines et gestes.')).toBeInTheDocument();
  });

  it('shows the "page en préparation" state when the page is a draft', async () => {
    mockedFetchPage.mockRejectedValue(
      new ApiError(404, { code: 'not_found', message: 'Introuvable' }),
    );

    renderPage('mentions-legales');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page en préparation' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Nous écrire' })).toHaveAttribute('href', '/contact');
  });
});
