export type SportHint = 'nba' | 'wnba'  | 'nfl' | 'mlb' | 'nhl' | 'soccer'  | 'unknown'

const KNOWN_PLAYERS: Record<string, SportHint> = {
  'lebron james': 'nba',
  'stephen curry': 'nba',
  'kevin durant': 'nba',
  'nikola jokic': 'nba',
  'luka doncic': 'nba',
  'giannis antetokounmpo': 'nba',
  'jayson tatum': 'nba',
  'caitlin clark': 'wnba',
  "a'ja wilson": 'wnba',
  'breanna stewart': 'wnba',
  'patrick mahomes': 'nfl',
  'josh allen': 'nfl',
  'lamar jackson': 'nfl',
  'justin jefferson': 'nfl',
  'travis kelce': 'nfl',
  'lionel messi': 'soccer',
  'cristiano ronaldo': 'soccer',
  'erling haaland': 'soccer',
  'kylian mbappe': 'soccer',
  'shohei ohtani': 'mlb',
  'mike trout': 'mlb',
  'mookie betts': 'mlb',
  'connor mcdavid': 'nhl',
  'nathan mackinnon': 'nhl',
  'auston matthews': 'nhl',
}

export async function detectSport(playerName: string) : Promise<SportHint> {
    const key = playerName.toLowerCase().trim()
    if (KNOWN_PLAYERS[key]) return KNOWN_PLAYERS[key]

    try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': process.env.ANTHROPIC_API_KEY || '',
                'anthropic-version': '2024-06-01',
            },
            body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 20,
                messages : [{
                    role: 'user',
                    content:  `What sport does "${playerName}" play? Reply with ONLY one word: nba, wnba, nfl, mlb, nhl, soccer, or unknown.`,


                }]
        })
    }
    const data = await.res.json()
    const answer = data.content
}