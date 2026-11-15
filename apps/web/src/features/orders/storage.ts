const PREFIX = 'luphera.order.';

/**
 * The tracking token is shown once, right after checkout. Keeping it in the
 * session storage lets the confirmation page reload without asking the guest
 * to type their phone again; it disappears when the tab closes.
 */
export function rememberOrderToken(number: string, token: string): void {
  try {
    window.sessionStorage.setItem(`${PREFIX}${number}`, token);
  } catch {
    // Storage unavailable: the tracking page still works with the phone.
  }
}

export function readOrderToken(number: string): string | null {
  try {
    return window.sessionStorage.getItem(`${PREFIX}${number}`);
  } catch {
    return null;
  }
}
