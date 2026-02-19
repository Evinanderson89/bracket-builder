-- Bracket Builder – relational schema
-- Run this in Supabase SQL Editor to create the production tables.

-- ============================================================
-- Players
-- ============================================================
CREATE TABLE IF NOT EXISTS public.players (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  email           TEXT,
  average         INTEGER NOT NULL DEFAULT 200,
  handicap        INTEGER NOT NULL DEFAULT 0,
  num_brackets    INTEGER NOT NULL DEFAULT 1,
  aliases         JSONB DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Cohorts (tournaments)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cohorts (
  id                          TEXT PRIMARY KEY,
  name                        TEXT NOT NULL,
  type                        TEXT NOT NULL CHECK (type IN ('Scratch', 'Handicap')),
  tournament_kind             TEXT NOT NULL CHECK (tournament_kind IN ('Series', 'Brackets')),
  description_mode            TEXT NOT NULL DEFAULT 'stock' CHECK (description_mode IN ('stock', 'custom')),
  custom_description          TEXT NOT NULL DEFAULT '',
  created_by_auth_user_id     TEXT,
  created_by_auth_user_email  TEXT,
  created_by_name             TEXT,
  score_entry_user_ids        JSONB NOT NULL DEFAULT '[]'::jsonb,
  centers                     JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_games                 INTEGER NOT NULL DEFAULT 3,
  bracket_start_game          INTEGER NOT NULL DEFAULT 1,
  score_source_cohort_id      TEXT REFERENCES public.cohorts(id) ON DELETE SET NULL,
  status                      TEXT NOT NULL DEFAULT 'not deployed'
                              CHECK (status IN ('not deployed', 'active', 'complete')),
  selected_user_ids           JSONB NOT NULL DEFAULT '[]'::jsonb,
  user_bracket_counts         JSONB NOT NULL DEFAULT '{}'::jsonb,
  pending_entry_requests      JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Brackets
-- ============================================================
CREATE TABLE IF NOT EXISTS public.brackets (
  id              TEXT PRIMARY KEY,
  cohort_id       TEXT NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  bracket_number  INTEGER NOT NULL,
  players         JSONB NOT NULL DEFAULT '[]'::jsonb,
  structure       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brackets_cohort_id ON public.brackets (cohort_id);

-- ============================================================
-- Games
-- ============================================================
CREATE TABLE IF NOT EXISTS public.games (
  id          TEXT PRIMARY KEY,
  cohort_id   TEXT NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  player_id   TEXT NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  game_number INTEGER NOT NULL,
  score       INTEGER NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cohort_id, player_id, game_number)
);

CREATE INDEX IF NOT EXISTS idx_games_cohort_player ON public.games (cohort_id, player_id);

-- ============================================================
-- Payouts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payouts (
  id          TEXT PRIMARY KEY,
  cohort_id   TEXT NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  cohort_name TEXT NOT NULL,
  player_id   TEXT NOT NULL,
  player_name TEXT NOT NULL,
  amount      INTEGER NOT NULL,
  position    INTEGER NOT NULL,
  date        TEXT NOT NULL,
  bracket_id  TEXT NOT NULL REFERENCES public.brackets(id) ON DELETE CASCADE,
  is_operator BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payouts_cohort_id ON public.payouts (cohort_id);
CREATE INDEX IF NOT EXISTS idx_payouts_bracket_id ON public.payouts (bracket_id);

-- ============================================================
-- Player Requests
-- ============================================================
CREATE TABLE IF NOT EXISTS public.player_requests (
  id           TEXT PRIMARY KEY,
  email        TEXT NOT NULL,
  name         TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at  TIMESTAMPTZ
);

-- ============================================================
-- Permissions (RLS disabled for now – anon access required)
-- ============================================================
ALTER TABLE public.players DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohorts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.brackets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.games DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_requests DISABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.players TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.cohorts TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.brackets TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.games TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.payouts TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.player_requests TO anon, authenticated;
