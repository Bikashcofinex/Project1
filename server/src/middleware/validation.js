function isNonEmptyString(value, min = 1, max = 255) {
  return (
    typeof value === 'string' &&
    value.trim().length >= min &&
    value.trim().length <= max
  );
}

function isValidEmail(email) {
  if (typeof email !== 'string') {
    return false;
  }

  const normalized = email.trim().toLowerCase();
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(normalized) && normalized.length <= 254;
}

function isStrongPassword(password) {
  if (typeof password !== 'string' || password.length < 8 || password.length > 64) {
    return false;
  }

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  return hasLower && hasUpper && hasDigit && hasSpecial;
}

function parseStake(value) {
  const numericValue = Number(value);
  if (!Number.isInteger(numericValue) || numericValue <= 0 || numericValue > 100000) {
    return null;
  }

  return numericValue;
}

module.exports = {
  isNonEmptyString,
  isValidEmail,
  isStrongPassword,
  parseStake,
};
