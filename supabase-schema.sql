-- supabase-schema.sql — Sistem Voting
-- Jalankan di Supabase SQL Editor (Project → SQL Editor → New Query)
-- File ini aman dijalankan ulang dari awal (pakai IF NOT EXISTS / DROP POLICY IF EXISTS).

-- ============================================
-- BAGIAN 1: Tabel votes (sudah pernah dijalankan)
-- ============================================

CREATE TABLE IF NOT EXISTS votes (
    id BIGSERIAL PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    pilihan VARCHAR(100) NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_votes_nama ON votes(nama);
CREATE INDEX IF NOT EXISTS idx_votes_timestamp ON votes(timestamp);

ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable insert for all users" ON votes;
CREATE POLICY "Enable insert for all users" ON votes
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable select for all users" ON votes;
CREATE POLICY "Enable select for all users" ON votes
    FOR SELECT USING (true);

-- ============================================
-- BAGIAN 2: BARU — Tabel voting_options
-- Ini yang perlu dijalankan sekarang untuk fitur kelola pilihan di admin panel.
-- ============================================

CREATE TABLE IF NOT EXISTS voting_options (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE voting_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable select for all users" ON voting_options;
CREATE POLICY "Enable select for all users" ON voting_options
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for all users" ON voting_options;
CREATE POLICY "Enable insert for all users" ON voting_options
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for all users" ON voting_options;
CREATE POLICY "Enable update for all users" ON voting_options
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete for all users" ON voting_options;
CREATE POLICY "Enable delete for all users" ON voting_options
    FOR DELETE USING (true);

-- Seed data: 3 pilihan default (sama seperti yang dulu hardcoded di data.js)
-- Skip bagian ini kalau voting_options sudah pernah diisi manual.
INSERT INTO voting_options (title, description, icon) VALUES
    ('Cara Bermain', 'Konten panduan & tutorial cara bermain.', '🎮'),
    ('Referensi TikTok', 'Konten referensi & inspirasi dari TikTok.', '📱'),
    ('Referensi Instagram', 'Konten referensi & inspirasi dari Instagram.', '📸');
