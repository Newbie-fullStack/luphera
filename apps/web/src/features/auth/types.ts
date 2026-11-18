export interface AuthUser {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  phone_verified: boolean;
  marketing_opt_in: boolean;
  roles: string[];
  created_at: string | null;
}

export interface Address {
  id: string;
  label: string | null;
  recipient_name: string;
  phone: string;
  city: { slug: string; name: string; delivery_days: string } | null;
  district: string;
  address: string;
  landmark: string | null;
  is_default: boolean;
}

export interface AddressPayload {
  label?: string | null;
  recipient_name: string;
  phone: string;
  city: string;
  district: string;
  address: string;
  landmark?: string | null;
  is_default?: boolean;
}

export interface RegisterPayload {
  name: string;
  phone: string;
  email?: string | null;
  password: string;
  password_confirmation: string;
  marketing_opt_in?: boolean;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface ProfilePayload {
  name?: string;
  email?: string | null;
  marketing_opt_in?: boolean;
}
