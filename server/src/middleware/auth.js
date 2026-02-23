const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');
const { findUserById } = require('../data/db');

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    const user = await findUserById(payload.userId);

    if (!user) {
      return res.status(401).json({ error: 'Invalid token user' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      wallet: user.wallet,
    };

    return next();
  } catch (_error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = authMiddleware;
