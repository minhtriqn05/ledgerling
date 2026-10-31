// Basic checks for the Login and Register forms. The server checks everything again.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value) {
  return EMAIL_REGEX.test(value.trim());
}

// Basic checks for the "Change password" form. Returns the translation key of the first problem, or null.
// The server checks again (and also refuses a wrong current password).
export function passwordChangeProblem({ current, next, confirm }) {
  if (!current) return 'settings.password.enterCurrent';
  if (next.length < 8) return 'settings.password.tooShort';
  if (next.length > 72) return 'errors.PASSWORD_TOO_LONG';
  if (next === current) return 'errors.PASSWORD_UNCHANGED';
  if (next !== confirm) return 'settings.password.mismatch';
  return null;
}

// The word the person types to unlock "Delete my account"
export const DELETE_WORD = 'DELETE';
