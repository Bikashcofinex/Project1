const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    req.user = payload;
    return next();
  } catch (_error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = authMiddleware;
