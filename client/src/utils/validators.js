// Basic checks for the Login and Register forms. The server checks everything again.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value) {
  return EMAIL_REGEX.test(value.trim());
}
