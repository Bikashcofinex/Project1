const express = require('express');

const authMiddleware = require('../middleware/auth');
const { parseStake, isNonEmptyString } = require('../middleware/validation');
const {
  findUserById,
  getUserBets,
  createBetAndDebitWallet,
} = require('../data/db');
const { getMatchesBySport } = require('../services/oddsService');

const router = express.Router();

const validSports = new Set(['Cricket', 'Football']);

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    wallet: user.wallet,
    role: user.role,
  };
}

router.use(authMiddleware);

router.get('/me', async (req, res) => {
  const user = await findUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  return res.json({ user: sanitizeUser(user) });
});

router.get('/matches', async (req, res) => {
  const sport = req.query.sport;

  if (!validSports.has(sport)) {
    return res.status(400).json({ error: 'sport must be Cricket or Football' });
  }

  const matches = await getMatchesBySport(sport);
  return res.json({ matches });
});

router.get('/bets', async (req, res) => {
  const user = await findUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const bets = await getUserBets(user.id, 100);
  return res.json({ bets, wallet: user.wallet });
});

router.post('/bets', async (req, res) => {
  const matchId = typeof req.body?.matchId === 'string' ? req.body.matchId : '';
  const marketLabel = typeof req.body?.marketLabel === 'string' ? req.body.marketLabel : '';
  const sport = typeof req.body?.sport === 'string' ? req.body.sport : '';
  const stake = parseStake(req.body?.stake);

  if (!isNonEmptyString(matchId, 1, 120)) {
    return res.status(400).json({ error: 'Invalid matchId' });
  }

  if (!isNonEmptyString(marketLabel, 2, 120)) {
    return res.status(400).json({ error: 'Invalid market label' });
  }

  if (!validSports.has(sport)) {
    return res.status(400).json({ error: 'sport must be Cricket or Football' });
  }

  if (!stake) {
    return res.status(400).json({ error: 'Stake must be a positive whole number (max 100000)' });
  }

  const user = await findUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const matches = await getMatchesBySport(sport);
  const selectedMatch = matches.find(match => match.id === matchId);
  if (!selectedMatch) {
    return res.status(400).json({ error: 'Match is not available for betting now' });
  }

  const selectedMarket = selectedMatch.markets.find(market => market.label === marketLabel);
  if (!selectedMarket) {
    return res.status(400).json({ error: 'Market is not available now' });
  }

  const trustedOdds = Number(selectedMarket.odds);
  if (!Number.isFinite(trustedOdds) || trustedOdds <= 1 || trustedOdds > 100) {
    return res.status(400).json({ error: 'Invalid odds' });
  }

  const fixture = `${selectedMatch.teamA} vs ${selectedMatch.teamB}`;
  const payout = Number((stake * trustedOdds).toFixed(2));

  try {
    const betResult = await createBetAndDebitWallet({
      userId: user.id,
      matchId: selectedMatch.id,
      fixture,
      marketLabel: selectedMarket.label,
      odds: trustedOdds,
      sport,
      stake,
      payout,
    });

    const bets = await getUserBets(user.id, 100);

    return res.status(201).json({
      bet: betResult.bet,
      wallet: betResult.wallet,
      bets,
    });
  } catch (error) {
    if (error.message === 'INSUFFICIENT_FUNDS') {
      return res.status(400).json({ error: 'Insufficient wallet balance' });
    }
    return res.status(500).json({ error: 'Unable to place bet' });
  }
});

module.exports = router;
