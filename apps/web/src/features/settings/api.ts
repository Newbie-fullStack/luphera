import { apiRequest } from '@/lib/api/client';

export interface PublicSettings {
  brand: {
    name: string;
    tagline: string | null;
    whatsapp: string | null;
    email: string | null;
  };
  announcement: {
    active: boolean;
    text: string;
  };
  currency: {
    code: string;
    symbol: string;
    tax_included: boolean;
  };
  shipping: {
    flat_fee_cents: number;
    free_threshold_cents: number;
    default_delay: string | null;
  };
}

export function fetchSettings(): Promise<PublicSettings> {
  return apiRequest<PublicSettings>('/settings');
}
