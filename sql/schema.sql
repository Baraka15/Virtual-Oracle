create table arb_opportunities (
  id bigserial primary key,
  match_id text,
  home_team text,
  away_team text,
  arbitrage_percent numeric,
  bookmakers jsonb,
  stakes jsonb,
  profit numeric,
  created_at timestamptz default now()
);

create table bets (
  id bigserial primary key,
  opportunity_id bigint references arb_opportunities(id),
  bookmaker text,
  outcome text,
  stake numeric,
  odds numeric,
  result text default 'pending',
  placed_at timestamptz default now()
);

create table bankroll (
  id serial primary key,
  balance numeric default 1000,
  updated_at timestamptz default now()
);
insert into bankroll (balance) values (1000);
