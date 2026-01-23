const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Create a simple user (no auth for now)
app.post('/api/users', (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'username required' });
  try {
    const user = db.createUser(username);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List or find users
app.get('/api/users', (req, res) => {
  const { username } = req.query;
  try {
    if (username) {
      const u = db.getUserByUsername(username);
      if (!u) return res.status(404).json({ error: 'not found' });
      return res.json(u);
    }
    const all = db.getUsers();
    res.json(all);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Games endpoints - allow loading mock schedule into server state
app.get('/api/games', (req, res) => {
  try {
    const games = db.getGames();
    res.json(games);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/games', (req, res) => {
  const games = req.body;
  if (!Array.isArray(games)) return res.status(400).json({ error: 'array required' });
  try {
    db.setGames(games);
    res.json({ ok: true, count: games.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Standings computed from picks + games results
app.get('/api/standings', (req, res) => {
  try {
    const s = db.computeStandings();
    res.json(s);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Per-user history: picks joined with game info and points
app.get('/api/user_history', (req, res) => {
  const user_id = req.query.user_id;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });
  try {
    const rows = db.getPicksWithGames(user_id);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get picks for a user
app.get('/api/picks', (req, res) => {
  const user_id = req.query.user_id;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });
  const picks = db.getPicksByUser(user_id);
  res.json(picks);
});

// Upsert a pick (user_id + game_id unique)
app.post('/api/picks', (req, res) => {
  const { user_id, game_id, picked_team, confidence } = req.body;
  if (!user_id || !game_id || !picked_team) return res.status(400).json({ error: 'user_id, game_id and picked_team required' });
  try {
    const pick = db.upsertPick({ user_id, game_id, picked_team, confidence });
    res.json(pick);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a pick by id
app.delete('/api/picks', (req, res) => {
  const id = req.query.id;
  if (!id) return res.status(400).json({ error: 'id required' });
  try {
    const ok = db.deletePickById(id);
    if (!ok) return res.status(404).json({ error: 'not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
