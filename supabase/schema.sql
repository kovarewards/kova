CREATE TABLE cards (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  issuer      TEXT NOT NULL,
  network     TEXT NOT NULL,
  annual_fee  INTEGER DEFAULT 0,
  color_hex   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,           -- v2: shown in-app as the accuracy SLA
  source_url  TEXT                   -- v2: issuer page verified against
);

CREATE TABLE reward_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id     UUID REFERENCES cards(id) ON DELETE CASCADE,
  mcc_codes   INTEGER[],
  category    TEXT NOT NULL,
  multiplier  NUMERIC(4,2) NOT NULL,
  points_type TEXT NOT NULL,
  cpp         NUMERIC(6,4),
  start_date  DATE,
  end_date    DATE,
  notes       TEXT,
  verified_at TIMESTAMPTZ,
  source_url  TEXT
);

CREATE TABLE annual_benefits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id     UUID REFERENCES cards(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  value_usd   INTEGER,
  period      TEXT NOT NULL,
  category    TEXT,
  description TEXT,
  verified_at TIMESTAMPTZ,
  source_url  TEXT
);

CREATE TABLE user_cards (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID NOT NULL,
  card_id   UUID REFERENCES cards(id),
  nickname  TEXT,
  added_at  TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- v2: the Recovered Rewards Ledger — the retention product
CREATE TABLE user_captures (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL,
  card_id        UUID REFERENCES cards(id),
  category       TEXT NOT NULL,
  spend_estimate NUMERIC(8,2),
  value_captured NUMERIC(8,2) NOT NULL,
  captured_at    TIMESTAMPTZ DEFAULT NOW()
);

-- v2: every DB change is logged — freshness is the moat
CREATE TABLE benefit_changelog (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name  TEXT NOT NULL,
  record_id   UUID NOT NULL,
  change_note TEXT NOT NULL,
  changed_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE cards             ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE annual_benefits   ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cards        ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_captures     ENABLE ROW LEVEL SECURITY;
ALTER TABLE benefit_changelog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read cards"
  ON cards FOR SELECT USING (true);
CREATE POLICY "public read reward_categories"
  ON reward_categories FOR SELECT USING (true);
CREATE POLICY "public read annual_benefits"
  ON annual_benefits FOR SELECT USING (true);
CREATE POLICY "public read changelog"
  ON benefit_changelog FOR SELECT USING (true);

CREATE POLICY "users manage own cards"
  ON user_cards USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users manage own captures"
  ON user_captures USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX ON reward_categories(card_id);
CREATE INDEX ON reward_categories USING GIN(mcc_codes);
CREATE INDEX ON annual_benefits(card_id);
CREATE INDEX ON user_captures(user_id, captured_at);

-- v2: sign-up bonus tracker — manual & optional, no transaction data
CREATE TABLE user_bonus_trackers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL,
  card_id        UUID REFERENCES cards(id),
  bonus_points   INTEGER NOT NULL,
  points_type    TEXT NOT NULL,
  spend_required NUMERIC(8,2) NOT NULL,
  spend_logged   NUMERIC(8,2) NOT NULL DEFAULT 0,
  deadline       DATE NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_bonus_trackers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own bonus trackers"
  ON user_bonus_trackers USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX ON user_bonus_trackers(user_id);
