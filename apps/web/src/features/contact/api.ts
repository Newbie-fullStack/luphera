import { apiRequest } from '@/lib/api/client';

export interface ContactPayload {
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  website?: string;
}

export function sendContactMessage(payload: ContactPayload): Promise<{ received: boolean }> {
  return apiRequest<{ received: boolean }>('/contact', { method: 'POST', body: payload });
}
