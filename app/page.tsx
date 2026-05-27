'use client';
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000';

interface Arb {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  arbitragePercent: number;
  profit: number;
  stakes: { bookmaker: string; outcome: string; odds: number; stake: number }[];
}

export default function Dashboard() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [arbs, setArbs] = useState<Arb[]>([]);
  const [bankroll, setBankroll] = useState(1000);
  const [profitHistory, setProfitHistory] = useState<{ time: string; profit: number }[]>([]);
  const [betLog, setBetLog] = useState<any[]>([]);

  useEffect(() => {
    const s = io(SOCKET_URL);
    setSocket(s);

    s.on('new-arb', (arb: Arb) => {
      setArbs((prev) => [arb, ...prev]);
      // auto‑simulate a paper bet for demo (take the arb)
      // We'll just log it
      setBetLog((prev) => [
        {
          id: Date.now(),
          matchId: arb.matchId,
          profit: arb.profit,
          arbPercent: arb.arbitragePercent,
          time: new Date().toLocaleTimeString()
        },
        ...prev
      ]);
      // Update bankroll with the guaranteed profit
      setBankroll((b) => b + arb.profit);
      setProfitHistory((prev) => [
        ...prev.slice(-30),
        { time: new Date().toLocaleTimeString(), profit: arb.profit }
      ]);
    });

    return () => { s.disconnect(); };
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-neon-purple to-neon-green bg-clip-text text-transparent">
          Virtual Arb Oracle
        </h1>
        <div className="text-right">
          <span className="text-gray-400 text-sm">Bankroll</span>
          <div className="text-2xl font-mono font-bold text-neon-green">
            ${bankroll.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <span className="w-2 h-2 bg-neon-green rounded-full animate-pulse" /> Live Arbs
          </h2>
          {arbs.length === 0 && (
            <p className="text-gray-500">Waiting for arbitrage opportunities…</p>
          )}
          <AnimatePresence>
            {arbs.map((arb, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-neon-purple/50 transition"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-400">Match ID: {arb.matchId.slice(-8)}</span>
                  <span className="text-xs bg-neon-green/20 text-neon-green px-2 py-0.5 rounded-full">
                    {arb.arbitragePercent.toFixed(2)}% Profit
                  </span>
                </div>
                <div className="text-2xl font-bold">{arb.homeTeam} vs {arb.awayTeam}</div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {arb.stakes.map((s, j) => (
                    <div key={j} className="bg-gray-800 p-2 rounded text-sm">
                      <span className="text-gray-400">{s.outcome}</span><br />
                      <span className="font-bold">{s.bookmaker}</span><br />
                      <span className="text-neon-green">{s.odds.toFixed(2)}</span><br />
                      <span className="text-xs">Stake: ${s.stake.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-neon-green font-bold">
                  Guaranteed Profit: ${arb.profit.toFixed(2)}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h3 className="text-lg font-semibold mb-2">Profit Chart</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={profitHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="time" tick={false} />
                <YAxis tick={{ fill: '#999' }} />
                <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: 'none' }} />
                <Line type="monotone" dataKey="profit" stroke="#39ff14" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h3 className="text-lg font-semibold mb-2">Execution Log</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto text-sm">
              {betLog.length === 0 && <p className="text-gray-500">No arbs executed yet.</p>}
              {betLog.map((entry) => (
                <div key={entry.id} className="flex justify-between border-b border-gray-800 pb-1">
                  <span>{entry.matchId.slice(-6)}</span>
                  <span className="text-neon-green">+${entry.profit.toFixed(2)}</span>
                  <span className="text-gray-500">{entry.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
