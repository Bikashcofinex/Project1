const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const { createUser, findUserByEmail } = require('../data/db');
const { jwtSecret } = require('../config/env');

const router = express.Router();

function signToken(user) {
  return jwt.sign({ userId: user.id, email: user.email }, jwtSecret, { expiresIn: '7d' });
}

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    wallet: user.wallet,
  };
}

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email and password are required' });
  }

  const existing = findUserByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'Email already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = createUser({
    id: crypto.randomUUID(),
    name,
    email,
    passwordHash,
  });

  return res.status(201).json({
    token: signToken(user),
    user: sanitizeUser(user),
  });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const user = findUserByEmail(email);
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
