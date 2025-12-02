export const validatePassword = (password) => {
  const errors = [];

  // Check if password exists
  if (!password) {
    return {
      isValid: false,
      errors: ["Password is required"]
    };
  }

  // 1. Check minimum length (8 characters)
  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  // 2. Check for uppercase letters
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter (A-Z)");
  }

  // 3. Check for lowercase letters
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter (a-z)");
  }

  // 4. Check for numbers
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number (0-9)");
  }

  // 5. Check for special characters
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Password must contain at least one special character (!@#$%^&*)");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export default {
  validatePassword
};
