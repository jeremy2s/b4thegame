import React, { useEffect, useRef, useState } from 'react'
import mockGames from './data/games'

export default function App() {
  const [games, setGames] = useState([])
  const [name, setName] = useState('')
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('pool_user'))
    } catch {
      return null
    }
  })
  const [token, setToken] = useState(() => localStorage.getItem('pool_token'))
  const [standings, setStandings] = useState([])
  const [localPicks, setLocalPicks] = useState({})
  const [authName, setAuthName] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [draggedGameId, setDraggedGameId] = useState(null)
  const [dragOverGameId, setDragOverGameId] = useState(null)
  const [selectedWeek, setSelectedWeek] = useState(1)
  const [tiebreaker, setTiebreaker] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('pool_tiebreaker') || '{}')
    } catch {
      return {}
    }
  })
  const listRef = useRef(null)
  const dragStateRef = useRef({
    pendingTargetId: null,
    hoverTimer: null,
    draggedId: null
  })
  const weeks = Array.from(new Set(games.map(g => g.week))).sort((a, b) => a - b)
  const week = selectedWeek
  const weekGames = games.filter(g => g.week === week)
  const points = Array.from({ length: weekGames.length }, (_, i) => 16 - i)
  const helmetMap = {
    'Arizona Cardinals': 'Cardinals-icon.png',
    'Atlanta Falcons': 'Falcons-icon.png',
    'Baltimore Ravens': 'Ravens-icon.png',
    'Buffalo Bills': 'Bills-icon.png',
    'Carolina Panthers': 'Panthers-icon.png',
    'Chicago Bears': 'Bears-icon.png',
    'Cincinnati Bengals': 'Bengels-icon.png',
    'Cleveland Browns': 'Browns-icon.png',
    'Dallas Cowboys': 'Cowboys-icon.png',
    'Denver Broncos': 'Broncos-icon.png',
    'Detroit Lions': 'Lions-icon.png',
    'Green Bay Packers': 'Packers-icon.png',
    'Houston Texans': 'Texans-icon.png',
    'Indianapolis Colts': 'Colts-icon.png',
    'Jacksonville Jaguars': 'Jaguar-icon.png',
    'Kansas City Chiefs': 'Chiefs-icon.png',
    'Los Angeles Chargers': 'Chargers-icon.png',
    'Los Angeles Rams': 'Rams-icon.png',
    'L.A. Chargers': 'Chargers-icon.png',
    'L.A. Rams': 'Rams-icon.png',
    'Las Vegas Raiders': 'Raiders-icon.png',
    'Miami Dolphins': 'Dolphins-icon.png',
    'Minnesota Vikings': 'Vikings-icon.png',
    'New England Patriots': 'Patriots-icon.png',
    'New Orleans Saints': 'Saints-icon.png',
    'New York Giants': 'Giants-icon.png',
    'New York Jets': 'Jets-icon.png',
    'Philadelphia Eagles': 'Eagles-icon.png',
    'Pittsburgh Steelers': 'Steelers-icon.png',
    'San Francisco 49ers': '49ers-icon.png',
    'Seattle Seahawks': 'Seahawks-icon.png',
    'Tampa Bay Bucs': 'Buccaneers-icon.png',
    'Tampa Bay Buccaneers': 'Buccaneers-icon.png',
    'Tennessee Titans': 'Titans-icon.png',
    'Washington Commanders': 'Redskins-icon.png'
  }

  const getAbbrev = (name) => {
    if (!name) return ''
    return name
      .split(' ')
      .filter(Boolean)
      .map(word => word[0])
      .join('')
      .slice(0, 3)
      .toUpperCase()
  }

  const getHelmetSrc = (name) => {
    const file = helmetMap[name]
    return file ? `/helmets/${file}` : null
  }

  useEffect(() => {
    // client-only: load mock games
    setGames(mockGames)
    // compute standings from local picks
    const s = computeStandingsFromLocal()
    setStandings(s)
  }, [])

  useEffect(() => {
    if (!weeks.length) return
    if (!weeks.includes(selectedWeek)) setSelectedWeek(weeks[0])
  }, [weeks, selectedWeek])

  useEffect(() => {
    // fetch existing picks for logged-in user (if token)
    async function loadPicks() {
      try {
        if (!token) return;
        const res = await fetch('/api/picks_user', { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const data = await res.json();
        // data expected: [{ game_id, picked_team, confidence }]
        const map = {};
        data.forEach(p => { map[p.game_id] = { picked_team: p.picked_team, confidence: p.confidence } });
        setLocalPicks(map);
      } catch (e) {}
    }
    loadPicks();
  }, [user])

  useEffect(() => {
    if (token) localStorage.setItem('pool_token', token)
    else localStorage.removeItem('pool_token')
  }, [token])

  useEffect(() => {
    if (user) localStorage.setItem('pool_user', JSON.stringify(user))
    else localStorage.removeItem('pool_user')
  }, [user])

  useEffect(() => {
    localStorage.setItem('pool_tiebreaker', JSON.stringify(tiebreaker))
  }, [tiebreaker])

  // client-only simple register/login (no server)
  const register = () => {
    const users = JSON.parse(localStorage.getItem('pool_users') || '[]')
    if (!authName) return alert('enter name')
    const id = (users[users.length-1]?.id || 0) + 1
    const user = { id, name: authName }
    users.push(user)
    localStorage.setItem('pool_users', JSON.stringify(users))
    setUser(user)
    setToken('local_'+id)
    setAuthName('')
    setAuthPassword('')
  }

  const login = () => {
    const users = JSON.parse(localStorage.getItem('pool_users') || '[]')
    const found = users.find(u => u.name === authName)
    if (!found) return alert('user not found')
    setUser(found)
    setToken('local_'+found.id)
    setAuthName('')
    setAuthPassword('')
  }

  const logout = () => {
    setUser(null)
    setToken(null)
  }

  const createLegacyUser = () => {
    const users = JSON.parse(localStorage.getItem('pool_users') || '[]')
    if (!name) return alert('enter name')
    const id = (users[users.length-1]?.id || 0) + 1
    const user = { id, name }
    users.push(user)
    localStorage.setItem('pool_users', JSON.stringify(users))
    setUser(user)
  }
  const submitPickToServer = async (gameId, pick) => {
    // client-only: persist pick to localStorage
    if (!user) return { ok: false, error: 'login required' }
    const key = `picks_${user.id}`
    const picks = JSON.parse(localStorage.getItem(key) || '[]')
    // remove same confidence from other picks
    if (pick.confidence) {
      for (const p of picks) { if (p.confidence === pick.confidence && p.game_id !== gameId) p.confidence = null }
    }
    const existingIndex = picks.findIndex(p => p.game_id === gameId)
    if (existingIndex >= 0) picks[existingIndex] = { game_id: gameId, picked_team: pick.picked_team, confidence: pick.confidence }
    else picks.push({ game_id: gameId, picked_team: pick.picked_team, confidence: pick.confidence })
    localStorage.setItem(key, JSON.stringify(picks))
    return { ok: true }
  }

  const computeStandingsFromLocal = () => {
    const users = JSON.parse(localStorage.getItem('pool_users') || '[]')
    const rows = users.map(u => ({ user_id: u.id, name: u.name, score: 0 }))
    for (const u of users) {
      const picks = JSON.parse(localStorage.getItem(`picks_${u.id}`) || '[]')
      let score = 0
      for (const p of picks) {
        const g = mockGames.find(m => m.id === p.game_id)
        if (g && g.result_set) {
          const winner = g.home_score > g.away_score ? g.home : (g.away_score > g.home_score ? g.away : null)
          if (winner && p.picked_team === winner) score++
        }
      }
      const row = rows.find(r => r.user_id === u.id)
      if (row) row.score = score
    }
    return rows.sort((a,b) => b.score - a.score)
  }

  const setPickWithConfidence = (gameId, team, confidence) => {
    const parsed = confidence ? parseInt(confidence, 10) : null
    setLocalPicks(prev => {
      const next = { ...prev }
      if (parsed) {
        Object.keys(next).forEach(id => {
          if (parseInt(id, 10) !== gameId && next[id]?.confidence === parsed) {
            next[id] = { ...next[id], confidence: null }
          }
        })
      }
      next[gameId] = { ...(next[gameId] || {}), picked_team: team, confidence: parsed }
      return next
    })
  }

  const updateTiebreaker = (value) => {
    setTiebreaker(prev => ({ ...prev, [week]: value }))
  }

  const reorderGames = (sourceId, targetId) => {
    const fromIndex = weekGames.findIndex(g => g.id === sourceId)
    const toIndex = weekGames.findIndex(g => g.id === targetId)
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return
    const reorderedWeek = [...weekGames]
    const [moved] = reorderedWeek.splice(fromIndex, 1)
    reorderedWeek.splice(toIndex, 0, moved)
    const weekIndexes = games.reduce((acc, game, idx) => {
      if (game.week === week) acc.push(idx)
      return acc
    }, [])
    const nextGames = [...games]
    weekIndexes.forEach((idx, i) => { nextGames[idx] = reorderedWeek[i] })
    setGames(nextGames)
    setLocalPicks(prev => {
      const next = { ...prev }
      const weekPoints = Array.from({ length: reorderedWeek.length }, (_, i) => 16 - i)
      reorderedWeek.forEach((game, index) => {
        const pick = next[game.id]
        if (pick?.picked_team) {
          next[game.id] = { ...pick, confidence: weekPoints[index] }
        } else if (pick) {
          next[game.id] = { ...pick, confidence: null }
        }
      })
      return next
    })
  }

  const handleRowDragStart = (e, gameId) => {
    e.dataTransfer.setData('text/plain', String(gameId))
    e.dataTransfer.effectAllowed = 'move'
    const handle = e.currentTarget.querySelector?.('.drag-handle') || e.currentTarget
    e.dataTransfer.setDragImage(handle, 10, 10)
    setDraggedGameId(gameId)
    dragStateRef.current.draggedId = gameId
  }

  const handleListDragOver = (e) => {
    e.preventDefault()
    const sourceId = dragStateRef.current.draggedId
    if (!sourceId) return
    const list = listRef.current
    if (!list) return
    const hovered = e.target.closest('li.picksheet-item')
    if (!hovered) return
    const targetId = parseInt(hovered.dataset.gameId, 10)
    if (!targetId || targetId === sourceId) return
    setDragOverGameId(targetId)
  }

  const handleRowDrop = (e, targetGameId) => {
    e.preventDefault()
    const sourceId = parseInt(e.dataTransfer.getData('text/plain'), 10)
    if (!sourceId || sourceId === targetGameId) {
      setDraggedGameId(null)
      setDragOverGameId(null)
      return
    }
    reorderGames(sourceId, targetGameId)
    if (dragStateRef.current.hoverTimer) clearTimeout(dragStateRef.current.hoverTimer)
    dragStateRef.current.pendingTargetId = null
    setDraggedGameId(null)
    setDragOverGameId(null)
  }

  const handleRowDragEnd = () => {
    if (dragStateRef.current.hoverTimer) clearTimeout(dragStateRef.current.hoverTimer)
    dragStateRef.current = { pendingTargetId: null, hoverTimer: null, draggedId: null }
    setDraggedGameId(null)
    setDragOverGameId(null)
  }

  const renderTeamIcon = (team, selected) => {
    const src = getHelmetSrc(team)
    return (
      <span
        className={`team-icon ${selected ? 'selected' : ''}`}
        title={team}
      >
        {src ? <img src={src} alt={`${team} helmet`} /> : <span className="team-tag-text">{getAbbrev(team)}</span>}
      </span>
    )
  }

  const savePick = async (gameId) => {
    const pick = localPicks[gameId]
    if (!pick || !pick.picked_team) return alert('pick a team first')
    const res = await submitPickToServer(gameId, pick)
    if (res.ok) alert('pick saved')
    else alert(res.error || 'save failed')
    // refresh standings
    fetch('/api/standings').then(r => r.json()).then(setStandings)
  }

  const saveAll = async () => {
    if (!user) return alert('login first')
    const weekTiebreaker = tiebreaker[week]
    if (weekGames.length > 0 && (weekTiebreaker === undefined || weekTiebreaker === null || weekTiebreaker === '')) {
      return alert('enter tiebreaker before saving')
    }
    const ids = Object.keys(localPicks)
    for (const id of ids) {
      const pick = localPicks[id]
      if (!pick || !pick.picked_team) continue
      const res = await submitPickToServer(id, pick)
      if (!res.ok) alert(`Error saving ${id}: ${res.error}`)
    }
    alert('all saved')
    fetch('/api/standings').then(r => r.json()).then(setStandings)
  }

  return (
    <div className="app">
      <div className="app-shell">
        <header className="page-header">
          <h1>B4TheGame Confidence Pool</h1>
          <div className="week-picker">
            <label htmlFor="week-select">Select a week:</label>
            <select id="week-select" value={week} onChange={(e) => setSelectedWeek(parseInt(e.target.value, 10))}>
              {weeks.map(value => (
                <option key={`week-${value}`} value={value}>Week {value}</option>
              ))}
            </select>
          </div>
        </header>

        <section className="account-wrap">
          <h2>Account</h2>
          {user ? (
            <div className="account-row">
              <div>
                Signed in as <strong>{user.name}</strong>
                <span className="muted"> · id {user.id}</span>
              </div>
              <button className="button button--ghost" onClick={logout}>Logout</button>
            </div>
          ) : (
            <div className="stack">
              <div className="form-row">
                <input placeholder="Name" value={authName} onChange={e => setAuthName(e.target.value)} />
                <input placeholder="Password" type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} />
                <button className="button" onClick={login}>Login</button>
                <button className="button button--ghost" onClick={register}>Register</button>
              </div>
              <div className="legacy">
                <em className="muted">Or create a legacy player (no password)</em>
                <div className="form-row">
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
                  <button className="button" onClick={createLegacyUser}>Create</button>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="table-wrap">
          <div className="table-actions">
            <button className="button" onClick={saveAll}>Save All Picks</button>
          </div>

          <div className="picksheet-grid">
            <ul
              className="picksheet-list"
              ref={listRef}
              onDragOver={handleListDragOver}
              onDragLeave={() => setDragOverGameId(null)}
            >
              <li className="picksheet-header">
                <span>Points</span>
                <span>Away Team</span>
                <span>Home Team</span>
                <span>Drag</span>
              </li>
              {weekGames.map((g, index) => {
                const pick = localPicks[g.id] || {}
                const rowPoints = points[index] || ''
                const rowClassName = [
                  'picksheet-item',
                  draggedGameId === g.id ? 'is-dragging' : '',
                  dragOverGameId === g.id ? 'is-over' : ''
                ].filter(Boolean).join(' ')
                return (
                  <li
                    key={g.id}
                    data-game-id={g.id}
                    className={rowClassName}
                    onDrop={(e) => handleRowDrop(e, g.id)}
                    onDragEnd={handleRowDragEnd}
                  >
                    <div className="points-stack">{rowPoints}</div>
                    <div
                      className="team-box away-box"
                      role="button"
                      tabIndex={0}
                      onClick={() => setPickWithConfidence(g.id, g.away, rowPoints)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setPickWithConfidence(g.id, g.away, rowPoints)
                        }
                      }}
                    >
                      <input
                        type="radio"
                        name={`pick-${g.id}`}
                        checked={pick.picked_team === g.away}
                        onChange={() => setPickWithConfidence(g.id, g.away, rowPoints)}
                      />
                      {renderTeamIcon(g.away, pick.picked_team === g.away)}
                      <div className="team-text">
                        <div className="team-name">
                          {g.away} <span className="team-record">(0-0)</span>
                        </div>
                      </div>
                    </div>
                    <div
                      className="team-box home-box"
                      role="button"
                      tabIndex={0}
                      onClick={() => setPickWithConfidence(g.id, g.home, rowPoints)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setPickWithConfidence(g.id, g.home, rowPoints)
                        }
                      }}
                    >
                      <input
                        type="radio"
                        name={`pick-${g.id}`}
                        checked={pick.picked_team === g.home}
                        onChange={() => setPickWithConfidence(g.id, g.home, rowPoints)}
                      />
                      {renderTeamIcon(g.home, pick.picked_team === g.home)}
                      <div className="team-text">
                        <div className="team-name">
                          {g.home} <span className="team-record">(0-0)</span>
                        </div>
                      </div>
                    </div>
                    <div className="drag-slot">
                      <button
                        type="button"
                        className="drag-handle"
                        draggable
                        onDragStart={(e) => handleRowDragStart(e, g.id)}
                        onDragEnd={handleRowDragEnd}
                        aria-label="Drag to reorder"
                      >
                        ⋮⋮
                      </button>
                      <div className="game-time">{g.kickoff || 'TBD'}</div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
          {weekGames.length > 0 && (
            <div className="tiebreaker">
              <span className="tiebreaker-label">
                Tiebreak (combined points in {weekGames[weekGames.length - 1].away}/{weekGames[weekGames.length - 1].home} game*):
              </span>
              <input
                className="tiebreaker-input"
                type="number"
                min="0"
                inputMode="numeric"
                value={tiebreaker[week] ?? ''}
                onChange={(e) => updateTiebreaker(e.target.value)}
              />
              <span className="tiebreaker-time">{weekGames[weekGames.length - 1].kickoff || 'TBD'}</span>
            </div>
          )}
          <div className="section-footer">
            <button className="button" onClick={saveAll}>Save All Picks</button>
          </div>
        </section>
      </div>
    </div>
  )
}
