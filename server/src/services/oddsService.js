const {
  oddsApiKey,
  oddsRegion,
  oddsCricketSportKey,
  oddsFootballSportKey,
} = require('../config/env');
const fallbackMatches = require('./fallbackMatches');

const sportKeyMap = {
  Cricket: oddsCricketSportKey,
  Football: oddsFootballSportKey,
};

function normalizeMatch(event, sport) {
  const bookmaker = event.bookmakers?.[0];
  const h2hMarket = bookmaker?.markets?.find(market => market.key === 'h2h');
  const outcomes = h2hMarket?.outcomes || [];

  const markets = outcomes
    .filter(outcome => typeof outcome.price === 'number')
    .map(outcome => {
      if (outcome.name.toLowerCase() === 'draw') {
        return { label: 'Draw', odds: outcome.price };
      }
      return { label: `${outcome.name} Win`, odds: outcome.price };
    });

  if (markets.length < 2) {
    return null;
  }

  return {
    id: event.id,
    sport,
    league: event.sport_title || sport,
    startTime: new Date(event.commence_time).toLocaleString(),
    teamA: event.home_team,
    teamB: event.away_team,
    markets,
  };
}

async function fetchMatchesFromOddsApi(sport) {
  const sportKey = sportKeyMap[sport];
  if (!sportKey || !oddsApiKey) {
    return [];
  }

  const url = new URL(`https://api.the-odds-api.com/v4/sports/${sportKey}/odds/`);
  url.searchParams.set('apiKey', oddsApiKey);
  url.searchParams.set('regions', oddsRegion);
  url.searchParams.set('markets', 'h2h');
  url.searchParams.set('oddsFormat', 'decimal');
  url.searchParams.set('dateFormat', 'iso');

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Odds API request failed with status ${response.status}`);
  }

  const events = await response.json();
  return events.map(event => normalizeMatch(event, sport)).filter(Boolean).slice(0, 10);
}

async function getMatchesBySport(sport) {
  try {
    const apiMatches = await fetchMatchesFromOddsApi(sport);
    if (apiMatches.length > 0) {
      return apiMatches;
    }
  } catch (_error) {
    // If API fails or no key is configured, fallback fixtures are used.
  }

  return fallbackMatches[sport] || [];
}

module.exports = {
  getMatchesBySport,
};
