const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbFile = path.join(dataDir, 'db.json');

let state = { users: [], games: [], picks: [] };
if (fs.existsSync(dbFile)) {
  try {
    state = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
  } catch (e) {
    // ignore and start fresh
  }
}

function save() {
  fs.writeFileSync(dbFile, JSON.stringify(state, null, 2), 'utf8');
}

function createUser(username) {
  if (!username) throw new Error('username required');
  if (state.users.find(u => u.username === username)) throw new Error('username exists');
  const id = state.users.length ? Math.max(...state.users.map(u => u.id)) + 1 : 1;
  const user = { id, username, created_at: new Date().toISOString() };
  state.users.push(user);
  save();
  return user;
}

function getPicksByUser(user_id) {
  return state.picks.filter(p => String(p.user_id) === String(user_id));
}

function upsertPick({ user_id, game_id, picked_team, confidence }) {
  let pick = state.picks.find(p => String(p.user_id) === String(user_id) && String(p.game_id) === String(game_id));
  if (pick) {
    pick.picked_team = picked_team;
    pick.confidence = confidence == null ? null : Number(confidence);
    pick.updated_at = new Date().toISOString();
  } else {
    const id = state.picks.length ? Math.max(...state.picks.map(p => p.id)) + 1 : 1;
    pick = { id, user_id: Number(user_id), game_id: Number(game_id), picked_team, confidence: confidence == null ? null : Number(confidence), created_at: new Date().toISOString() };
    state.picks.push(pick);
  }
  save();
  return pick;
}

function getUserByUsername(username) {
  return state.users.find(u => u.username === username) || null;
}

function getUsers() {
  return state.users.slice();
}

module.exports = { createUser, getPicksByUser, upsertPick, getUserByUsername, getUsers, state };

function setGames(games) {
  state.games = Array.isArray(games) ? games.map(g => ({ ...g })) : [];
  save();
}

function getGames() {
  return state.games.slice();
}

function computeStandings() {
  // return detailed standings per user: wins, losses, possible (remaining), points
  const rows = state.users.map(u => ({ user_id: u.id, name: u.username || u.name, wins: 0, losses: 0, possible: 0, points: 0 }));
  for (const p of state.picks) {
    const game = state.games.find(g => String(g.id) === String(p.game_id));
    const row = rows.find(r => r.user_id === p.user_id);
    if (!row) continue;
    const conf = p.confidence == null ? 1 : Number(p.confidence);
    if (!game || typeof game.home_score !== 'number' || typeof game.away_score !== 'number') {
      // game pending -> possible points
      row.possible += conf;
      continue;
    }
    let winner = null;
    if (game.home_score > game.away_score) winner = game.home;
    else if (game.away_score > game.home_score) winner = game.away;
    if (!winner) {
      row.possible += conf;
      continue;
    }
    if (p.picked_team === winner) {
      row.wins += 1;
      row.points += conf;
    } else {
      // if they made a pick and it was wrong, count as loss
      if (p.picked_team) row.losses += 1;
    }
  }
  // sort by points desc
  return rows.sort((a, b) => b.points - a.points).map(r => ({ user_id: r.user_id, name: r.name, score: r.points, wins: r.wins, losses: r.losses, possible: r.possible, points: r.points }));
}

function getPicksWithGames(user_id) {
  const picks = state.picks.filter(p => String(p.user_id) === String(user_id));
  return picks.map(p => {
    const game = state.games.find(g => String(g.id) === String(p.game_id)) || null;
    let winner = null;
    if (game && typeof game.home_score === 'number' && typeof game.away_score === 'number') {
      if (game.home_score > game.away_score) winner = game.home;
      else if (game.away_score > game.home_score) winner = game.away;
    }
    const correct = winner ? (p.picked_team === winner) : null;
    const pointsEarned = correct ? (p.confidence == null ? 1 : Number(p.confidence)) : 0;
    return {
      ...p,
      game: game ? { id: game.id, week: game.week, home: game.home, away: game.away, kickoff: game.kickoff, home_score: game.home_score, away_score: game.away_score } : null,
      winner,
      correct,
      pointsEarned
    };
  });
}

function deletePickById(id) {
  const idx = state.picks.findIndex(p => String(p.id) === String(id));
  if (idx === -1) return false;
  state.picks.splice(idx, 1);
  save();
  return true;
}

module.exports = { createUser, getPicksByUser, upsertPick, getUserByUsername, getUsers, state, setGames, getGames, computeStandings, getPicksWithGames, deletePickById };
