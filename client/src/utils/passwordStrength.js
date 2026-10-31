// How strong a new password looks: 'weak', 'medium' or 'strong' (null while the field is empty).
// A simple count, not a guarantee: points for length (8, 12, 16 characters) and for the kinds of characters
// (lower case, upper case, digits, anything else). 0-2 points is weak, 3 medium, 4 strong.
export function passwordStrength(password) {
  if (!password) return { level: null, score: 0 };

  const kinds = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((pattern) => pattern.test(password)).length;
  let points = 0;
  if (password.length >= 8) points += 1;
  if (password.length >= 12) points += 1;
  if (password.length >= 16) points += 1;
  if (kinds >= 2) points += 1;
  if (kinds >= 3) points += 1;

  // Under 8 characters is weak whatever else it has; the server refuses it anyway
  if (password.length < 8) return { level: 'weak', score: 1 };
  if (points >= 4) return { level: 'strong', score: 3 };
  if (points === 3) return { level: 'medium', score: 2 };
  return { level: 'weak', score: 1 };
}
