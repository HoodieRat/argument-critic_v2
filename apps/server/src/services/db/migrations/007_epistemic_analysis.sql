ALTER TABLE questions ADD COLUMN critique_type TEXT;

CREATE TABLE IF NOT EXISTS claims_metadata (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  source_message_id TEXT NOT NULL,
  claim_text TEXT NOT NULL,
  claim_type TEXT NOT NULL,
  severity INTEGER NOT NULL,
  can_be_evidenced INTEGER NOT NULL,
  requires_definition INTEGER NOT NULL,
  philosophical_stance INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY(source_message_id) REFERENCES messages(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS assumptions_surfaced (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  source_message_id TEXT NOT NULL,
  assumption_text TEXT NOT NULL,
  supports_claim_text TEXT,
  is_explicit INTEGER NOT NULL,
  level TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY(source_message_id) REFERENCES messages(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS critique_classifications (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  turn_id TEXT NOT NULL,
  finding_type TEXT NOT NULL,
  critique_type TEXT NOT NULL,
  description TEXT NOT NULL,
  severity INTEGER NOT NULL,
  can_be_resolved_via TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS uncertainty_map (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  turn_id TEXT NOT NULL,
  uncertainty_type TEXT NOT NULL,
  affected_claim_text TEXT,
  affected_assumption_text TEXT,
  why_flagged TEXT NOT NULL,
  severity INTEGER NOT NULL,
  can_be_addressed_via TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS context_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL,
  is_mutable INTEGER NOT NULL,
  canonical_terms_json TEXT NOT NULL,
  core_moves_json TEXT NOT NULL,
  key_metaphors_json TEXT NOT NULL,
  internal_disputes_json TEXT NOT NULL,
  common_pitfalls_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS framework_alignments (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  turn_id TEXT NOT NULL,
  context_id TEXT NOT NULL,
  alignment_score REAL NOT NULL,
  overlapping_concepts_json TEXT NOT NULL,
  divergences_json TEXT NOT NULL,
  leverage_points_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY(context_id) REFERENCES context_definitions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS familiarity_signals (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  uncertainty_id TEXT,
  assumption_id TEXT,
  claim_id TEXT,
  signal_type TEXT NOT NULL,
  user_note TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY(uncertainty_id) REFERENCES uncertainty_map(id) ON DELETE CASCADE,
  FOREIGN KEY(assumption_id) REFERENCES assumptions_surfaced(id) ON DELETE CASCADE,
  FOREIGN KEY(claim_id) REFERENCES claims_metadata(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_claims_metadata_session_id ON claims_metadata(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assumptions_surfaced_session_id ON assumptions_surfaced(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_critique_classifications_turn_id ON critique_classifications(turn_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_uncertainty_map_turn_id ON uncertainty_map(turn_id, severity DESC);
CREATE INDEX IF NOT EXISTS idx_uncertainty_map_session_id ON uncertainty_map(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_framework_alignments_turn_id ON framework_alignments(turn_id, alignment_score DESC);
CREATE INDEX IF NOT EXISTS idx_familiarity_signals_session_id ON familiarity_signals(session_id, created_at DESC);