import type { FieldValues, Path, UseFormSetError, UseFormSetFocus } from 'react-hook-form';

import type { ApiError } from '@/lib/api/client';

/**
 * Puts server validation messages under the matching field and focuses the
 * first one. Returns true when at least one field was matched, so the caller
 * can choose between "fix the fields" and the raw server message.
 */
export function applyApiFieldErrors<T extends FieldValues>(
  error: ApiError,
  knownFields: readonly string[],
  setError: UseFormSetError<T>,
  setFocus: UseFormSetFocus<T>,
): boolean {
  let focused = false;

  for (const [field, messages] of Object.entries(error.fields)) {
    if (!knownFields.includes(field)) {
      continue;
    }

    const name = field as Path<T>;
    setError(name, { type: 'server', message: messages[0] });

    if (!focused) {
      setFocus(name);
      focused = true;
    }
  }

  return focused;
}
