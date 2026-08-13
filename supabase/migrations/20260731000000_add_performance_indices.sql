-- Migration: Add performance indices
-- This migration optimizes queries for essays and profiles in the B2B dashboard

CREATE INDEX IF NOT EXISTS idx_essays_school_id ON public.essays(school_id);
CREATE INDEX IF NOT EXISTS idx_essays_user_id ON public.essays(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_school_id ON public.profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_profiles_class_id ON public.profiles(class_id);
