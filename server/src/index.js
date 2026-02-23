const express = require('express');
const cors = require('cors');

const { port } = require('./config/env');
const authRoutes = require('./routes/authRoutes');
const bettingRoutes = require('./routes/bettingRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRoutes);
app.use('/api', bettingRoutes);

app.use((error, _req, res, _next) => {
  return res.status(500).json({ error: error.message || 'Internal server error' });
});

app.listen(port, () => {
  console.log(`Betting API running on http://localhost:${port}`);
});
