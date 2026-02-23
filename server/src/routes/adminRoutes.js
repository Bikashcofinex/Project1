const express = require('express');

const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const { getOpenBets, settleBet } = require('../data/db');

const router = express.Router();

const validResults = new Set(['WIN', 'LOSE', 'VOID']);

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/bets/open', async (req, res) => {
  const rawLimit = Number(req.query.limit);
  const limit = Number.isInteger(rawLimit) && rawLimit > 0 && rawLimit <= 500 ? rawLimit : 100;
  const bets = await getOpenBets(limit);
  return res.json({ bets });
});

router.post('/bets/:betId/settle', async (req, res) => {
  const betId = req.params.betId;
  const result = typeof req.body?.result === 'string' ? req.body.result.toUpperCase() : '';

  if (!betId) {
    return res.status(400).json({ error: 'betId is required' });
  }

  if (!validResults.has(result)) {
    return res.status(400).json({ error: 'result must be WIN, LOSE, or VOID' });
  }

  try {
    const settlement = await settleBet({ betId, result });
    return res.json({
      bet: settlement.bet,
      wallet: settlement.wallet,
      userId: settlement.userId,
    });
  } catch (error) {
    if (error.message === 'BET_NOT_FOUND') {
      return res.status(404).json({ error: 'Bet not found' });
    }
    if (error.message === 'BET_ALREADY_SETTLED') {
      return res.status(409).json({ error: 'Bet already settled' });
    }
    return res.status(500).json({ error: 'Unable to settle bet' });
  }
});

module.exports = router;
