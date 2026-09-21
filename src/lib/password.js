const crypto = require('crypto');

// Shared password every legacy/new account starts with — must be changed on first login.
const DEFAULT_PASSWORD = 'std-snrg';
const MIN_PASSWORD_LENGTH = 6;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  if (!hash || !salt) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const stored = Buffer.from(hash, 'hex');
  if (candidate.length !== stored.length) return false;
  return crypto.timingSafeEqual(candidate, stored);
}

module.exports = { DEFAULT_PASSWORD, MIN_PASSWORD_LENGTH, hashPassword, verifyPassword };
