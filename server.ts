import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import next from 'next';
import { Server } from 'socket.io';
import { fetchVirtualFootballOdds, findArbitrage, supabaseAdmin } from './lib/engine';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();
  const httpServer = createServer(server);
  const io = new Server(httpServer, { cors: { origin: '*' } });

  // Poll live odds every 3 seconds (free tier limit: 1 req/sec, so careful)
  let interval: NodeJS.Timeout | null = null;

  io.on('connection', (socket) => {
    console.log('Dashboard connected:', socket.id);

    // Start polling if not already started
    if (!interval) {
      interval = setInterval(async () => {
        try {
          const matches = await fetchVirtualFootballOdds();
          for (const match of matches) {
            const arb = findArbitrage(match);
            if (arb) {
              // Store in Supabase
              await supabaseAdmin.from('arb_opportunities').insert({
                match_id: arb.matchId,
                home_team: arb.homeTeam,
                away_team: arb.awayTeam,
                arbitrage_percent: arb.arbitragePercent,
                bookmakers: arb.stakes.map(s => ({ bookmaker: s.bookmaker, outcome: s.outcome, odds: s.odds })),
                stakes: arb.stakes,
                profit: arb.profit
              });

              // Push to dashboard
              io.emit('new-arb', arb);
            }
          }
        } catch (e) {
          console.error('Polling error:', e);
        }
      }, 3000);
    }

    socket.on('disconnect', () => {
      if (io.engine.clientsCount === 0 && interval) {
        clearInterval(interval);
        interval = null;
      }
    });
  });

  server.all('*', (req, res) => handle(req, res));

  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(`> Virtual Arb Oracle running on http://localhost:${PORT}`);
  });
});
