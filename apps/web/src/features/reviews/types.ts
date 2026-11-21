export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface Review {
  id: number;
  rating: number;
  title: string | null;
  body: string;
  author: string;
  created_at: string | null;
  status?: ReviewStatus;
}

export interface ReviewDistribution {
  '5': number;
  '4': number;
  '3': number;
  '2': number;
  '1': number;
}

export interface ReviewSummary {
  reviews: Review[];
  average: number | null;
  count: number;
  distribution: ReviewDistribution;
}

export interface ReviewPayload {
  product_id: string;
  rating: number;
  title: string | null;
  body: string;
}
