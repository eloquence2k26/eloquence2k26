-- ==============================================================================
-- ELOQUENCE '26 SUPABASE DATABASE COMPLETE LIVE SCHEMA & MIGRATION SCRIPT
-- Copy & Paste this entire script into your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/wgvpbcosrpyoioplzafa/sql
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. EVENTS TABLE & COLUMNS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.events (
    id TEXT PRIMARY KEY,
    number TEXT,
    name TEXT NOT NULL,
    alias TEXT,
    subtitle TEXT,
    category TEXT NOT NULL,
    team_size TEXT,
    min_members INT DEFAULT 1,
    max_members INT DEFAULT 1,
    fee TEXT,
    fee_per_head NUMERIC DEFAULT 0,
    fee_type TEXT DEFAULT 'per_head',
    is_team BOOLEAN DEFAULT false,
    tag TEXT,
    venue TEXT,
    timing TEXT,
    description TEXT,
    image TEXT,
    rules JSONB,
    rounds JSONB,
    guidelines JSONB,
    highlights JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure event fee column is TEXT type and image column exists
ALTER TABLE public.events ALTER COLUMN fee TYPE TEXT USING fee::text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS image TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS fee_per_head NUMERIC DEFAULT 0;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS fee_type TEXT DEFAULT 'per_head';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS min_members INT DEFAULT 1;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS max_members INT DEFAULT 1;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS team_size TEXT;

-- ------------------------------------------------------------------------------
-- 2. REGISTRATIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_code TEXT UNIQUE NOT NULL,
    event_id TEXT REFERENCES public.events(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    college TEXT,
    department TEXT,
    year TEXT,
    team_name TEXT,
    members_count INT DEFAULT 1,
    total_fee NUMERIC DEFAULT 0,
    payment_status TEXT DEFAULT 'pending',
    registration_status TEXT DEFAULT 'confirmed',
    venue_snapshot TEXT,
    timing_snapshot TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 3. REGISTRATION MEMBERS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.registration_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID REFERENCES public.registrations(id) ON DELETE CASCADE,
    member_number INT DEFAULT 2,
    member_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 4. COORDINATORS TABLE & CLEAN RECREATION
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS public.event_coordinators CASCADE;
DROP TABLE IF EXISTS public.coordinators CASCADE;

CREATE TABLE public.coordinators (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    whatsapp TEXT,
    email TEXT,
    department TEXT,
    year TEXT,
    role TEXT,
    assigned_events JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    display_order INT DEFAULT 999,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 5. SPONSORS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sponsors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    company_name TEXT,
    logo TEXT,
    description TEXT,
    website TEXT,
    contact_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    category TEXT,
    display_order INT DEFAULT 999,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 6. USERS TABLE (Admin & Staff Accounts)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id BIGINT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 7. ROLES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.roles (
    id INT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- DISABLE ROW LEVEL SECURITY (RLS) FOR LIVE CLIENT READ/WRITE ACCESS
-- ==============================================================================
ALTER TABLE public.events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.coordinators DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsors DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles DISABLE ROW LEVEL SECURITY;

-- Grant permissions to public/anon/authenticated roles
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- Notify schema cache reload
NOTIFY pgrst, 'reload schema';
