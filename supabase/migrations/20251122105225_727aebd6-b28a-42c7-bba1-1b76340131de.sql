-- Add AI extraction columns to trades table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'ai_confidence') THEN
    ALTER TABLE trades ADD COLUMN ai_confidence DECIMAL(5,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'ai_extracted_data') THEN
    ALTER TABLE trades ADD COLUMN ai_extracted_data JSONB;
  END IF;
END $$;

-- Create trade_patterns table
CREATE TABLE IF NOT EXISTS trade_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL,
  pattern_description TEXT NOT NULL,
  win_rate DECIMAL(5,2),
  sample_size INTEGER,
  confidence_score DECIMAL(5,2),
  recommendations TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trading_behaviors table
CREATE TABLE IF NOT EXISTS trading_behaviors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  behavior_type TEXT NOT NULL,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  trade_sequence JSONB,
  severity TEXT NOT NULL,
  ai_recommendation TEXT,
  is_resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trade_screenshots table (metadata, actual files in storage)
CREATE TABLE IF NOT EXISTS trade_screenshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trade_id UUID REFERENCES trades(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  extraction_status TEXT DEFAULT 'pending',
  extracted_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE trade_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_behaviors ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_screenshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trade_patterns
DO $$ BEGIN
  CREATE POLICY "Users can view their own patterns" ON trade_patterns
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert their own patterns" ON trade_patterns
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete their own patterns" ON trade_patterns
    FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- RLS Policies for trading_behaviors
DO $$ BEGIN
  CREATE POLICY "Users can view their own behaviors" ON trading_behaviors
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert their own behaviors" ON trading_behaviors
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update their own behaviors" ON trading_behaviors
    FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- RLS Policies for trade_screenshots
DO $$ BEGIN
  CREATE POLICY "Users can view their own screenshots" ON trade_screenshots
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert their own screenshots" ON trade_screenshots
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete their own screenshots" ON trade_screenshots
    FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trade_patterns_user_id ON trade_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_trading_behaviors_user_id ON trading_behaviors(user_id);
CREATE INDEX IF NOT EXISTS idx_trading_behaviors_detected_at ON trading_behaviors(detected_at);
CREATE INDEX IF NOT EXISTS idx_trade_screenshots_user_id ON trade_screenshots(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_screenshots_trade_id ON trade_screenshots(trade_id);