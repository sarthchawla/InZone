const PASSWORD_RULES = [
  { test: (p: string) => p.length >= 8, message: 'At least 8 characters' },
  { test: (p: string) => /[A-Z]/.test(p), message: 'At least one uppercase letter' },
  { test: (p: string) => /[a-z]/.test(p), message: 'At least one lowercase letter' },
  { test: (p: string) => /[0-9]/.test(p), message: 'At least one number' },
  {
    test: (p: string) => /[^A-Za-z0-9]/.test(p),
    message: 'At least one special character',
  },
];

export function validatePasswordStrength(password: string): string | null {
  for (const rule of PASSWORD_RULES) {
    if (!rule.test(password)) return rule.message;
  }
  return null;
}
