export type ProductLine = 'homme' | 'femme' | 'coffret';
export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';
export type ProductSort = 'pertinence' | 'prix-asc' | 'prix-desc' | 'nouveau';

export interface ProductImage {
  url: string;
  alt: string;
}

export interface ProductSummary {
  id: string;
  slug: string;
  name: string;
  line: ProductLine;
  family: string;
  tag: string | null;
  short_description: string;
  from_price_cents: number;
  is_demo: boolean;
  image: ProductImage | null;
  variants_count?: number | null;
}

export interface ProductVariant {
  id: string;
  sku: string;
  label: string;
  size_ml: number;
  price_cents: number;
  compare_at_price_cents: number | null;
  stock_status: StockStatus;
  is_default: boolean;
}

export interface ProductNotes {
  top: string[];
  heart: string[];
  base: string[];
}

export interface ProductMedia {
  type: 'photo' | 'model3d';
  url: string;
  alt: string;
}

export interface BundleItem {
  label: string;
  quantity: number;
  variant: {
    id: string;
    size_ml: number;
    product: { slug: string; name: string };
  } | null;
}

export interface Bundle {
  id: string;
  name: string;
  product: ProductSummary;
  items: BundleItem[];
}

export interface ProductDetail extends ProductSummary {
  description: string;
  intensity: number | null;
  longevity: number | null;
  sillage: number | null;
  season: string | null;
  occasion: string | null;
  seo: { title: string | null; description: string | null };
  variants: ProductVariant[];
  notes: ProductNotes;
  media: ProductMedia[];
  bundle: Bundle | null;
}

export interface CatalogFacets {
  lines: ProductLine[];
  families: string[];
  notes: string[];
  price: { min_cents: number; max_cents: number };
}

export interface CatalogMeta {
  next_cursor: string | null;
  prev_cursor: string | null;
  per_page: number;
  total: number;
  facets: CatalogFacets;
}

export interface ProductQuery {
  line?: ProductLine;
  family?: string;
  notes?: string[];
  min_price?: number;
  max_price?: number;
  q?: string;
  sort?: ProductSort;
  per_page?: number;
  cursor?: string;
}

export interface ProductPage {
  items: ProductSummary[];
  meta: CatalogMeta;
}
