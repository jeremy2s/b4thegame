import React, { useEffect, useRef, useState } from 'react'
import mockGames from './data/games'
import { supabase, supabaseEnabled } from './supabaseClient'

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
  const [activeView, setActiveView] = useState('picks') // 'picks' | 'standings'
  const [standingsTab, setStandingsTab] = useState('overall') // 'overall' | 'scenarios'
  const [selectedWeek, setSelectedWeek] = useState(1)
  const [allUsers, setAllUsers] = useState([])
  const [standingsSelectedUserId, setStandingsSelectedUserId] = useState(null)
  const [userHistory, setUserHistory] = useState([])
  const [weeklyGrid, setWeeklyGrid] = useState({}) // { user_id: { gameId: pick }}
  const [scenarioOutcomes, setScenarioOutcomes] = useState({}) // { gameId: team }
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
  const logoMap = {
    'Arizona Cardinals': 'https://static.www.nfl.com/league/api/clubs/logos/ARI',
    'Atlanta Falcons': 'https://static.www.nfl.com/league/api/clubs/logos/atlanta-falcons.svg',
    'Baltimore Ravens': 'https://static.www.nfl.com/league/api/clubs/logos/baltimore-ravens.svg',
    'Buffalo Bills': 'https://static.www.nfl.com/league/api/clubs/logos/buffalo-bills.svg',
    'Carolina Panthers': 'https://static.www.nfl.com/league/api/clubs/logos/carolina-panthers.svg',
    'Chicago Bears': 'https://static.www.nfl.com/league/api/clubs/logos/chicago-bears.svg',
    'Cincinnati Bengals': 'https://static.www.nfl.com/league/api/clubs/logos/cincinnati-bengals.svg',
    'Cleveland Browns': 'https://static.www.nfl.com/league/api/clubs/logos/cleveland-browns.svg',
    'Dallas Cowboys': 'https://static.www.nfl.com/league/api/clubs/logos/dallas-cowboys.svg',
    'Denver Broncos': 'https://static.www.nfl.com/league/api/clubs/logos/denver-broncos.svg',
    'Detroit Lions': 'https://static.www.nfl.com/league/api/clubs/logos/detroit-lions.svg',
    'Green Bay Packers': 'https://static.www.nfl.com/league/api/clubs/logos/GB',
    'Houston Texans': 'https://static.www.nfl.com/league/api/clubs/logos/houston-texans.svg',
    'Indianapolis Colts': 'https://static.www.nfl.com/league/api/clubs/logos/indianapolis-colts.svg',
    'Jacksonville Jaguars': 'https://static.www.nfl.com/league/api/clubs/logos/jacksonville-jaguars.svg',
    'Kansas City Chiefs': 'https://static.www.nfl.com/league/api/clubs/logos/kansas-city-chiefs.svg',
    'Los Angeles Chargers': 'https://static.www.nfl.com/league/api/clubs/logos/los-angeles-chargers.svg',
    'Los Angeles Rams': 'https://static.www.nfl.com/league/api/clubs/logos/los-angeles-rams.svg',
    'L.A. Chargers': 'https://static.www.nfl.com/league/api/clubs/logos/los-angeles-chargers.svg',
    'L.A. Rams': 'https://static.www.nfl.com/league/api/clubs/logos/los-angeles-rams.svg',
    'Las Vegas Raiders': 'https://static.www.nfl.com/league/api/clubs/logos/las-vegas-raiders.svg',
    'Miami Dolphins': 'https://static.www.nfl.com/league/api/clubs/logos/miami-dolphins.svg',
    'Minnesota Vikings': 'https://static.www.nfl.com/league/api/clubs/logos/minnesota-vikings.svg',
    'New England Patriots': 'https://static.www.nfl.com/league/api/clubs/logos/new-england-patriots.svg',
    'New Orleans Saints': 'https://static.www.nfl.com/league/api/clubs/logos/new-orleans-saints.svg',
    'New York Giants': 'https://static.www.nfl.com/league/api/clubs/logos/new-york-giants.svg',
    'New York Jets': 'https://static.www.nfl.com/league/api/clubs/logos/new-york-jets.svg',
    'Philadelphia Eagles': 'https://static.www.nfl.com/league/api/clubs/logos/philadelphia-eagles.svg',
    'Pittsburgh Steelers': 'https://static.www.nfl.com/league/api/clubs/logos/pittsburgh-steelers.svg',
    'San Francisco 49ers': 'https://static.www.nfl.com/league/api/clubs/logos/san-francisco-49ers.svg',
    'Seattle Seahawks': 'https://static.www.nfl.com/league/api/clubs/logos/seattle-seahawks.svg',
    'Tampa Bay Bucs': 'https://static.www.nfl.com/league/api/clubs/logos/tampa-bay-buccaneers.svg',
    'Tampa Bay Buccaneers': 'https://static.www.nfl.com/league/api/clubs/logos/tampa-bay-buccaneers.svg',
    'Tennessee Titans': 'https://static.www.nfl.com/league/api/clubs/logos/tennessee-titans.svg',
    'Washington Commanders': 'https://static.www.nfl.com/league/api/clubs/logos/washington-commanders.svg'
  }

  const abbrevMap = {
    'Arizona Cardinals': 'ARZ',
    'Atlanta Falcons': 'ATL',
    'Baltimore Ravens': 'BAL',
    'Buffalo Bills': 'BUF',
    'Carolina Panthers': 'CAR',
    'Chicago Bears': 'CHI',
    'Cincinnati Bengals': 'CIN',
    'Cleveland Browns': 'CLE',
    'Dallas Cowboys': 'DAL',
    'Denver Broncos': 'DEN',
    'Detroit Lions': 'DET',
    'Green Bay Packers': 'GBP',
    'Houston Texans': 'HOU',
    'Indianapolis Colts': 'IND',
    'Jacksonville Jaguars': 'JAX',
    'Kansas City Chiefs': 'KC',
    'Los Angeles Chargers': 'LAC',
    'Los Angeles Rams': 'LAR',
    'L.A. Chargers': 'LAC',
    'L.A. Rams': 'LAR',
    'Las Vegas Raiders': 'LV',
    'Miami Dolphins': 'MIA',
    'Minnesota Vikings': 'MIN',
    'New England Patriots': 'NE',
    'New Orleans Saints': 'NO',
    'New York Giants': 'NYG',
    'New York Jets': 'NYJ',
    'Philadelphia Eagles': 'PHI',
    'Pittsburgh Steelers': 'PIT',
    'San Francisco 49ers': 'SF',
    'Seattle Seahawks': 'SEA',
    'Tampa Bay Bucs': 'TB',
    'Tampa Bay Buccaneers': 'TB',
    'Tennessee Titans': 'TEN',
    'Washington Commanders': 'WSH'
  }

  const getTeamAbbrev = (name) => {
    if (!name) return ''
    if (abbrevMap[name]) return String(abbrevMap[name])
    // fallback: build a 3-letter abbrev from words
    const raw = name.split(' ').filter(Boolean).slice(-1)[0] || name
    return raw.slice(0,3).toUpperCase()
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

  const getLogoSrc = (name) => {
    const file = logoMap[name]
    if (!file) return null
    // if the map value is already an absolute URL, return it unchanged
    if (/^https?:\/\//i.test(file)) return file
    // otherwise assume it's a local filename placed under /logos/
    return `/logos/${file}`
  }

  useEffect(() => {
    // try to load games from server; if unavailable, use mockGames and push them to server
    async function initGames() {
      if (supabaseEnabled) {
        try {
          const { data, error } = await supabase.from('games').select('*').order('id', { ascending: true })
          if (!error && Array.isArray(data) && data.length) {
            setGames(data)
            return
          }
          setGames(mockGames)
          await supabase.from('games').upsert(mockGames, { onConflict: 'id' })
          return
        } catch (e) {
          setGames(mockGames)
          return
        }
      }
      try {
        const res = await fetch('http://localhost:3000/api/games');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length) {
            setGames(data);
            try {
              const sres = await fetch('http://localhost:3000/api/standings');
              if (sres.ok) {
                const sdata = await sres.json();
                setStandings(sdata);
                return;
              }
            } catch (e) {}
            setStandings(computeStandingsFromLocal());
            return;
          }
        }
      } catch (e) {
        // server unreachable
      }
      // fallback: client mock games
      setGames(mockGames)
      setStandings(computeStandingsFromLocal())
      // try to populate server with mock games (best-effort)
      try {
        await fetch('http://localhost:3000/api/games', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(mockGames) })
      } catch (e) {}
    }
    initGames()
  }, [])

  // load users and standings (server-first or supabase)
  useEffect(() => {
    async function loadUsersAndStandings() {
      if (supabaseEnabled) {
        try {
          const { data: usersData } = await supabase.from('users').select('*').order('id', { ascending: true })
          const { data: picksData } = await supabase.from('picks').select('*')
          const users = Array.isArray(usersData) ? usersData : []
          const picks = Array.isArray(picksData) ? picksData : []
          setAllUsers(users)
          if (!standingsSelectedUserId && users.length) setStandingsSelectedUserId(users[0].id)
          if (games.length) {
            setStandings(computeStandingsFromData(users, picks, games))
          }
          return
        } catch (e) {
          // fall through to local/server
        }
      }
      let users = []
      try {
        const res = await fetch('http://localhost:3000/api/users')
        if (res.ok) users = await res.json()
      } catch (e) {
        // fallback to local users
        users = JSON.parse(localStorage.getItem('pool_users') || '[]')
      }
      setAllUsers(users)
      if (!standingsSelectedUserId && users.length) setStandingsSelectedUserId(users[0].id)

      try {
        const sres = await fetch('http://localhost:3000/api/standings')
        if (sres.ok) {
          const s = await sres.json()
          setStandings(s)
          return
        }
      } catch (e) {}
      setStandings(computeStandingsFromLocal())
    }
    if (supabaseEnabled && !games.length) return
    loadUsersAndStandings()
  }, [games])

  useEffect(() => {
    if (!standingsSelectedUserId) return
    async function loadHistory() {
      if (supabaseEnabled && games.length) {
        try {
          const { data } = await supabase.from('picks').select('*').eq('user_id', standingsSelectedUserId)
          setUserHistory(buildUserHistoryFromData(data || [], games))
          return
        } catch (e) {
          // fall through
        }
      }
      try {
        const res = await fetch(`http://localhost:3000/api/user_history?user_id=${standingsSelectedUserId}`)
        if (res.ok) {
          const data = await res.json()
          setUserHistory(data)
          return
        }
      } catch (e) {
        // server not available
      }
      // fallback: build from localStorage
      const picks = JSON.parse(localStorage.getItem(`picks_${standingsSelectedUserId}`) || '[]')
      const local = picks.map(p => {
        const g = mockGames.find(m => m.id === p.game_id) || null
        const winner = g && typeof g.home_score === 'number' && typeof g.away_score === 'number'
          ? (g.home_score > g.away_score ? g.home : (g.away_score > g.home_score ? g.away : null))
          : null
        const correct = winner ? (p.picked_team === winner) : null
        const pointsEarned = correct ? (p.confidence == null ? 1 : Number(p.confidence)) : 0
        return { ...p, game: g ? { id: g.id, week: g.week, home: g.home, away: g.away, kickoff: g.kickoff, home_score: g.home_score, away_score: g.away_score } : null, winner, correct, pointsEarned }
      })
      setUserHistory(local)
    }
    loadHistory()
  }, [standingsSelectedUserId, games])

  useEffect(() => {
    // when switching to weekly view, fetch picks for all users for the selected week
    async function loadWeekly() {
      if (activeView !== 'weekly' && !(activeView === 'standings' && standingsTab === 'scenarios')) return
      if (supabaseEnabled && games.length) {
        try {
          const { data: picksData } = await supabase.from('picks').select('*')
          setWeeklyGrid(buildWeeklyGridFromPicks(picksData || [], games, selectedWeek))
          return
        } catch (e) {
          // fall through
        }
      }
      const users = allUsers || []
      const map = {}
      await Promise.all(users.map(async u => {
        try {
          const res = await fetch(`http://localhost:3000/api/picks?user_id=${u.id}`)
          if (res.ok) {
            const picks = await res.json()
            const byGame = {}
            for (const p of picks) byGame[String(p.game_id)] = p
            map[u.id] = byGame
            return
          }
        } catch (e) {}
        // fallback: localStorage
        const picks = JSON.parse(localStorage.getItem(`picks_${u.id}`) || '[]')
        const byGame = {}
        for (const p of picks) byGame[String(p.game_id)] = p
        map[u.id] = byGame
      }))
      setWeeklyGrid(map)
    }
    loadWeekly()
  }, [activeView, standingsTab, allUsers, selectedWeek, games])

  useEffect(() => {
    if (!weeks.length) return
    if (!weeks.includes(selectedWeek)) setSelectedWeek(weeks[0])
  }, [weeks, selectedWeek])

  useEffect(() => {
    setScenarioOutcomes(prev => {
      const next = { ...prev }
      for (const game of weekGames) {
        let winner = null
        if (typeof game.home_score === 'number' && typeof game.away_score === 'number') {
          winner = game.home_score > game.away_score ? game.home : (game.away_score > game.home_score ? game.away : null)
        }
        if (winner) next[game.id] = winner
        else if (!(game.id in next)) next[game.id] = null
      }
      return next
    })
  }, [weekGames])

  useEffect(() => {
    // fetch existing picks for logged-in user (if token)
    async function loadPicks() {
      try {
        if (!user) return;
        if (supabaseEnabled) {
          const { data } = await supabase.from('picks').select('*').eq('user_id', user.id)
          const map = {}
          ;(data || []).forEach(p => { map[p.game_id] = { picked_team: p.picked_team, confidence: p.confidence } })
          setLocalPicks(map)
          return
        }
        // try server first
        try {
          const res = await fetch(`http://localhost:3000/api/picks?user_id=${user.id}`);
          if (res.ok) {
            const data = await res.json();
            const map = {};
            data.forEach(p => { map[p.game_id] = { picked_team: p.picked_team, confidence: p.confidence } });
            setLocalPicks(map);
            return;
          }
        } catch (e) {
          // server not available, fall through to localStorage
        }
        // fallback: load from localStorage
        const key = `picks_${user.id}`
        const picks = JSON.parse(localStorage.getItem(key) || '[]')
        const map = {}
        picks.forEach(p => { map[p.game_id] = { picked_team: p.picked_team, confidence: p.confidence } })
        setLocalPicks(map)
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

  // register/login - prefer server, fallback to localStorage
  const register = async () => {
    if (!authName) return alert('enter name')
    if (supabaseEnabled) {
      try {
        const { data, error } = await supabase.from('users').insert({ username: authName }).select().single()
        if (!error && data) {
          setUser({ id: data.id, name: data.username })
          setAuthName('')
          setAuthPassword('')
          return
        }
      } catch (e) {
        // fall through
      }
    }
    try {
      const res = await fetch('http://localhost:3000/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: authName }) })
      if (res.ok) {
        const u = await res.json()
        // keep a local users list for client convenience
        const users = JSON.parse(localStorage.getItem('pool_users') || '[]')
        users.push({ id: u.id, name: u.username })
        localStorage.setItem('pool_users', JSON.stringify(users))
        setUser({ id: u.id, name: u.username })
        setAuthName('')
        setAuthPassword('')
        return
      }
    } catch (e) {
      // server not available, fall back to local
    }
    const users = JSON.parse(localStorage.getItem('pool_users') || '[]')
    const id = (users[users.length-1]?.id || 0) + 1
    const nu = { id, name: authName }
    users.push(nu)
    localStorage.setItem('pool_users', JSON.stringify(users))
    setUser(nu)
    setAuthName('')
    setAuthPassword('')
  }

  const login = async () => {
    if (!authName) return alert('enter name')
    if (supabaseEnabled) {
      try {
        const { data, error } = await supabase.from('users').select('*').eq('username', authName).single()
        if (!error && data) {
          setUser({ id: data.id, name: data.username })
          setAuthName('')
          setAuthPassword('')
          return
        }
      } catch (e) {
        // fall through
      }
    }
    try {
      const res = await fetch(`http://localhost:3000/api/users?username=${encodeURIComponent(authName)}`)
      if (res.ok) {
        const u = await res.json()
        setUser({ id: u.id, name: u.username })
        setAuthName('')
        setAuthPassword('')
        return
      }
    } catch (e) {
      // server unavailable - try local
    }
    const users = JSON.parse(localStorage.getItem('pool_users') || '[]')
    const found = users.find(u => u.name === authName)
    if (!found) return alert('user not found')
    setUser(found)
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
    if (!user) return { ok: false, error: 'login required' }
    if (supabaseEnabled) {
      try {
        const { data, error } = await supabase
          .from('picks')
          .upsert(
            {
              user_id: user.id,
              game_id: gameId,
              picked_team: pick.picked_team,
              confidence: pick.confidence
            },
            { onConflict: 'user_id,game_id' }
          )
          .select()
          .single()
        if (!error && data) {
          setLocalPicks(prev => ({ ...prev, [gameId]: { picked_team: data.picked_team, confidence: data.confidence } }))
          const usersForStandings = allUsers.length
            ? allUsers
            : (await supabase.from('users').select('*').order('id', { ascending: true })).data || []
          const picksData = (await supabase.from('picks').select('*')).data || []
          if (games.length) {
            setStandings(computeStandingsFromData(usersForStandings, picksData, games))
          }
          if (standingsSelectedUserId && String(standingsSelectedUserId) === String(user.id)) {
            const userPicks = picksData.filter(p => String(p.user_id) === String(user.id))
            setUserHistory(buildUserHistoryFromData(userPicks, games))
          }
          return { ok: true }
        }
      } catch (e) {
        // fall through to server/local
      }
    }
    // try server
    try {
      const body = { user_id: user.id, game_id: gameId, picked_team: pick.picked_team, confidence: pick.confidence }
      const res = await fetch('http://localhost:3000/api/picks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) {
        const saved = await res.json()
        // reflect server pick in local state
        setLocalPicks(prev => ({ ...prev, [gameId]: { picked_team: saved.picked_team, confidence: saved.confidence } }))
        // refresh standings
        fetch('http://localhost:3000/api/standings').then(r => r.json()).then(setStandings).catch(() => setStandings(computeStandingsFromLocal()))
        // if selected user's history or current user, refresh history
        if (standingsSelectedUserId && String(standingsSelectedUserId) === String(user.id)) {
          fetch(`http://localhost:3000/api/user_history?user_id=${standingsSelectedUserId}`).then(r => r.json()).then(setUserHistory).catch(() => {})
        }
        return { ok: true }
      }
    } catch (e) {
      // server not available, fall back to localStorage
    }
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
    setLocalPicks(prev => ({ ...prev, [gameId]: { picked_team: pick.picked_team, confidence: pick.confidence } }))
    // local fallback: refresh local standings and history if relevant
    setStandings(computeStandingsFromLocal())
    if (standingsSelectedUserId && String(standingsSelectedUserId) === String(user.id)) {
      const key = `picks_${standingsSelectedUserId}`
      const picks = JSON.parse(localStorage.getItem(key) || '[]')
      const local = picks.map(p => {
        const g = mockGames.find(m => m.id === p.game_id) || null
        const winner = g && typeof g.home_score === 'number' && typeof g.away_score === 'number'
          ? (g.home_score > g.away_score ? g.home : (g.away_score > g.home_score ? g.away : null))
          : null
        const correct = winner ? (p.picked_team === winner) : null
        const pointsEarned = correct ? (p.confidence == null ? 1 : Number(p.confidence)) : 0
        return { ...p, game: g ? { id: g.id, week: g.week, home: g.home, away: g.away, kickoff: g.kickoff, home_score: g.home_score, away_score: g.away_score } : null, winner, correct, pointsEarned }
      })
      setUserHistory(local)
    }
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

  const computeStandingsFromData = (users, picks, games) => {
    const rows = (users || []).map(u => ({
      user_id: u.id,
      name: u.username || u.name,
      wins: 0,
      losses: 0,
      possible: 0,
      points: 0
    }))
    for (const p of picks || []) {
      const game = games.find(g => String(g.id) === String(p.game_id))
      const row = rows.find(r => String(r.user_id) === String(p.user_id))
      if (!row || !game) continue
      const conf = p.confidence == null ? 1 : Number(p.confidence)
      if (typeof game.home_score !== 'number' || typeof game.away_score !== 'number') {
        row.possible += conf
        continue
      }
      let winner = null
      if (game.home_score > game.away_score) winner = game.home
      else if (game.away_score > game.home_score) winner = game.away
      if (!winner) {
        row.possible += conf
        continue
      }
      if (p.picked_team === winner) {
        row.wins += 1
        row.points += conf
      } else if (p.picked_team) {
        row.losses += 1
      }
    }
    return rows
      .sort((a, b) => b.points - a.points)
      .map(r => ({
        user_id: r.user_id,
        name: r.name,
        score: r.points,
        wins: r.wins,
        losses: r.losses,
        possible: r.possible,
        points: r.points
      }))
  }

  const buildWeeklyGridFromPicks = (picks, games, weekValue) => {
    const weekIds = new Set(games.filter(g => g.week === weekValue).map(g => g.id))
    const map = {}
    for (const p of picks || []) {
      if (!weekIds.has(p.game_id)) continue
      if (!map[p.user_id]) map[p.user_id] = {}
      map[p.user_id][String(p.game_id)] = p
    }
    return map
  }

  const buildUserHistoryFromData = (picks, games) => {
    return (picks || []).map(p => {
      const g = games.find(m => String(m.id) === String(p.game_id)) || null
      const winner = g && typeof g.home_score === 'number' && typeof g.away_score === 'number'
        ? (g.home_score > g.away_score ? g.home : (g.away_score > g.home_score ? g.away : null))
        : null
      const correct = winner ? (p.picked_team === winner) : null
      const pointsEarned = correct ? (p.confidence == null ? 1 : Number(p.confidence)) : 0
      return {
        ...p,
        game: g ? { id: g.id, week: g.week, home: g.home, away: g.away, kickoff: g.kickoff, home_score: g.home_score, away_score: g.away_score } : null,
        winner,
        correct,
        pointsEarned
      }
    })
  }

  const computeUserStats = (userId) => {
    const picks = JSON.parse(localStorage.getItem(`picks_${userId}`) || '[]')
    let wins = 0
    let losses = 0
    let points = 0
    let possible = 0
    for (const p of picks) {
      const g = games.find(m => m.id === p.game_id)
      const conf = p.confidence == null ? 1 : Number(p.confidence)
      if (g && typeof g.home_score === 'number' && typeof g.away_score === 'number') {
        const winner = g.home_score > g.away_score ? g.home : (g.away_score > g.home_score ? g.away : null)
        if (winner && p.picked_team === winner) { wins++; points += conf }
        else if (winner && p.picked_team) { losses++; }
      } else {
        // game pending
        possible += conf
      }
    }
    return { wins, losses, possible, points }
  }

  const getActualWinner = (game) => {
    if (!game) return null
    if (typeof game.home_score === 'number' && typeof game.away_score === 'number') {
      if (game.home_score > game.away_score) return game.home
      if (game.away_score > game.home_score) return game.away
    }
    return null
  }

  const buildScenarioRows = () => {
    const rows = (allUsers || []).map(u => {
      const picksMap = weeklyGrid[u.id] || {}
      let current = 0
      let remaining = 0
      for (const game of weekGames) {
        const pick = picksMap[String(game.id)]
        if (!pick || !pick.picked_team) continue
        const conf = pick.confidence == null ? 1 : Number(pick.confidence)
        const actualWinner = getActualWinner(game)
        if (actualWinner) {
          if (pick.picked_team === actualWinner) current += conf
        } else {
          const scenarioWinner = scenarioOutcomes[game.id]
          if (scenarioWinner && pick.picked_team === scenarioWinner) remaining += conf
        }
      }
      return {
        user_id: u.id,
        name: u.username || u.name,
        current,
        remaining,
        projected: current + remaining
      }
    })
    return rows.sort((a, b) => b.projected - a.projected)
  }

  const setPickWithConfidence = (gameId, team, confidence) => {
    const parsed = confidence ? parseInt(confidence, 10) : null
    // update local state and persist immediately
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
    const pickToSave = { picked_team: team, confidence: parsed }
    submitPickToServer(gameId, pickToSave).then(() => {
      if (supabaseEnabled) return
      // refresh standings from server if available
      fetch('http://localhost:3000/api/standings').then(r => r.json()).then(setStandings).catch(() => setStandings(computeStandingsFromLocal()))
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
    const mapped = logoMap[team]
    const local = getLogoSrc(team)
    const teamCdnBase = 'https://static.www.nfl.com/h_40,w_40,q_auto,f_auto,dpr_2.0/league/api/clubs/logos'
    const cdnCodeOverrides = {
      'Washington Commanders': 'WAS',
      'Green Bay Packers': 'GB',
      'Arizona Cardinals': 'ARI'
    }
    const code = (cdnCodeOverrides[team] || abbrevMap[team] || getTeamAbbrev(team) || getAbbrev(team)).toUpperCase()
    const slug = String(team).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const lastWord = String(team).split(' ').filter(Boolean).slice(-1)[0]
    const localFallback = lastWord ? `/logos/${lastWord}-icon.svg` : null

    const candidates = []
    if (mapped) candidates.push(mapped)
    candidates.push(`${teamCdnBase}/${code}`)
    candidates.push(`https://static.www.nfl.com/league/api/clubs/logos/${slug}.svg`)
    if (local) candidates.push(local)
    if (localFallback) candidates.push(localFallback)

    const dataList = JSON.stringify(candidates)
    return (
      <span className={`team-icon ${selected ? 'selected' : ''}`} title={team}>
        <img src={candidates[0]} alt={`${team} logo`} data-srcs={dataList} onError={(e) => {
          try {
            const list = JSON.parse(e.target.dataset.srcs || '[]')
            if (list.length > 1) {
              list.shift()
              e.target.dataset.srcs = JSON.stringify(list)
              e.target.src = list[0]
            } else {
              e.target.remove()
            }
          } catch (err) { e.target.remove() }
        }} />
      </span>
    )
  }

  const savePick = async (gameId) => {
    const pick = localPicks[gameId]
    if (!pick || !pick.picked_team) return alert('pick a team first')
    const res = await submitPickToServer(gameId, pick)
    if (res.ok) alert('pick saved')
    else alert(res.error || 'save failed')
    if (!supabaseEnabled) {
      // refresh standings
      setStandings(computeStandingsFromLocal())
    }
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
    if (supabaseEnabled) {
      const usersData = (await supabase.from('users').select('*').order('id', { ascending: true })).data || []
      const picksData = (await supabase.from('picks').select('*')).data || []
      if (games.length) {
        setStandings(computeStandingsFromData(usersData, picksData, games))
      }
      if (standingsSelectedUserId) {
        const userPicks = picksData.filter(p => String(p.user_id) === String(standingsSelectedUserId))
        setUserHistory(buildUserHistoryFromData(userPicks, games))
      }
    } else {
      // recompute standings from local picks + mock games
      setStandings(computeStandingsFromLocal())
      // refresh history for selected user
      if (standingsSelectedUserId) {
        try {
          const res = await fetch(`http://localhost:3000/api/user_history?user_id=${standingsSelectedUserId}`)
          if (res.ok) setUserHistory(await res.json())
          else setUserHistory([])
        } catch (e) {
          // fallback handled elsewhere
        }
      }
    }
  }

  return (
    <div className="app">
      <div className="app-shell">
        <header className="page-header">
          <h1>B4TheGame Confidence Pool</h1>
          
          <div className="view-tabs">
            <button className={`button ${activeView === 'picks' ? 'is-active' : ''}`} onClick={() => setActiveView('picks')}>My Picks</button>
            <button className={`button ${activeView === 'standings' ? 'is-active' : ''}`} onClick={() => setActiveView('standings')}>Standings</button>
            <button className={`button ${activeView === 'weekly' ? 'is-active' : ''}`} onClick={() => setActiveView('weekly')}>Weekly</button>
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

          <div className="week-picker">
            <label htmlFor="week-select">Select a week:</label>
            <select id="week-select" value={week} onChange={(e) => setSelectedWeek(parseInt(e.target.value, 10))}>
              {weeks.map(value => (
                <option key={`week-${value}`} value={value}>Week {value}</option>
              ))}
            </select>
          </div>
        </section>

        <section className="table-wrap">
          {activeView === 'picks' ? (
            <>
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
            </>
          ) : (
            // Standings view
            <>
              <div className="standings-header">
                <div className="user-tabs">
                  {allUsers.map(u => (
                    <button
                      key={`u-${u.id}`}
                      className={`button ${standingsSelectedUserId === u.id ? 'is-active' : ''}`}
                      onClick={() => setStandingsSelectedUserId(u.id)}
                    >
                      {u.username || u.name}
                    </button>
                  ))}
                </div>
                {activeView === 'standings' && (
                  <div className="standings-tabs">
                    <button
                      className={`button button--small ${standingsTab === 'overall' ? 'is-active' : ''}`}
                      onClick={() => setStandingsTab('overall')}
                    >
                      Overall
                    </button>
                    <button
                      className={`button button--small ${standingsTab === 'scenarios' ? 'is-active' : ''}`}
                      onClick={() => setStandingsTab('scenarios')}
                    >
                      Scenarios
                    </button>
                  </div>
                )}
                <div className="standings-actions">
                  <button className="button" onClick={async () => {
                    if (supabaseEnabled) {
                      const usersData = (await supabase.from('users').select('*').order('id', { ascending: true })).data || []
                      const picksData = (await supabase.from('picks').select('*')).data || []
                      if (games.length) setStandings(computeStandingsFromData(usersData, picksData, games))
                      return
                    }
                    // refresh standings from server if available
                    fetch('http://localhost:3000/api/standings').then(r => r.json()).then(setStandings).catch(() => setStandings(computeStandingsFromLocal()))
                  }}>Refresh</button>
                </div>
              </div>
              <div className="standings-body">
                {activeView === 'weekly' ? (
                  <div className="weekly-view">
                    <div className="weekly-grid">
                      <div className="weekly-scroll">
                        <div className="weekly-row weekly-header">
                        <div className="player-cell header">Games</div>
                        {weekGames.map(g => (
                          <div key={`hg-${g.id}`} className="weekly-cell header" title={`${g.away} @ ${g.home}`}>
                            <div className="game-stack">
                              <div className="game-away">{getTeamAbbrev(g.away)}</div>
                              <div className="game-sep">@</div>
                              <div className="game-home">{getTeamAbbrev(g.home)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {allUsers.map(u => {
                        const picksMap = weeklyGrid[u.id] || {}
                        const r = standings.find(s => String(s.user_id) === String(u.id)) || { points: 0 }
                        return (
                          <div key={`wr-${u.id}`} className="weekly-row">
                              <div className="player-cell">
                                <div className="player-initial">{(u.username||u.name||'').charAt(0) || '?'}</div>
                                <div className="player-meta">
                                  <div className="player-name">{u.username||u.name}</div>
                                  <div className="player-points">{r.points ?? r.score ?? 0} pts</div>
                                </div>
                              </div>
                            {weekGames.map(g => {
                              const p = picksMap[String(g.id)] || null
                              let status = 'pending'
                              if (p && g && typeof g.home_score === 'number' && typeof g.away_score === 'number') {
                                const winner = g.home_score > g.away_score ? g.home : (g.away_score > g.home_score ? g.away : null)
                                if (winner && p.picked_team === winner) status = 'correct'
                                else status = 'wrong'
                              }
                              return (
                                <div key={`wc-${u.id}-${g.id}`} className={`weekly-cell ${status}`}>
                                  <div className="cell-team">
                                    {p ? (
                                              <>
                                                <div className="helmet-wrap">{renderTeamIcon(p.picked_team, false)}</div>
                                                <div className="team-abbrev">{getTeamAbbrev(p.picked_team)}</div>
                                              </>
                                            ) : ''}
                                      </div>
                                      <div className={`cell-conf ${p && p.confidence != null && Number(p.confidence) >= 10 ? 'double' : ''}`}>{p && p.confidence != null ? p.confidence : ''}</div>
                                    </div>
                              )
                            })}
                          </div>
                        )
                      })}
                      </div>
                    </div>
                  </div>
                ) : standingsTab === 'scenarios' ? (
                  <div className="scenario-view">
                    <div className="scenario-card">
                      <div className="scenario-header">
                        <div>
                          <div className="scenario-title">Scenario Outcomes</div>
                          <div className="muted">Choose winners for the remaining games to project week totals.</div>
                        </div>
                        <button
                          className="button button--small"
                          onClick={() => {
                            setScenarioOutcomes(prev => {
                              const next = { ...prev }
                              for (const game of weekGames) {
                                if (getActualWinner(game)) continue
                                next[game.id] = null
                              }
                              return next
                            })
                          }}
                        >
                          Clear Picks
                        </button>
                      </div>
                      <div className="scenario-list">
                        {weekGames.map(game => {
                          const actualWinner = getActualWinner(game)
                          const selected = scenarioOutcomes[game.id]
                          const disabled = Boolean(actualWinner)
                          const awaySelected = selected === game.away
                          const homeSelected = selected === game.home
                          return (
                            <div key={`sc-${game.id}`} className={`scenario-row ${disabled ? 'is-final' : ''}`}>
                              <div className="scenario-teams">
                                <button
                                  type="button"
                                  className={`scenario-team ${awaySelected ? 'is-picked' : ''}`}
                                  disabled={disabled}
                                  onClick={() => {
                                    setScenarioOutcomes(prev => ({ ...prev, [game.id]: prev[game.id] === game.away ? null : game.away }))
                                  }}
                                >
                                  {renderTeamIcon(game.away, awaySelected)}
                                  <span>{game.away}</span>
                                </button>
                                <span className="scenario-at">@</span>
                                <button
                                  type="button"
                                  className={`scenario-team ${homeSelected ? 'is-picked' : ''}`}
                                  disabled={disabled}
                                  onClick={() => {
                                    setScenarioOutcomes(prev => ({ ...prev, [game.id]: prev[game.id] === game.home ? null : game.home }))
                                  }}
                                >
                                  {renderTeamIcon(game.home, homeSelected)}
                                  <span>{game.home}</span>
                                </button>
                              </div>
                              <div className="scenario-meta">
                                <span className="muted">{game.kickoff || 'TBD'}</span>
                                {actualWinner && <span className="badge badge-correct">Final</span>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    <div className="scenario-card">
                      <div className="scenario-title">Projected Week Results</div>
                      {(() => {
                        const rows = buildScenarioRows()
                        const leader = rows[0]
                        const selected = rows.find(r => String(r.user_id) === String(standingsSelectedUserId))
                        const canWin = selected && leader ? selected.projected >= leader.projected : false
                        return (
                          <>
                            {selected && leader && (
                              <div className={`scenario-banner ${canWin ? 'is-win' : 'is-lose'}`}>
                                {canWin
                                  ? `${selected.name || 'You'} are projected to finish ${selected.projected === leader.projected ? 'tied for first' : 'first'}.`
                                  : `${selected.name || 'You'} would need ${leader.projected - selected.projected} more point${leader.projected - selected.projected === 1 ? '' : 's'} to catch the leader.`}
                              </div>
                            )}
                            <table className="standings-table scenario-table">
                              <thead>
                                <tr>
                                  <th style={{width:60}}>Rank</th>
                                  <th>Entry Name</th>
                                  <th style={{width:120, textAlign:'right'}}>Current</th>
                                  <th style={{width:120, textAlign:'right'}}>Remaining</th>
                                  <th style={{width:120, textAlign:'right'}}>Projected</th>
                                </tr>
                              </thead>
                              <tbody>
                                {rows.map((row, idx) => (
                                  <tr key={`sc-row-${row.user_id}`} className={String(row.user_id) === String(standingsSelectedUserId) ? 'is-selected' : ''}>
                                    <td className="col-rank">{idx + 1}</td>
                                    <td className="col-name">{row.name}</td>
                                    <td style={{textAlign:'right'}}>{row.current}</td>
                                    <td style={{textAlign:'right'}}>{row.remaining}</td>
                                    <td style={{textAlign:'right'}} className="col-points">{row.projected}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </>
                        )
                      })()}
                    </div>
                  </div>
                ) : (
                  <table className="standings-table">
                    <thead>
                      <tr>
                        <th style={{width:60}}>Rank</th>
                        <th>Entry Name</th>
                        <th style={{width:60, textAlign:'right'}}>W</th>
                        <th style={{width:60, textAlign:'right'}}>L</th>
                        <th style={{width:120, textAlign:'right'}}>Possible Pts</th>
                        <th style={{width:120, textAlign:'right'}}>Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((row, idx) => {
                        const isSelected = String(row.user_id) === String(standingsSelectedUserId)
                        const computed = computeUserStats(row.user_id)
                        const stats = {
                          wins: row.wins ?? computed.wins,
                          losses: row.losses ?? computed.losses,
                          possible: row.possible ?? computed.possible,
                          points: row.points ?? row.score ?? computed.points
                        }
                        return (
                          <tr key={`s-${row.user_id}`} className={isSelected ? 'is-selected' : ''}>
                            <td className="col-rank">{idx + 1}</td>
                            <td className="col-name">{row.name}</td>
                            <td style={{textAlign:'right'}}>{stats.wins}</td>
                            <td style={{textAlign:'right'}}>{stats.losses}</td>
                            <td style={{textAlign:'right'}}>{stats.possible}</td>
                            <td style={{textAlign:'right'}} className="col-points">{stats.points}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
                
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
