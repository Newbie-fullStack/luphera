import { describe, expect, it } from 'vitest';

import type { Staff } from '@/lib/api/types';

import { hasPermission } from './useAuth';

const staff: Staff = {
  id: '01HZZZZZZZZZZZZZZZZZZZZZZZ',
  name: 'Salma',
  phone: '+212612345678',
  email: 'salma@luphera.test',
  roles: ['support'],
  permissions: ['orders.view', 'orders.confirm'],
  last_login_at: null,
};

describe('hasPermission', () => {
  it('grants only the permissions returned by the API', () => {
    expect(hasPermission(staff, 'orders.confirm')).toBe(true);
    expect(hasPermission(staff, 'catalog.manage')).toBe(false);
  });

  it('denies everything for a signed-out visitor', () => {
    expect(hasPermission(null, 'orders.view')).toBe(false);
  });
});
