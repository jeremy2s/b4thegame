const assert = require('assert');
const db = require('../db');

// Save original state to restore after tests
const originalState = JSON.parse(JSON.stringify(db.state || { users: [], games: [], picks: [] }));

try {
  // Prepare test data
  const users = [ { id: 1, username: 'u1' }, { id: 2, username: 'u2' } ];
  const games = [
    { id: 1, week: 1, home: 'Home', away: 'Away', kickoff: 'TBD', home_score: 10, away_score: 7 },
    { id: 2, week: 1, home: 'Home2', away: 'Away2', kickoff: 'TBD' } // pending
  ];
  const picks = [
    { id: 1, user_id: 1, game_id: 1, picked_team: 'Home', confidence: 5 }, // correct
    { id: 2, user_id: 1, game_id: 2, picked_team: 'Away2', confidence: 3 }, // pending
    { id: 3, user_id: 2, game_id: 1, picked_team: 'Away', confidence: 4 } // wrong
  ];

  // Inject test state (mutate exported state object so internal functions see it)
  db.state.users = users.slice();
  db.state.games = games.slice();
  db.state.picks = picks.slice();

  // Test computeStandings
  const standings = db.computeStandings();
  // find rows
  const r1 = standings.find(r => r.user_id === 1);
  const r2 = standings.find(r => r.user_id === 2);

  assert(r1, 'user 1 should be in standings');
  assert(r2, 'user 2 should be in standings');
  assert.strictEqual(r1.points, 5, 'user1 should have 5 points from correct pick');
  assert.strictEqual(r1.wins, 1, 'user1 wins should be 1');
  assert.strictEqual(r2.points, 0, 'user2 should have 0 points for wrong pick');
  assert.strictEqual(r2.losses, 1, 'user2 losses should be 1');
  // possible points: user1 has one pending pick with conf 3
  assert.strictEqual(r1.possible, 3, 'user1 possible should equal pending confidence (3)');

  // Test getPicksWithGames for user 1
  const history = db.getPicksWithGames(1);
  assert(Array.isArray(history), 'history should be array');
  assert.strictEqual(history.length, 2, 'user1 should have two picks');
  const pickGame1 = history.find(h => h.game && h.game.id === 1);
  assert(pickGame1, 'pick for game 1 should exist');
  assert.strictEqual(pickGame1.pointsEarned, 5, 'pointsEarned for correct pick should be confidence (5)');

  console.log('ALL TESTS PASSED');
  process.exit(0);
} catch (err) {
  console.error('TEST FAILURE:', err && err.stack ? err.stack : err);
  // restore original state
  db.state = originalState;
  process.exit(1);
} finally {
  // restore original state if tests passed
  db.state = originalState;
}
