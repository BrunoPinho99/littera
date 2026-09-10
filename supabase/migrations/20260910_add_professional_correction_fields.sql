-- Add new columns for professional ENEM correction
ALTER TABLE redacoes ADD COLUMN IF NOT EXISTS strengths_json JSONB DEFAULT '[]'::jsonb;
ALTER TABLE redacoes ADD COLUMN IF NOT EXISTS improvements_json JSONB DEFAULT '[]'::jsonb;
ALTER TABLE redacoes ADD COLUMN IF NOT EXISTS annotations_json JSONB DEFAULT '[]'::jsonb;
ALTER TABLE redacoes ADD COLUMN IF NOT EXISTS zero_reason TEXT DEFAULT NULL;
