const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-this',
  oddsApiKey: process.env.ODDS_API_KEY || '',
  oddsRegion: process.env.ODDS_REGION || 'uk',
};
