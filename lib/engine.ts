// =========================== Odds API Fetcher ===========================
export interface Outcome {
  name: string; // home team, away team, Draw
  price: number;
}

export interface BookmakerMarket {
  key: string;   // bookmaker name
  title: string;
  outcomes: Outcome[];
}

export interface ArbMatch {
  id: string;
  home_team: string;
  away_team: string;
  bookmakers: BookmakerMarket[];
}

// Fetch virtual football odds from The Odds API
export async function fetchVirtualFootballOdds(): Promise<ArbMatch[]> {
  const apiKey = process.env.ODDS_API_KEY!;
  // The Odds API sport key for virtual football (may be "virtual_soccer" or "soccer_virtual")
  // I'll try both; if not available, we can fallback to a simulated feed.
  const sportKeys = ['virtual_soccer', 'soccer_virtual', 'soccer_efootball'];
  let allMatches: any[] = [];

  for (const sport of sportKeys) {
    try {
      const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${apiKey}&regions=uk,eu&markets=h2h`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data: any[] = await res.json();
      allMatches = allMatches.concat(data);
    } catch (e) {}
  }

  // Transform to our ArbMatch format
  const arbMatches: ArbMatch[] = [];
  for (const m of allMatches) {
    const bookmakers: BookmakerMarket[] = (m.bookmakers || []).map((b: any) => {
      const h2h = b.markets.find((mk: any) => mk.key === 'h2h');
      return {
        key: b.key,
        title: b.title,
        outcomes: h2h ? h2h.outcomes.map((o: any) => ({ name: o.name, price: o.price })) : []
      };
    }).filter((b: BookmakerMarket) => b.outcomes.length >= 3); // need home, draw, away

    if (bookmakers.length >= 2) { // need at least two bookmakers for arbs
      arbMatches.push({
        id: m.id,
        home_team: m.home_team,
        away_team: m.away_team,
        bookmakers
      });
    }
  }
  return arbMatches;
}

// =========================== Arbitrage Calculator ===========================
export interface ArbOpportunity {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  arbitragePercent: number;  // e.g., 2.5 means 2.5% profit
  stakes: { bookmaker: string; outcome: string; odds: number; stake: number }[];
  profit: number;            // profit per $1000 total stake
}

export function findArbitrage(match: ArbMatch): ArbOpportunity | null {
  const outcomes = ['home', 'draw', 'away'];
  let bestHome = { bookmaker: '', odds: 0 };
  let bestDraw = { bookmaker: '', odds: 0 };
  let bestAway = { bookmaker: '', odds: 0 };

  // Find best odds for each outcome across all bookmakers
  for (const book of match.bookmakers) {
    for (const out of book.outcomes) {
      if (out.name === match.home_team && out.price > bestHome.odds) {
        bestHome = { bookmaker: book.key, odds: out.price };
      } else if (out.name === match.away_team && out.price > bestAway.odds) {
        bestAway = { bookmaker: book.key, odds: out.price };
      } else if (out.name === 'Draw' && out.price > bestDraw.odds) {
        bestDraw = { bookmaker: book.key, odds: out.price };
      }
    }
  }

  if (!bestHome.odds || !bestDraw.odds || !bestAway.odds) return null;

  // Calculate arbitrage percentage
  const sumInverse = 1/bestHome.odds + 1/bestDraw.odds + 1/bestAway.odds;
  if (sumInverse >= 1) return null; // no arbitrage

  const arbitragePercent = (1 - sumInverse) * 100;
  const totalStake = 1000; // assumed total investment

  const stakeHome = (totalStake * (1/bestHome.odds)) / sumInverse;
  const stakeDraw = (totalStake * (1/bestDraw.odds)) / sumInverse;
  const stakeAway = (totalStake * (1/bestAway.odds)) / sumInverse;

  const profit = totalStake * (1/sumInverse - 1);

  return {
    matchId: match.id,
    homeTeam: match.home_team,
    awayTeam: match.away_team,
    arbitragePercent,
    stakes: [
      { bookmaker: bestHome.bookmaker, outcome: 'Home', odds: bestHome.odds, stake: stakeHome },
      { bookmaker: bestDraw.bookmaker, outcome: 'Draw', odds: bestDraw.odds, stake: stakeDraw },
      { bookmaker: bestAway.bookmaker, outcome: 'Away', odds: bestAway.odds, stake: stakeAway },
    ],
    profit
  };
}

// =========================== Supabase Client ===========================
import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
