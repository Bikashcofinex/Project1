const express = require('express');
const crypto = require('crypto');

const authMiddleware = require('../middleware/auth');
const { findUserById, updateUser } = require('../data/db');
const { getMatchesBySport } = require('../services/oddsService');

const router = express.Router();

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    wallet: user.wallet,
  };
}

router.use(authMiddleware);

router.get('/me', (req, res) => {
  const user = findUserById(req.user.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  return res.json({ user: sanitizeUser(user) });
});

router.get('/matches', async (req, res) => {
  const sport = req.query.sport;

  if (sport !== 'Cricket' && sport !== 'Football') {
    return res.status(400).json({ error: 'sport must be Cricket or Football' });
  }

  const matches = await getMatchesBySport(sport);
  return res.json({ matches });
});

router.get('/bets', (req, res) => {
  const user = findUserById(req.user.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const bets = [...user.bets].sort((a, b) => (a.placedAt < b.placedAt ? 1 : -1));
  return res.json({ bets, wallet: user.wallet });
});

router.post('/bets', (req, res) => {
  const { matchId, fixture, marketLabel, odds, sport, stake } = req.body;

  if (!matchId || !fixture || !marketLabel || !odds || !sport || !stake) {
    return res.status(400).json({ error: 'Missing required bet fields' });
  }

  if (!Number.isInteger(stake) || stake <= 0) {
    return res.status(400).json({ error: 'Stake must be a positive whole number' });
  }

  const user = findUserById(req.user.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (stake > user.wallet) {
    return res.status(400).json({ error: 'Insufficient wallet balance' });
  }

  const bet = {
    id: crypto.randomUUID(),
    matchId,
    fixture,
    marketLabel,
    odds,
    sport,
    stake,
    payout: Number((stake * Number(odds)).toFixed(2)),
    status: 'PLACED',
    placedAt: new Date().toISOString(),
  };

  const updatedUser = updateUser(user.id, current => ({
    ...current,
    wallet: current.wallet - stake,
    bets: [bet, ...current.bets],
  }));

  return res.status(201).json({
    bet,
    wallet: updatedUser.wallet,
    bets: updatedUser.bets,
  });
});

module.exports = router;
