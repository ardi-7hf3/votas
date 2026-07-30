// data.js — Data akun & opsi voting (hardcoded).
// Tambahkan akun baru dari Excel ke array `accounts` di bawah ini.

export const accounts = [
  { nama: 'Ahmad Fauzi', password: 'VOTING' },
  { nama: 'Siti Rahma', password: 'VOTING' },
  { nama: 'Budi Santoso', password: 'VOTING' },
  { nama: 'Dewi Lestari', password: 'VOTING' },
  { nama: 'Rizky Ramadhan', password: 'VOTING' },
  { nama: 'Putri Ayu', password: 'VOTING' },
]

export const votingOptions = [
  {
    id: 1,
    title: 'Cara Bermain',
    description: 'Konten panduan & tutorial cara bermain.',
    icon: '🎮',
  },
  {
    id: 2,
    title: 'Referensi TikTok',
    description: 'Konten referensi & inspirasi dari TikTok.',
    icon: '📱',
  },
  {
    id: 3,
    title: 'Referensi Instagram',
    description: 'Konten referensi & inspirasi dari Instagram.',
    icon: '📸',
  },
]

export const adminAccount = {
  username: 'admin',
  password: 'admin123', // ganti sesuai kebutuhan
}
