const fallbackMatches = {
  Cricket: [
    {
      id: 'cr-1',
      sport: 'Cricket',
      league: 'T20 League',
      startTime: '18:30',
      teamA: 'Mumbai Tigers',
      teamB: 'Chennai Kings',
      markets: [
        { label: 'Mumbai Tigers Win', odds: 1.82 },
        { label: 'Chennai Kings Win', odds: 1.95 },
      ],
    },
    {
      id: 'cr-2',
      sport: 'Cricket',
      league: 'ODI Cup',
      startTime: '20:00',
      teamA: 'Sydney Strikers',
      teamB: 'Cape Town Foxes',
      markets: [
        { label: 'Sydney Strikers Win', odds: 1.7 },
        { label: 'Cape Town Foxes Win', odds: 2.08 },
      ],
    },
  ],
  Football: [
    {
      id: 'fb-1',
      sport: 'Football',
      league: 'Premier League',
      startTime: '19:00',
      teamA: 'North London FC',
      teamB: 'Merseyside United',
      markets: [
        { label: 'North London FC Win', odds: 2.15 },
        { label: 'Draw', odds: 3.2 },
        { label: 'Merseyside United Win', odds: 2.55 },
      ],
    },
    {
      id: 'fb-2',
      sport: 'Football',
      league: 'Champions Cup',
      startTime: '21:15',
      teamA: 'Madrid Stars',
      teamB: 'Milan City',
      markets: [
        { label: 'Madrid Stars Win', odds: 1.92 },
        { label: 'Draw', odds: 3.4 },
        { label: 'Milan City Win', odds: 3.65 },
      ],
    },
  ],
};

module.exports = fallbackMatches;
