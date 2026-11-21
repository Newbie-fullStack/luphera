export interface CmsPage {
  slug: string;
  title: string;
  body: string;
  meta: {
    title: string;
    description: string | null;
  };
  updated_at: string | null;
}

export interface CmsPageSummary {
  slug: string;
  title: string;
  updated_at: string | null;
}
