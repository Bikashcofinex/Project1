const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function splitOrigins(value) {
  if (!value) {
    return [];
  }
  return value
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
}

module.exports = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-this',
  oddsApiKey: process.env.ODDS_API_KEY || '',
  oddsRegion: process.env.ODDS_REGION || 'uk',
  oddsCricketSportKey: process.env.ODDS_CRICKET_SPORT_KEY || 'cricket_ipl',
  oddsFootballSportKey: process.env.ODDS_FOOTBALL_SPORT_KEY || 'soccer_epl',
  allowedOrigins: splitOrigins(process.env.ALLOWED_ORIGINS),
  adminName: process.env.ADMIN_NAME || 'Admin',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@betapp.local',
  adminPassword: process.env.ADMIN_PASSWORD || 'Admin@12345',
};
