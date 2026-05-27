import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Virtual Arb Oracle',
  description: 'Real‑time arbitrage scanner for virtual football',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
