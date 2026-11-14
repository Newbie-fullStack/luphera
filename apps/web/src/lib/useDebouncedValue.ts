import { useEffect, useState } from 'react';

/**
 * Returns the value after it has stopped changing for `delay` ms.
 * Used for the catalogue search so the API is not hit on every keystroke.
 */
export function useDebouncedValue<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);

    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
