const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const {
  adminName,
  adminEmail,
  adminPassword,
} = require('../config/env');

const sqlitePath = path.resolve(__dirname, '../../data/app.db');
const legacyJsonPath = path.resolve(__dirname, '../../data/db.json');

let dbPromise;

function mapUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    wallet: Number(row.wallet),
    role: row.role,
    createdAt: row.created_at,
  };
}

function mapBet(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    matchId: row.match_id,
    fixture: row.fixture,
    marketLabel: row.market_label,
    odds: Number(row.odds),
    sport: row.sport,
    stake: Number(row.stake),
    payout: Number(row.payout),
    status: row.status,
    result: row.result,
    placedAt: row.placed_at,
    settledAt: row.settled_at,
  };
}

async function createSchema(db) {
  await db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      wallet INTEGER NOT NULL DEFAULT 2000,
      role TEXT NOT NULL DEFAULT 'USER',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      match_id TEXT NOT NULL,
      fixture TEXT NOT NULL,
      market_label TEXT NOT NULL,
      odds REAL NOT NULL,
      sport TEXT NOT NULL,
      stake INTEGER NOT NULL,
      payout REAL NOT NULL,
      status TEXT NOT NULL,
      result TEXT,
      placed_at TEXT NOT NULL,
      settled_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_bets_user_id ON bets(user_id);
    CREATE INDEX IF NOT EXISTS idx_bets_status ON bets(status);
  `);
}

async function migrateLegacyJsonIfNeeded(db) {
  const countRow = await db.get('SELECT COUNT(*) AS count FROM users');
  if ((countRow?.count || 0) > 0) {
    return;
  }

  if (!fs.existsSync(legacyJsonPath)) {
    return;
  }

  const raw = fs.readFileSync(legacyJsonPath, 'utf8');
  let legacy;
  try {
    legacy = JSON.parse(raw);
  } catch (_error) {
    return;
  }

  if (!Array.isArray(legacy.users)) {
    return;
  }

  await db.exec('BEGIN TRANSACTION');
  try {
    for (const user of legacy.users) {
      const userId = user.id || crypto.randomUUID();
      await db.run(
        `INSERT INTO users (id, name, email, password_hash, wallet, role, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        userId,
        user.name || 'User',
        String(user.email || '').toLowerCase(),
        user.passwordHash || '',
        Number(user.wallet || 2000),
        user.role || 'USER',
        user.createdAt || new Date().toISOString(),
      );

      if (Array.isArray(user.bets)) {
        for (const bet of user.bets) {
          const stake = Number(bet.stake || 0);
          const odds = Number(bet.odds || 1);
          await db.run(
            `INSERT INTO bets (
              id, user_id, match_id, fixture, market_label, odds, sport, stake,
              payout, status, result, placed_at, settled_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            bet.id || crypto.randomUUID(),
            userId,
            bet.matchId || 'legacy-match',
            bet.fixture || 'Legacy Fixture',
            bet.marketLabel || 'Legacy Market',
            odds,
            bet.sport || 'Cricket',
            stake,
            Number(bet.payout || stake * odds),
            bet.status || 'PLACED',
            bet.result || null,
            bet.placedAt || new Date().toISOString(),
            bet.settledAt || null,
          );
        }
      }
    }

    await db.exec('COMMIT');
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }
}

async function ensureAdminUser(db) {
  const existing = await db.get('SELECT id FROM users WHERE email = ?', adminEmail.toLowerCase());
  if (existing) {
    await db.run('UPDATE users SET role = ? WHERE id = ?', 'ADMIN', existing.id);
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await db.run(
    `INSERT INTO users (id, name, email, password_hash, wallet, role, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    crypto.randomUUID(),
    adminName,
    adminEmail.toLowerCase(),
    passwordHash,
    0,
    'ADMIN',
    new Date().toISOString(),
  );
}

async function initializeDb() {
  const db = await open({
    filename: sqlitePath,
    driver: sqlite3.Database,
  });

  await createSchema(db);
  await migrateLegacyJsonIfNeeded(db);
  await ensureAdminUser(db);
  return db;
}

function getDb() {
  if (!dbPromise) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return dbPromise;
}

async function initDb() {
  if (!dbPromise) {
    dbPromise = initializeDb();
  }
  await dbPromise;
}

async function findUserByEmail(email) {
  const db = await getDb();
  const row = await db.get('SELECT * FROM users WHERE email = ?', String(email).toLowerCase());
  return mapUser(row);
}

async function findUserById(id) {
  const db = await getDb();
  const row = await db.get('SELECT * FROM users WHERE id = ?', id);
  return mapUser(row);
}

async function createUser({ id, name, email, passwordHash, role = 'USER' }) {
  const db = await getDb();
  const createdAt = new Date().toISOString();
  await db.run(
    `INSERT INTO users (id, name, email, password_hash, wallet, role, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    id,
    name,
    String(email).toLowerCase(),
    passwordHash,
    2000,
    role,
    createdAt,
  );
  return findUserById(id);
}

async function getUserBets(userId, limit = 50) {
  const db = await getDb();
  const rows = await db.all(
    `SELECT * FROM bets WHERE user_id = ?
     ORDER BY placed_at DESC
     LIMIT ?`,
    userId,
    limit,
  );
  return rows.map(mapBet);
}

async function createBetAndDebitWallet({
  userId,
  matchId,
  fixture,
  marketLabel,
  odds,
  sport,
  stake,
  payout,
}) {
  const db = await getDb();
  const betId = crypto.randomUUID();
  const placedAt = new Date().toISOString();

  await db.exec('BEGIN IMMEDIATE TRANSACTION');
  try {
    const debitResult = await db.run(
      'UPDATE users SET wallet = wallet - ? WHERE id = ? AND wallet >= ?',
      stake,
      userId,
      stake,
    );

    if ((debitResult?.changes || 0) === 0) {
      throw new Error('INSUFFICIENT_FUNDS');
    }

    await db.run(
      `INSERT INTO bets (
        id, user_id, match_id, fixture, market_label, odds, sport, stake,
        payout, status, result, placed_at, settled_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      betId,
      userId,
      matchId,
      fixture,
      marketLabel,
      odds,
      sport,
      stake,
      payout,
      'PLACED',
      null,
      placedAt,
      null,
    );

    await db.exec('COMMIT');
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }

  const bet = await getBetById(betId);
  const user = await findUserById(userId);

  return {
    bet,
    wallet: user.wallet,
  };
}

async function getBetById(id) {
  const db = await getDb();
  const row = await db.get('SELECT * FROM bets WHERE id = ?', id);
  return mapBet(row);
}

async function getOpenBets(limit = 100) {
  const db = await getDb();
  const rows = await db.all(
    `SELECT bets.*, users.name AS user_name, users.email AS user_email
     FROM bets
     JOIN users ON users.id = bets.user_id
     WHERE bets.status = 'PLACED'
     ORDER BY bets.placed_at DESC
     LIMIT ?`,
    limit,
  );

  return rows.map(row => ({
    ...mapBet(row),
    userName: row.user_name,
    userEmail: row.user_email,
  }));
}

function getSettleCreditAmount(bet, result) {
  if (result === 'WIN') {
    return Number(bet.payout);
  }
  if (result === 'VOID') {
    return Number(bet.stake);
  }
  return 0;
}

async function settleBet({ betId, result }) {
  const db = await getDb();

  await db.exec('BEGIN IMMEDIATE TRANSACTION');
  try {
    const betRow = await db.get('SELECT * FROM bets WHERE id = ?', betId);
    const bet = mapBet(betRow);

    if (!bet) {
      throw new Error('BET_NOT_FOUND');
    }

    if (bet.status !== 'PLACED') {
      throw new Error('BET_ALREADY_SETTLED');
    }

    const credit = getSettleCreditAmount(bet, result);
    const settledAt = new Date().toISOString();

    await db.run(
      'UPDATE bets SET status = ?, result = ?, settled_at = ? WHERE id = ?',
      'SETTLED',
      result,
      settledAt,
      betId,
    );

    if (credit > 0) {
      await db.run('UPDATE users SET wallet = wallet + ? WHERE id = ?', credit, bet.userId);
    }

    await db.exec('COMMIT');

    const updatedBet = await getBetById(betId);
    const updatedUser = await findUserById(bet.userId);

    return {
      bet: updatedBet,
      wallet: updatedUser.wallet,
      userId: bet.userId,
    };
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }
}

module.exports = {
  initDb,
  findUserByEmail,
  findUserById,
  createUser,
  getUserBets,
  createBetAndDebitWallet,
  getOpenBets,
  settleBet,
};
