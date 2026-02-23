const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const { createUser, findUserByEmail } = require('../data/db');
const { jwtSecret } = require('../config/env');
const {
  isNonEmptyString,
  isStrongPassword,
  isValidEmail,
} = require('../middleware/validation');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    jwtSecret,
    { expiresIn: '7d' },
  );
}

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    wallet: user.wallet,
    role: user.role,
  };
}

router.post('/register', async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!isNonEmptyString(name, 2, 60)) {
    return res.status(400).json({ error: 'Name must be 2-60 characters' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  if (!isStrongPassword(password)) {
    return res.status(400).json({
      error:
        'Password must be 8-64 chars and include upper, lower, digit, and special char',
    });
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'Email already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await createUser({
    id: crypto.randomUUID(),
    name,
    email,
    passwordHash,
    role: 'USER',
  });

  return res.status(201).json({
    token: signToken(user),
    user: sanitizeUser(user),
  });
});

router.post('/login', async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!isValidEmail(email) || !isNonEmptyString(password, 1, 128)) {
    return res.status(400).json({ error: 'Invalid credentials format' });
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  return res.json({
    token: signToken(user),
    user: sanitizeUser(user),
  });
});

module.exports = router;
