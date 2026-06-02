import crypto from 'crypto';

/**
 * Get admin emails from environment variable
 * @returns {string[]} Array of admin email addresses
 */
export function getAdminEmails() {
  const adminEmailsEnv = process.env.ADMIN_EMAILS || 'rohitgarg090@gmail.com,info@shopos.co.in';
  return adminEmailsEnv.split(',').map(email => email.trim().toLowerCase());
}

/**
 * Check if email is admin
 * @param {string} email - Email to check
 * @returns {boolean}
 */
export function isAdminEmail(email) {
  return getAdminEmails().includes((email || '').toLowerCase());
}

/**
 * Generate cryptographically secure random password
 * @returns {string} 32-character random password
 */
export function generateSecurePassword() {
  return crypto.randomBytes(24).toString('hex');
}

/**
 * Validate password strength
 * Requires: 12+ chars, uppercase, number, special char
 * @param {string} password
 * @returns {object} { valid: boolean, errors: string[] }
 */
export function validatePasswordStrength(password) {
  const errors = [];

  if (!password || password.length < 12) {
    errors.push('Password must be at least 12 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain uppercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain number');
  }
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain special character (!@#$%^&*)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate and sanitize phone number
 * @param {string} phone - Phone number to validate
 * @returns {object} { valid: boolean, cleaned: string, error?: string }
 */
export function validatePhoneNumber(phone) {
  if (!phone) {
    return { valid: false, cleaned: '', error: 'Phone number required' };
  }

  let cleaned = phone.replace(/[^0-9+]/g, '');

  if (!cleaned.startsWith('+')) {
    if (!cleaned.startsWith('91') && cleaned.length === 10) {
      cleaned = '91' + cleaned;
    }
    cleaned = '+' + cleaned;
  }

  const digitsOnly = cleaned.replace('+', '');

  if (digitsOnly.length < 10 || digitsOnly.length > 15) {
    return {
      valid: false,
      cleaned,
      error: `Invalid phone number length: ${digitsOnly.length} digits`,
    };
  }

  return { valid: true, cleaned, error: null };
}

/**
 * Sanitize text input to prevent injection
 * @param {string} text
 * @returns {string}
 */
export function sanitizeText(text) {
  if (!text) return '';
  return String(text).replace(/[<>\"'`]/g, '');
}

/**
 * Validate input against rules
 * @param {object} data - Data to validate
 * @param {object} rules - Validation rules
 * @returns {object|null} Errors object or null if valid
 */
export function validateInput(data, rules) {
  const errors = {};

  for (const [field, rule] of Object.entries(rules)) {
    const value = data[field];

    if (rule.required && !value) {
      errors[field] = `${field} is required`;
      continue;
    }

    if (!value) continue;

    if (rule.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      errors[field] = `${field} must be valid email`;
    }

    if (rule.type === 'phone') {
      const phoneValidation = validatePhoneNumber(value);
      if (!phoneValidation.valid) {
        errors[field] = phoneValidation.error;
      }
    }

    if (rule.minLength && value.length < rule.minLength) {
      errors[field] = `${field} must be at least ${rule.minLength} characters`;
    }

    if (rule.maxLength && value.length > rule.maxLength) {
      errors[field] = `${field} must be at most ${rule.maxLength} characters`;
    }

    if (rule.pattern && !rule.pattern.test(value)) {
      errors[field] = `${field} format is invalid`;
    }

    if (rule.allowedValues && !rule.allowedValues.includes(value)) {
      errors[field] = `${field} must be one of: ${rule.allowedValues.join(', ')}`;
    }

    if (rule.minValue !== undefined && Number(value) < rule.minValue) {
      errors[field] = `${field} must be at least ${rule.minValue}`;
    }

    if (rule.maxValue !== undefined && Number(value) > rule.maxValue) {
      errors[field] = `${field} must be at most ${rule.maxValue}`;
    }
  }

  return Object.keys(errors).length === 0 ? null : errors;
}

/**
 * Extract error message safely without exposing internal details
 * @param {Error} error
 * @returns {string}
 */
export function getSafeErrorMessage(error) {
  // Log full error for debugging
  console.error('Detailed error:', error);

  // Return generic message to client
  if (error?.message?.includes('unique constraint')) {
    return 'This email is already registered';
  }

  if (error?.message?.includes('Unauthorized')) {
    return 'Unauthorized access';
  }

  return 'An error occurred. Please try again.';
}
