export type Sport = 'nba' | 'wnba' | 'nfl' | 'mlb' | 'nhl' | 'soccer'

export interface StatItem {
    label: string
    value : string
    highlight?: boolean
}

export interface Playerstats {
  name: string
  team: string
  position: string
  league: string
  sport: Sport
  season: string
  jerseyNumber?: string
  nationality?: string
  age?: number
  height?: string
  weight?: string
  stats: StatItem[]
  imageUrl?: string
  source: string // which API provided this data
}


// Ball don't lie -  NBA (free, no key required)

export async function fetchNBAStats(playerName: string):  Promise<PlayerStats  | null> {
    try {
        const searchRes = await fetch{
            `https://api.balldontlie.io/v1/players?search=${encodeURIComponent(playerName)}&per_page=5`,
            
            {headers: {Authorization: process.env.BallDontLie_API_KEY || ''}}
        )
        const searchData = await searchRes.json()
        if (!searchData.data?.length) return null
        const player = searchData.data[0]

        //getting current season averages (2024-25 = season 2024)
        const statsRes = await fetch(
             `https://api.balldontlie.io/v1/season_averages?season=2024&player_ids[]=${player.id}`,
              { headers: { Authorization: process.env.BALLDONTLIE_API_KEY || '' } }
    )
    const statsData = await statsRes.json()
    const s = statsData.data?.[0]
 
    if (!s) return null

    return {
        name: '${player.first_name} ${player.last_name}',
        team: player.team?.full_name || 'unknown Team',
        position: player.position || '-',
        leauge: 'NBA',
        sport: 'nba',
        season: '2024-25',
        height : player.height || undefined,
        weight: player.weight ? `${player.weight} lbs` : undefined,
        stats: [
            {label: 'PPG', value: s.pts?.toFixed(1) ?? '-', highlight: true},
            { label: 'RPG',  value: s.reb?.toFixed(1)  ?? '—' },
            {  label: 'APG',  value: s.ast?.toFixed(1)  ?? '—' },
            { label: 'SPG',  value: s.stl?.toFixed(1)  ?? '—' },
            { label: 'BPG',  value: s.blk?.toFixed(1)  ?? '—' },
            { label: 'FG%',  value: s.fg_pct  ? `${(s.fg_pct  * 100).toFixed(1)}%` : '—' },
            { label: '3P%',  value: s.fg3_pct ? `${(s.fg3_pct * 100).toFixed(1)}%` : '—' },
            { label: 'FT%',  value: s.ft_pct  ? `${(s.ft_pct  * 100).toFixed(1)}%` : '—' },
            { label: 'MPG',  value: s.min      ?? '—' },
            { label: 'TO',   value: s.turnover?.toFixed(1) ?? '—' },
      ],
      source: 'BallDontLie (balldontlie.io)',
    }
    } catch (error) {
}
    }

// ─── SPORTRADAR — NBA, WNBA, NFL, MLB, NHL ────────────────────────
// Base URL pattern: https://api.sportradar.com/{sport}/{access_level}/v{version}/{locale}/
// Free trial gives access to all leagues listed below.

const SR_KEY = process.env.SPORTRADAR_API_KEY || ''
const SR_BASE = 'https://api.sportradar.com'

async function srFetch(path: string) {
    const url = `${SR_BASE}${path}?api_key=${SR_KEY}`
    const res = await fetch(url, { next: { revalidate:  3600}})
    if (!res.ok) throw new Error ('SportRadar ${res.status}: ${path}')
        return res.json()

}

export async function fetchNFLStats(playerName: string): Promise<PlayerStats | null> {
    try {
        const search = await srFetch(`/nfl/official/trial/v7/en/players/search/${encodeURIComponent(playerName)}.json`)
        const player = search.players?.[0]
        if (!player) return null

        // Get player profile with stats
        const profile = await srFetch(`/nfl/official/trial/v7/en/players/${player.id}/profile.json`)
        const p = profile?.player
        if(!p) return null
        // Determine position group and build relevant stats
    const pos = (p.position || '').toUpperCase()
    const seasStats = p.seasons?.[0]?.teams?.[0]?.statistics
 
    let stats: StatItem[] = []
 
    if (['QB'].includes(pos)) {
      const pass = seasStats?.passing
      const rush = seasStats?.rushing
      stats = [
        { label: 'Pass Yds', value: pass?.yards ?? '—', highlight: true },
        { label: 'TDs',      value: pass?.touchdowns ?? '—', highlight: true },
        { label: 'INTs',     value: pass?.interceptions ?? '—' },
        { label: 'Comp%',    value: pass?.comp_pct ? `${pass.comp_pct.toFixed(1)}%` : '—' },
        { label: 'Rating',   value: pass?.rating?.toFixed(1) ?? '—' },
        { label: 'Rush Yds', value: rush?.yards ?? '—' },
        { label: 'Rush TDs', value: rush?.touchdowns ?? '—' },
        { label: 'Sacks',    value: pass?.sacks ?? '—' },
      ]
    } else if (['RB', 'FB'].includes(pos)) {
      const rush = seasStats?.rushing
      const recv = seasStats?.receiving
      stats = [
        { label: 'Rush Yds', value: rush?.yards ?? '—', highlight: true },
        { label: 'Rush TDs', value: rush?.touchdowns ?? '—', highlight: true },
        { label: 'YPC',      value: rush?.avg_yards?.toFixed(1) ?? '—' },
        { label: 'Carries',  value: rush?.attempts ?? '—' },
        { label: 'Rec',      value: recv?.receptions ?? '—' },
        { label: 'Rec Yds',  value: recv?.yards ?? '—' },
        { label: 'Fumbles',  value: rush?.fumbles ?? '—' },
      ]
    } else if (['WR', 'TE'].includes(pos)) {
      const recv = seasStats?.receiving
      stats = [
        { label: 'Receptions', value: recv?.receptions ?? '—', highlight: true },
        { label: 'Rec Yds',    value: recv?.yards ?? '—', highlight: true },
        { label: 'Rec TDs',    value: recv?.touchdowns ?? '—', highlight: true },
        { label: 'Targets',    value: recv?.targets ?? '—' },
        { label: 'YPR',        value: recv?.avg_yards?.toFixed(1) ?? '—' },
        { label: 'Long',       value: recv?.longest ?? '—' },
      ]
    } else {
      // Defense
      const def = seasStats?.defense
      stats = [
        { label: 'Tackles',  value: def?.tackles ?? '—', highlight: true },
        { label: 'Sacks',    value: def?.sacks ?? '—', highlight: true },
        { label: 'INTs',     value: def?.interceptions ?? '—' },
        { label: 'FF',       value: def?.forced_fumbles ?? '—' },
        { label: 'PD',       value: def?.passes_defended ?? '—' },
        { label: 'TDs',      value: def?.touchdowns ?? '—' },
      ]
    }
 
    return {
      name: `${p.name_first} ${p.name_last}`,
      team: p.seasons?.[0]?.teams?.[0]?.name || 'Unknown',
      position: p.position || '—',
      league: 'NFL',
      sport: 'nfl',
      season: p.seasons?.[0]?.name || '2024',
      jerseyNumber: p.jersey,
      height: p.height,
      weight: p.weight ? `${p.weight} lbs` : undefined,
      stats,
      source: 'SportRadar (sportradar.com)',
    }
  } catch {
    return null
  }
}
 
export async function fetchMLBStats(playerName: string): Promise<PlayerStats | null> {
  try {
    const search = await srFetch(`/mlb/trial/v7/en/players/search/${encodeURIComponent(playerName)}.json`)
    const player = search?.players?.[0]
    if (!player) return null
 
    const profile = await srFetch(`/mlb/trial/v7/en/players/${player.id}/profile.json`)
    const p = profile?.player
    if (!p) return null
 
    const isPitcher = ['SP', 'RP', 'CP', 'P'].includes(p.primary_position)
    const seasStats = p.seasons?.[0]?.totals?.statistics
 
    let stats: StatItem[] = []
 
    if (isPitcher) {
      const pit = seasStats?.pitching
      stats = [
        { label: 'ERA',   value: pit?.era?.toFixed(2) ?? '—', highlight: true },
        { label: 'W-L',   value: pit ? `${pit.win}-${pit.loss}` : '—', highlight: true },
        { label: 'SO',    value: pit?.strikeouts ?? '—' },
        { label: 'WHIP',  value: pit?.whip?.toFixed(2) ?? '—' },
        { label: 'IP',    value: pit?.ip_1 ?? '—' },
        { label: 'BB',    value: pit?.walks ?? '—' },
        { label: 'HR',    value: pit?.home_runs ?? '—' },
        { label: 'SV',    value: pit?.saves ?? '—' },
      ]
    } else {
      const hit = seasStats?.hitting
      stats = [
        { label: 'AVG',  value: hit?.avg ?? '—', highlight: true },
        { label: 'HR',   value: hit?.home_runs ?? '—', highlight: true },
        { label: 'RBI',  value: hit?.rbi ?? '—', highlight: true },
        { label: 'OPS',  value: hit?.ops ?? '—' },
        { label: 'R',    value: hit?.runs ?? '—' },
        { label: 'SB',   value: hit?.stolen_bases ?? '—' },
        { label: 'OBP',  value: hit?.obp ?? '—' },
        { label: 'SLG',  value: hit?.slg ?? '—' },
        { label: 'Hits', value: hit?.hits ?? '—' },
      ]
    }
 
    return {
      name: `${p.first_name} ${p.last_name}`,
      team: p.seasons?.[0]?.teams?.[0]?.name || 'Unknown',
      position: p.primary_position || '—',
      league: 'MLB',
      sport: 'mlb',
      season: p.seasons?.[0]?.name || '2024',
      jerseyNumber: p.jersey_number,
      height: p.height,
      weight: p.weight ? `${p.weight} lbs` : undefined,
      stats,
      source: 'SportRadar (sportradar.com)',
    }
  } catch {
    return null
  }
}
 
export async function fetchNHLStats(playerName: string): Promise<PlayerStats | null> {
  try {
    const search = await srFetch(`/nhl/trial/v7/en/players/search/${encodeURIComponent(playerName)}.json`)
    const player = search?.players?.[0]
    if (!player) return null
 
    const profile = await srFetch(`/nhl/trial/v7/en/players/${player.id}/profile.json`)
    const p = profile?.player
    if (!p) return null
 
    const isGoalie = p.primary_position === 'G'
    const seasStats = p.seasons?.[0]?.teams?.[0]?.statistics
 
    let stats: StatItem[] = []
    if (isGoalie) {
      const g = seasStats?.goaltending
      stats = [
        { label: 'GAA',  value: g?.average?.toFixed(2) ?? '—', highlight: true },
        { label: 'SV%',  value: g?.save_pct ? `.${Math.round(g.save_pct * 1000)}` : '—', highlight: true },
        { label: 'W',    value: g?.wins ?? '—' },
        { label: 'L',    value: g?.losses ?? '—' },
        { label: 'SO',   value: g?.shutouts ?? '—' },
        { label: 'GP',   value: g?.games_played ?? '—' },
      ]
    } else {
      const sk = seasStats?.skating
      stats = [
        { label: 'G',    value: sk?.goals ?? '—', highlight: true },
        { label: 'A',    value: sk?.assists ?? '—', highlight: true },
        { label: 'PTS',  value: sk?.points ?? '—', highlight: true },
        { label: '+/-',  value: sk?.plus_minus ?? '—' },
        { label: 'PIM',  value: sk?.penalty_minutes ?? '—' },
        { label: 'SOG',  value: sk?.shots_on_goal ?? '—' },
        { label: 'GP',   value: sk?.games_played ?? '—' },
        { label: 'PPG',  value: sk?.powerplay_goals ?? '—' },
      ]
    }
 
    return {
      name: `${p.first_name} ${p.last_name}`,
      team: p.seasons?.[0]?.teams?.[0]?.name || 'Unknown',
      position: p.primary_position || '—',
      league: 'NHL',
      sport: 'nhl',
      season: p.seasons?.[0]?.name || '2024-25',
      jerseyNumber: p.jersey_number,
      nationality: p.birth_place?.country,
      height: p.height,
      weight: p.weight ? `${p.weight} lbs` : undefined,
      stats,
      source: 'SportRadar (sportradar.com)',
    }
  } catch {
    return null
  }
}
 
// ─── API-FOOTBALL (RapidAPI) — Soccer ─────────────────────────────
export async function fetchSoccerStats(playerName: string): Promise<PlayerStats | null> {
  try {
    const res = await fetch(
      `https://api-football-v1.p.rapidapi.com/v3/players?search=${encodeURIComponent(playerName)}&season=2024`,
      {
        headers: {
          'X-RapidAPI-Key': process.env.API_FOOTBALL_KEY || '',
          'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com',
        },
        next: { revalidate: 3600 },
      }
    )
    const data = await res.json()
    const item = data?.response?.[0]
    if (!item) return null
 
    const p = item.player
    const s = item.statistics?.[0]
 
    return {
      name: p.name,
      team: s?.team?.name || 'Unknown',
      position: p.position || '—',
      league: s?.league?.name || 'Soccer',
      sport: 'soccer',
      season: '2024-25',
      nationality: p.nationality,
      age: p.age,
      height: p.height,
      weight: p.weight,
      stats: [
        { label: 'Goals',    value: s?.goals?.total ?? '—', highlight: true },
        { label: 'Assists',  value: s?.goals?.assists ?? '—', highlight: true },
        { label: 'Apps',     value: s?.games?.appearances ?? '—' },
        { label: 'Mins',     value: s?.games?.minutes ?? '—' },
        { label: 'Shots',    value: s?.shots?.total ?? '—' },
        { label: 'Pass Acc', value: s?.passes?.accuracy ? `${s.passes.accuracy}%` : '—' },
        { label: 'Key Pass', value: s?.passes?.key ?? '—' },
        { label: 'Dribbles', value: s?.dribbles?.success ?? '—' },
        { label: 'Fouls W',  value: s?.fouls?.drawn ?? '—' },
        { label: 'Yellows',  value: s?.cards?.yellow ?? '—' },
      ],
      source: 'API-Football (api-football.com)',
    }
  } catch {
    return null
  }
}
 
// ─── WNBA via SportRadar ───────────────────────────────────────────
export async function fetchWNBAStats(playerName: string): Promise<PlayerStats | null> {
  try {
    const search = await srFetch(`/wnba/trial/v7/en/players/search/${encodeURIComponent(playerName)}.json`)
    const player = search?.players?.[0]
    if (!player) return null
 
    const profile = await srFetch(`/wnba/trial/v7/en/players/${player.id}/profile.json`)
    const p = profile?.player
    if (!p) return null
 
    const s = p.seasons?.[0]?.teams?.[0]?.averages
 
    return {
      name: `${p.first_name} ${p.last_name}`,
      team: p.seasons?.[0]?.teams?.[0]?.name || 'Unknown',
      position: p.primary_position || '—',
      league: 'WNBA',
      sport: 'wnba',
      season: p.seasons?.[0]?.name || '2024',
      jerseyNumber: p.jersey_number,
      height: p.height,
      stats: [
        { label: 'PPG', value: s?.points?.toFixed(1)      ?? '—', highlight: true },
        { label: 'RPG', value: s?.rebounds?.toFixed(1)    ?? '—' },
        { label: 'APG', value: s?.assists?.toFixed(1)     ?? '—' },
        { label: 'SPG', value: s?.steals?.toFixed(1)      ?? '—' },
        { label: 'BPG', value: s?.blocks?.toFixed(1)      ?? '—' },
        { label: 'FG%', value: s?.field_goals_pct ? `${(s.field_goals_pct*100).toFixed(1)}%` : '—' },
        { label: '3P%', value: s?.three_points_pct ? `${(s.three_points_pct*100).toFixed(1)}%` : '—' },
        { label: 'MPG', value: s?.minutes?.toFixed(1)     ?? '—' },
      ],
      source: 'SportRadar (sportradar.com)',
    }
  } catch {
    return null
  }
}
 
// ─── Claude AI Fallback ────────────────────────────────────────────
// Used when: player not found in real APIs, or sport not covered
export async function fetchAIFallback(playerName: string, hintSport?: string): Promise<PlayerStats | null> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: `Return ONLY valid JSON (no markdown) for sports player stats. Player: "${playerName}"${hintSport ? `, sport hint: ${hintSport}` : ''}.
Schema: { name, team, position, league, sport (nba|wnba|nfl|mlb|nhl|soccer), season, nationality?, age?, height?, weight?, stats: [{label, value, highlight?}], source: "AI Estimate" }
Include 6-10 sport-appropriate stats. If unknown player, return {"error":"not found"}.`,
        }],
      }),
    })
    const data = await res.json()
    const text = data.content?.map((b: { text?: string }) => b.text || '').join('')
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
    if (parsed.error) return null
    return parsed as PlayerStats
  } catch {
    return null
  }
}
    }


