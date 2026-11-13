export const MOROCCAN_PHONE_PATTERN = /^(\+212|00212|0)[5-7]\d{8}$/;

const SEPARATORS = /[\s.\-()]/g;

export function normalizeMoroccanPhone(input: string): string {
  const digits = input.trim().replace(SEPARATORS, '');

  if (digits.startsWith('00212')) {
    return `+212${digits.slice(5)}`;
  }

  if (digits.startsWith('+212')) {
    return digits;
  }

  if (digits.startsWith('0')) {
    return `+212${digits.slice(1)}`;
  }

  return digits;
}

export function isValidMoroccanPhone(input: string): boolean {
  return MOROCCAN_PHONE_PATTERN.test(input.trim().replace(SEPARATORS, ''));
}

export function formatMoroccanPhone(input: string): string {
  const normalized = normalizeMoroccanPhone(input);
  const local = normalized.startsWith('+212') ? `0${normalized.slice(4)}` : normalized;

  return local.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
}
