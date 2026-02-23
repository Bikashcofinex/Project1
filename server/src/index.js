const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { port, allowedOrigins, adminEmail } = require('./config/env');
const { initDb, findUserByEmail } = require('./data/db');
const authRoutes = require('./routes/authRoutes');
const bettingRoutes = require('./routes/bettingRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth requests, please try again later.' },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 180,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Blocked by CORS'));
    },
  }),
);
app.use(express.json({ limit: '20kb' }));
app.use(apiLimiter);

app.get('/health', async (_req, res) => {
  const adminUser = await findUserByEmail(adminEmail).catch(() => null);
  res.json({ ok: true, adminSeeded: Boolean(adminUser) });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api', bettingRoutes);
app.use('/api/admin', adminRoutes);

app.use((error, _req, res, _next) => {
  if (error.message === 'Blocked by CORS') {
    return res.status(403).json({ error: 'Origin not allowed by CORS' });
  }
  return res.status(500).json({ error: error.message || 'Internal server error' });
});

(async () => {
  try {
    await initDb();
    app.listen(port, () => {
      console.log(`Betting API running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to initialize server:', error.message);
    process.exit(1);
  }
})();
