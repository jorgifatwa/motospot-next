// ────────────────────────────────
// Password Policy Validator
// SECURITY.md Section 5 — password policy enforcement
// ────────────────────────────────

/**
 * Password policy configuration
 */
export const PASSWORD_POLICY = {
  MIN_LENGTH: 10,
  MAX_LENGTH: 128,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBER: true,
  REQUIRE_SPECIAL: false, // Optional for better UX
} as const;

/**
 * Password validation error messages
 */
export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate password against policy
 * @param password - Password to validate
 * @param email - User's email (to check if password equals email)
 * @param name - User's name (to check if password contains name)
 * @returns Validation result with errors if any
 */
export function validatePassword(
  password: string,
  email?: string,
  name?: string,
): PasswordValidationResult {
  const errors: string[] = [];

  // Length check
  if (password.length < PASSWORD_POLICY.MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_POLICY.MIN_LENGTH} characters`);
  }

  if (password.length > PASSWORD_POLICY.MAX_LENGTH) {
    errors.push(`Password must not exceed ${PASSWORD_POLICY.MAX_LENGTH} characters`);
  }

  // Uppercase check
  if (PASSWORD_POLICY.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  // Lowercase check
  if (PASSWORD_POLICY.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  // Number check
  if (PASSWORD_POLICY.REQUIRE_NUMBER && !/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  // Check if password equals email (case-insensitive)
  if (email && password.toLowerCase() === email.toLowerCase()) {
    errors.push("Password must not equal your email address");
  }

  // Check if password contains name (case-insensitive)
  if (name && name.length > 0) {
    const nameParts = name.toLowerCase().split(" ");
    const passwordLower = password.toLowerCase();

    for (const part of nameParts) {
      if (part.length >= 3 && passwordLower.includes(part)) {
        errors.push("Password must not contain your name");
        break;
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get password strength indicator
 * @param password - Password to check
 * @returns Strength score from 0-4
 */
export function getPasswordStrength(password: string): number {
  let strength = 0;

  if (password.length >= PASSWORD_POLICY.MIN_LENGTH) strength++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;

  return strength;
}

/**
 * Get password strength label
 * @param strength - Strength score from 0-4
 * @returns Human-readable strength label
 */
export function getPasswordStrengthLabel(strength: number): string {
  switch (strength) {
    case 0:
      return "Very Weak";
    case 1:
      return "Weak";
    case 2:
      return "Fair";
    case 3:
      return "Strong";
    case 4:
      return "Very Strong";
    default:
      return "Unknown";
  }
}
