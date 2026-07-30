-- 1. Add is_trial_school to schools
ALTER TABLE public.schools
ADD COLUMN IF NOT EXISTS is_trial_school BOOLEAN DEFAULT false;

-- 2. Add trial-specific columns to classes
ALTER TABLE public.classes
ADD COLUMN IF NOT EXISTS trial_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS max_students INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE;

-- 3. Add originated_from_trial to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS originated_from_trial BOOLEAN DEFAULT false;
