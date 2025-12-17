-- ============================================
-- SCRAVAGGHI - DATABASE SCHEMA
-- PostgreSQL 14+
-- ============================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- USERS & AUTHENTICATION
-- ============================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,

  -- Account tier
  tier VARCHAR(20) DEFAULT 'free' CHECK (tier IN ('free', 'premium', 'premium_plus')),
  premium_until TIMESTAMP NULL,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  banned_until TIMESTAMP NULL,

  -- Stats
  total_games INT DEFAULT 0,
  wins INT DEFAULT 0,
  losses INT DEFAULT 0,
  elo_rating INT DEFAULT 1000,

  -- Monetization
  lifetime_spent DECIMAL(10,2) DEFAULT 0,
  wallet_balance DECIMAL(10,2) DEFAULT 0,

  -- Settings
  settings JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_tier ON users(tier);
CREATE INDEX idx_users_elo ON users(elo_rating DESC);

-- ============================================
-- GAMES & MATCHES
-- ============================================

CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Game type
  type VARCHAR(20) CHECK (type IN ('casual', 'ranked', 'tournament', 'tutorial')),
  tournament_id UUID REFERENCES tournaments(id),

  -- Map and settings
  map_id INT,
  initial_seed BIGINT NOT NULL,
  game_settings JSONB DEFAULT '{}'::jsonb,

  -- Timing
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  duration_ms INT,

  -- Result
  winner_team INT,

  -- Metadata
  total_damage INT DEFAULT 0,
  total_shots INT DEFAULT 0,
  total_deaths INT DEFAULT 0
);

CREATE INDEX idx_games_type ON games(type);
CREATE INDEX idx_games_tournament ON games(tournament_id) WHERE tournament_id IS NOT NULL;
CREATE INDEX idx_games_ended_at ON games(ended_at DESC) WHERE ended_at IS NOT NULL;

-- Game participants
CREATE TABLE game_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),

  team INT NOT NULL,
  beetle_name VARCHAR(50),

  -- Stats
  damage_dealt INT DEFAULT 0,
  damage_taken INT DEFAULT 0,
  shots_fired INT DEFAULT 0,
  shots_hit INT DEFAULT 0,
  kills INT DEFAULT 0,

  -- Result
  result VARCHAR(10) CHECK (result IN ('win', 'loss', 'draw')),
  elo_change INT DEFAULT 0,

  UNIQUE(game_id, user_id)
);

CREATE INDEX idx_game_players_game ON game_players(game_id);
CREATE INDEX idx_game_players_user ON game_players(user_id);

-- ============================================
-- REPLAY SYSTEM
-- ============================================

CREATE TABLE game_replays (
  game_id UUID PRIMARY KEY REFERENCES games(id) ON DELETE CASCADE,

  -- Storage
  storage_key VARCHAR(500) NOT NULL,
  size_bytes INT,
  action_count INT,

  -- Access control
  is_public BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,

  -- Stats (for preview and filtering)
  max_damage_single_shot INT,
  longest_shot_distance INT,
  total_terrain_deformed INT,
  mvp_player_id UUID REFERENCES users(id),

  -- Views and engagement
  view_count INT DEFAULT 0,
  download_count INT DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_replays_public ON game_replays(is_public) WHERE is_public = true;
CREATE INDEX idx_replays_featured ON game_replays(is_featured) WHERE is_featured = true;
CREATE INDEX idx_replays_created ON game_replays(created_at DESC);

-- Replay access control (for pay-per-view)
CREATE TABLE replay_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  game_id UUID REFERENCES game_replays(game_id) ON DELETE CASCADE,

  access_type VARCHAR(20) CHECK (access_type IN ('owner', 'premium', 'purchased', 'shared', 'tournament')),

  -- Payment info (for purchased)
  purchased_at TIMESTAMP,
  purchase_price DECIMAL(10,2),

  -- Usage stats
  view_count INT DEFAULT 0,
  last_viewed_at TIMESTAMP,

  -- Expiration
  expires_at TIMESTAMP NULL,

  UNIQUE(user_id, game_id)
);

CREATE INDEX idx_replay_access_user ON replay_access(user_id);
CREATE INDEX idx_replay_access_game ON replay_access(game_id);

-- ============================================
-- CLIPS & HIGHLIGHTS
-- ============================================

CREATE TABLE replay_clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source replay
  game_id UUID REFERENCES game_replays(game_id) ON DELETE CASCADE,

  -- Creator
  creator_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Clip data
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_timestamp INT NOT NULL, -- milliseconds from replay start
  end_timestamp INT NOT NULL,

  -- Access
  is_public BOOLEAN DEFAULT FALSE,

  -- Engagement
  views INT DEFAULT 0,
  likes INT DEFAULT 0,
  shares INT DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT valid_clip_duration CHECK (end_timestamp > start_timestamp),
  CONSTRAINT max_clip_duration CHECK (end_timestamp - start_timestamp <= 60000)
);

CREATE INDEX idx_clips_game ON replay_clips(game_id);
CREATE INDEX idx_clips_creator ON replay_clips(creator_user_id);
CREATE INDEX idx_clips_public ON replay_clips(is_public) WHERE is_public = true;
CREATE INDEX idx_clips_created ON replay_clips(created_at DESC);
CREATE INDEX idx_clips_popular ON replay_clips(views DESC, likes DESC);

-- Clip likes
CREATE TABLE clip_likes (
  clip_id UUID REFERENCES replay_clips(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),

  PRIMARY KEY (clip_id, user_id)
);

-- ============================================
-- TUTORIALS & ANNOTATIONS
-- ============================================

CREATE TABLE tutorials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Creator
  creator_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Base replay
  base_replay_id UUID REFERENCES game_replays(game_id) ON DELETE CASCADE,

  -- Tutorial info
  title VARCHAR(255) NOT NULL,
  description TEXT,
  difficulty VARCHAR(20) CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  category VARCHAR(50), -- e.g., 'wind-shots', 'terrain-manipulation', 'advanced-angles'

  -- Annotations (stored as JSONB array)
  annotations JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Access
  is_public BOOLEAN DEFAULT FALSE,
  is_official BOOLEAN DEFAULT FALSE, -- created by team

  -- Engagement
  views INT DEFAULT 0,
  completion_count INT DEFAULT 0,
  rating_sum INT DEFAULT 0,
  rating_count INT DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tutorials_public ON tutorials(is_public) WHERE is_public = true;
CREATE INDEX idx_tutorials_official ON tutorials(is_official) WHERE is_official = true;
CREATE INDEX idx_tutorials_category ON tutorials(category);
CREATE INDEX idx_tutorials_rating ON tutorials((rating_sum::float / NULLIF(rating_count, 0)) DESC NULLS LAST);

-- Tutorial completions
CREATE TABLE tutorial_completions (
  tutorial_id UUID REFERENCES tutorials(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  completed_at TIMESTAMP DEFAULT NOW(),
  time_taken_ms INT,

  PRIMARY KEY (tutorial_id, user_id)
);

-- Tutorial ratings
CREATE TABLE tutorial_ratings (
  tutorial_id UUID REFERENCES tutorials(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  rating INT CHECK (rating BETWEEN 1 AND 5),
  review TEXT,

  created_at TIMESTAMP DEFAULT NOW(),

  PRIMARY KEY (tutorial_id, user_id)
);

-- ============================================
-- TOURNAMENTS
-- ============================================

CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic info
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Type and pricing
  type VARCHAR(20) CHECK (type IN ('free', 'free_premium', 'paid')),
  entry_fee DECIMAL(10,2) DEFAULT 0,
  prize_pool DECIMAL(10,2) DEFAULT 0,

  -- Structure
  format VARCHAR(30) CHECK (format IN ('single_elimination', 'double_elimination', 'swiss', 'round_robin')),
  max_players INT,
  min_players INT DEFAULT 2,

  -- Status
  status VARCHAR(20) DEFAULT 'registration' CHECK (status IN ('draft', 'registration', 'in_progress', 'completed', 'cancelled')),

  -- Timing
  registration_start TIMESTAMP,
  registration_end TIMESTAMP,
  tournament_start TIMESTAMP,
  tournament_end TIMESTAMP,

  -- Settings
  settings JSONB DEFAULT '{}'::jsonb,

  -- Organizer
  organizer_user_id UUID REFERENCES users(id),

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_tournaments_type ON tournaments(type);
CREATE INDEX idx_tournaments_start ON tournaments(tournament_start DESC);

-- Tournament participants
CREATE TABLE tournament_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),

  -- Registration
  joined_at TIMESTAMP DEFAULT NOW(),
  seed INT, -- seeding for bracket

  -- Payment
  paid BOOLEAN DEFAULT FALSE,
  payment_transaction_id UUID,

  -- Results
  placement INT,
  prize_won DECIMAL(10,2) DEFAULT 0,

  -- Stats
  matches_played INT DEFAULT 0,
  matches_won INT DEFAULT 0,

  UNIQUE(tournament_id, user_id)
);

CREATE INDEX idx_tournament_participants_tournament ON tournament_participants(tournament_id);
CREATE INDEX idx_tournament_participants_user ON tournament_participants(user_id);

-- Tournament matches (bracket)
CREATE TABLE tournament_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,

  -- Bracket position
  round INT NOT NULL,
  match_number INT NOT NULL,

  -- Players
  player1_id UUID REFERENCES users(id),
  player2_id UUID REFERENCES users(id),

  -- Result
  game_id UUID REFERENCES games(id),
  winner_id UUID REFERENCES users(id),

  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'in_progress', 'completed', 'forfeit')),

  -- Timing
  scheduled_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,

  UNIQUE(tournament_id, round, match_number)
);

CREATE INDEX idx_tournament_matches_tournament ON tournament_matches(tournament_id);
CREATE INDEX idx_tournament_matches_status ON tournament_matches(status);

-- ============================================
-- PAYMENTS & TRANSACTIONS
-- ============================================

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Transaction type
  type VARCHAR(50) CHECK (type IN (
    'premium_subscription',
    'premium_plus_subscription',
    'tournament_entry',
    'tournament_prize',
    'replay_purchase',
    'wallet_deposit',
    'wallet_withdrawal',
    'refund'
  )),

  -- Amount (negative for deductions)
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',

  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),

  -- Payment provider
  provider VARCHAR(50), -- stripe, paypal, etc.
  provider_transaction_id VARCHAR(255),
  provider_customer_id VARCHAR(255),

  -- Related entities
  related_tournament_id UUID REFERENCES tournaments(id),
  related_game_id UUID REFERENCES games(id),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,

  -- Stripe webhook idempotency
  idempotency_key VARCHAR(255) UNIQUE
);

CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_provider_id ON transactions(provider_transaction_id);
CREATE INDEX idx_transactions_created ON transactions(created_at DESC);

-- Stripe subscriptions tracking
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Stripe info
  stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_customer_id VARCHAR(255) NOT NULL,
  stripe_price_id VARCHAR(255) NOT NULL,

  -- Subscription details
  tier VARCHAR(20) CHECK (tier IN ('premium', 'premium_plus')),
  status VARCHAR(20) CHECK (status IN ('active', 'past_due', 'canceled', 'unpaid')),

  -- Billing
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, tier)
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- ============================================
-- CUSTOMIZATIONS (Premium feature)
-- ============================================

CREATE TABLE user_customizations (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- Sound pack
  sound_pack_id UUID REFERENCES sound_packs(id),
  custom_sound_pack_url VARCHAR(500),

  -- Visual customization
  beetle_skin_id INT DEFAULT 1,
  color_scheme JSONB,

  -- Badges and achievements
  badges JSONB DEFAULT '[]'::jsonb,

  -- Display preferences
  display_settings JSONB DEFAULT '{}'::jsonb,

  updated_at TIMESTAMP DEFAULT NOW()
);

-- Sound packs catalog
CREATE TABLE sound_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name VARCHAR(100) NOT NULL,
  description TEXT,

  -- Creator
  creator_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_official BOOLEAN DEFAULT FALSE,

  -- Access
  is_public BOOLEAN DEFAULT FALSE,
  price DECIMAL(10,2) DEFAULT 0, -- 0 = free

  -- Storage
  storage_path VARCHAR(500) NOT NULL,
  file_size_bytes INT,

  -- Metadata
  tags JSONB DEFAULT '[]'::jsonb,

  -- Stats
  download_count INT DEFAULT 0,
  rating_sum INT DEFAULT 0,
  rating_count INT DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sound_packs_public ON sound_packs(is_public) WHERE is_public = true;
CREATE INDEX idx_sound_packs_creator ON sound_packs(creator_user_id);

-- ============================================
-- ANTI-CHEAT & MODERATION
-- ============================================

CREATE TABLE suspicious_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  game_id UUID REFERENCES games(id) ON DELETE SET NULL,

  reason VARCHAR(255) NOT NULL,
  severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),

  -- Details
  details JSONB,

  -- Review
  reviewed BOOLEAN DEFAULT FALSE,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  action_taken VARCHAR(100),

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_suspicious_user ON suspicious_activities(user_id);
CREATE INDEX idx_suspicious_unreviewed ON suspicious_activities(reviewed) WHERE reviewed = false;
CREATE INDEX idx_suspicious_severity ON suspicious_activities(severity);

-- ============================================
-- ANALYTICS & STATS
-- ============================================

-- Daily aggregated stats
CREATE TABLE daily_stats (
  date DATE PRIMARY KEY,

  total_games INT DEFAULT 0,
  total_players INT DEFAULT 0,
  new_users INT DEFAULT 0,

  premium_conversions INT DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0,

  replay_views INT DEFAULT 0,
  clip_creates INT DEFAULT 0,

  tournament_participants INT DEFAULT 0,

  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Update user stats after game
CREATE OR REPLACE FUNCTION update_user_stats_after_game()
RETURNS TRIGGER AS $$
BEGIN
  -- Update all players in the game
  UPDATE users u
  SET
    total_games = total_games + 1,
    wins = wins + (CASE WHEN gp.result = 'win' THEN 1 ELSE 0 END),
    losses = losses + (CASE WHEN gp.result = 'loss' THEN 1 ELSE 0 END),
    elo_rating = elo_rating + gp.elo_change
  FROM game_players gp
  WHERE u.id = gp.user_id AND gp.game_id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_stats
AFTER UPDATE OF ended_at ON games
FOR EACH ROW
WHEN (NEW.ended_at IS NOT NULL AND OLD.ended_at IS NULL)
EXECUTE FUNCTION update_user_stats_after_game();

-- Update tutorial rating stats
CREATE OR REPLACE FUNCTION update_tutorial_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tutorials
    SET
      rating_sum = rating_sum + NEW.rating,
      rating_count = rating_count + 1,
      updated_at = NOW()
    WHERE id = NEW.tutorial_id;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE tutorials
    SET
      rating_sum = rating_sum - OLD.rating + NEW.rating,
      updated_at = NOW()
    WHERE id = NEW.tutorial_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tutorials
    SET
      rating_sum = rating_sum - OLD.rating,
      rating_count = rating_count - 1,
      updated_at = NOW()
    WHERE id = OLD.tutorial_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tutorial_rating
AFTER INSERT OR UPDATE OR DELETE ON tutorial_ratings
FOR EACH ROW
EXECUTE FUNCTION update_tutorial_rating();

-- Update clip likes count
CREATE OR REPLACE FUNCTION update_clip_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE replay_clips SET likes = likes + 1 WHERE id = NEW.clip_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE replay_clips SET likes = likes - 1 WHERE id = OLD.clip_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_clip_likes
AFTER INSERT OR DELETE ON clip_likes
FOR EACH ROW
EXECUTE FUNCTION update_clip_likes_count();

-- Auto-expire premium accounts
CREATE OR REPLACE FUNCTION check_premium_expiration()
RETURNS void AS $$
BEGIN
  UPDATE users
  SET tier = 'free'
  WHERE tier IN ('premium', 'premium_plus')
    AND premium_until < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VIEWS (for common queries)
-- ============================================

-- Leaderboard view
CREATE VIEW leaderboard AS
SELECT
  u.id,
  u.username,
  u.elo_rating,
  u.total_games,
  u.wins,
  u.losses,
  CASE WHEN u.total_games > 0
    THEN ROUND((u.wins::float / u.total_games * 100), 1)
    ELSE 0
  END as win_rate,
  u.tier
FROM users u
WHERE u.total_games >= 5 -- Minimum games to appear on leaderboard
ORDER BY u.elo_rating DESC;

-- Public replays with player info
CREATE VIEW public_replays AS
SELECT
  gr.game_id,
  gr.created_at,
  gr.view_count,
  gr.max_damage_single_shot,
  g.duration_ms,
  g.type,
  json_agg(
    json_build_object(
      'user_id', gp.user_id,
      'username', u.username,
      'team', gp.team,
      'result', gp.result
    )
  ) as players
FROM game_replays gr
JOIN games g ON gr.game_id = g.id
JOIN game_players gp ON g.id = gp.game_id
JOIN users u ON gp.user_id = u.id
WHERE gr.is_public = true
GROUP BY gr.game_id, g.duration_ms, g.type, gr.created_at, gr.view_count, gr.max_damage_single_shot
ORDER BY gr.created_at DESC;

-- Tournament standings
CREATE VIEW tournament_standings AS
SELECT
  tp.tournament_id,
  tp.user_id,
  u.username,
  tp.placement,
  tp.matches_played,
  tp.matches_won,
  tp.prize_won,
  t.name as tournament_name
FROM tournament_participants tp
JOIN users u ON tp.user_id = u.id
JOIN tournaments t ON tp.tournament_id = t.id
WHERE tp.placement IS NOT NULL
ORDER BY tp.tournament_id, tp.placement;

-- ============================================
-- SAMPLE DATA (for development)
-- ============================================

-- Insert default sound pack
INSERT INTO sound_packs (id, name, description, is_official, is_public, storage_path)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Default Sound Pack',
  'Official Scravagghi sounds',
  true,
  true,
  'sounds/default'
);

-- ============================================
-- GRANTS (adjust based on your roles)
-- ============================================

-- Create application role
-- CREATE ROLE scravagghi_app WITH LOGIN PASSWORD 'your_secure_password';
-- GRANT CONNECT ON DATABASE scravagghi TO scravagghi_app;
-- GRANT USAGE ON SCHEMA public TO scravagghi_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO scravagghi_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO scravagghi_app;
