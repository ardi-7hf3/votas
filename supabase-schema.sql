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

-- ============================================
-- BAGIAN 3: BARU — Izin hapus data votes
-- WAJIB dijalankan supaya tombol "Hapus" / "Hapus Semua" di admin panel berfungsi.
-- Sebelumnya tabel votes cuma punya policy INSERT & SELECT, jadi DELETE selalu
-- diblokir RLS meskipun tidak error (baris tidak akan terhapus).
-- ============================================

DROP POLICY IF EXISTS "Enable delete for all users" ON votes;
CREATE POLICY "Enable delete for all users" ON votes
    FOR DELETE USING (true);

-- ============================================
-- BAGIAN 4: BARU — Admin pakai Supabase Auth sungguhan + kunci RLS
-- WAJIB urutan:
-- 1) Supabase Dashboard → Authentication → Users → Add user.
--    Email HARUS PERSIS: admin@votas-admin.local  (username "admin" + domain tetap
--    di App.jsx / ADMIN_EMAIL_DOMAIN). Isi Password sesuka hati, centang "Auto Confirm User".
--    Mau username lain selain "admin"? Ganti bagian depan email-nya juga, mis. "budi" -> budi@votas-admin.local.
-- 2) Baru jalankan SQL BAGIAN 4 ini.
-- Password admin lama yang di data.js sudah tidak dipakai sama sekali oleh kode.
-- ============================================

-- Fungsi khusus: cek status voting 1 nama, tanpa buka akses baca semua tabel votes.
-- SECURITY DEFINER = jalan dengan hak akses pembuat function (bisa baca tabel),
-- tapi cuma balikin baris yang nama-nya PERSIS cocok — vote siswa lain tetap rahasia.
CREATE OR REPLACE FUNCTION check_vote_by_nama(p_nama TEXT)
RETURNS TABLE (id BIGINT, nama VARCHAR, pilihan VARCHAR, timestamp TIMESTAMP)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.id, v.nama, v.pilihan, v.timestamp FROM votes v WHERE v.nama = p_nama LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION check_vote_by_nama(TEXT) TO anon, authenticated;

-- votes: insert tetap terbuka (siswa vote tanpa akun Supabase Auth),
-- select/update/delete cuma buat yang sudah login admin (auth.role() = 'authenticated').
DROP POLICY IF EXISTS "Enable select for all users" ON votes;
DROP POLICY IF EXISTS "Admin can select votes" ON votes;
CREATE POLICY "Admin can select votes" ON votes
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin can update votes" ON votes;
CREATE POLICY "Admin can update votes" ON votes
    FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable delete for all users" ON votes;
DROP POLICY IF EXISTS "Admin can delete votes" ON votes;
CREATE POLICY "Admin can delete votes" ON votes
    FOR DELETE USING (auth.role() = 'authenticated');

-- voting_options: select tetap terbuka (siswa perlu lihat daftar pilihan),
-- insert/update/delete cuma buat admin yang sudah login.
DROP POLICY IF EXISTS "Enable insert for all users" ON voting_options;
DROP POLICY IF EXISTS "Admin can insert options" ON voting_options;
CREATE POLICY "Admin can insert options" ON voting_options
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable update for all users" ON voting_options;
DROP POLICY IF EXISTS "Admin can update options" ON voting_options;
CREATE POLICY "Admin can update options" ON voting_options
    FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable delete for all users" ON voting_options;
DROP POLICY IF EXISTS "Admin can delete options" ON voting_options;
CREATE POLICY "Admin can delete options" ON voting_options
    FOR DELETE USING (auth.role() = 'authenticated');
