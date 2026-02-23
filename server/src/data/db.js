const fs = require('fs');
const path = require('path');

const dbFilePath = path.resolve(__dirname, '../../data/db.json');

const defaultDb = {
  users: [],
};

function ensureDb() {
  if (!fs.existsSync(dbFilePath)) {
    fs.mkdirSync(path.dirname(dbFilePath), { recursive: true });
    fs.writeFileSync(dbFilePath, JSON.stringify(defaultDb, null, 2), 'utf8');
  }
}

function readDb() {
  ensureDb();
  const raw = fs.readFileSync(dbFilePath, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (_error) {
    return { ...defaultDb };
  }
}

function writeDb(nextDb) {
  fs.writeFileSync(dbFilePath, JSON.stringify(nextDb, null, 2), 'utf8');
}

function findUserByEmail(email) {
  const db = readDb();
  return db.users.find(user => user.email.toLowerCase() === email.toLowerCase()) || null;
}

function findUserById(id) {
  const db = readDb();
  return db.users.find(user => user.id === id) || null;
}

function createUser({ id, name, email, passwordHash }) {
  const db = readDb();
  const newUser = {
    id,
    name,
    email,
    passwordHash,
    wallet: 2000,
    bets: [],
    createdAt: new Date().toISOString(),
  };
  db.users.push(newUser);
  writeDb(db);
  return newUser;
}

function updateUser(id, updater) {
  const db = readDb();
  const userIndex = db.users.findIndex(user => user.id === id);
  if (userIndex === -1) {
    return null;
  }

  const currentUser = db.users[userIndex];
  const nextUser = updater(currentUser);
  db.users[userIndex] = nextUser;
  writeDb(db);
  return nextUser;
}

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  updateUser,
};
