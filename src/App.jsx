/**
 * App.jsx — Sistem Voting
 * Semua state, logic, dan render UI ada di satu file ini (sesuai struktur project).
 * Styling pakai Tailwind CSS (lihat @theme di App.css untuk token warna/radius/shadow).
 */
import { useState, useEffect, useRef } from 'react'
import { Vote, Crown, CircleCheckBig, PartyPopper, Pencil, Trash2, Download, ChevronDown, Eye, EyeOff } from 'lucide-react'
import { supabase } from './supabase'
import { accounts } from './data'
import { OPTION_ICONS, getOptionIcon } from './icons'

// Supabase Auth butuh email, tapi admin cuma mau ketik username biasa (mis. "admin").
// Jadi username di-mapping ke email tetap: "admin" -> "admin@votas-admin.local".
// Pas bikin user di Supabase Dashboard, EMAIL YANG DIISI HARUS PERSIS hasil mapping ini.
const ADMIN_EMAIL_DOMAIN = 'votas-admin.local'

// ---------- Kelas tombol yang dipakai berkali-kali (biar JSX tidak penuh string panjang) ----------
const BTN_PRIMARY =
  'inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-primary-600 px-7 py-3.5 text-[14.4px] font-extrabold leading-[21px] text-white shadow-btn transition duration-200 hover:enabled:opacity-[0.92] hover:enabled:shadow-btn-hover active:enabled:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60'
const BTN_ACCENT =
  'inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-neutral-lighter bg-surface-subtle px-7 py-3.5 text-[14.4px] font-extrabold leading-[21px] text-primary-600 transition duration-200 hover:enabled:border-primary-300 hover:enabled:bg-surface-gray active:enabled:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60'
const BTN_GRAY =
  'inline-flex min-h-12 w-auto cursor-pointer items-center justify-center gap-2 rounded-full border border-neutral-lighter bg-white px-7 py-3.5 text-[14.4px] font-extrabold leading-[21px] text-text-tertiary transition duration-200 hover:enabled:border-neutral-light hover:enabled:bg-surface-gray active:enabled:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60'
const BTN_PRIMARY_SM =
  'inline-flex min-h-10 w-auto cursor-pointer items-center justify-center gap-2 rounded-full bg-primary-600 px-5 py-2 text-[13px] font-extrabold leading-[21px] text-white shadow-btn transition duration-200 hover:enabled:opacity-[0.92] hover:enabled:shadow-btn-hover active:enabled:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60'
const BTN_GRAY_SM =
  'inline-flex min-h-10 w-auto cursor-pointer items-center justify-center gap-2 rounded-full border border-neutral-lighter bg-white px-5 py-2 text-[13px] font-extrabold leading-[21px] text-text-tertiary transition duration-200 hover:enabled:bg-surface-gray active:enabled:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60'
const BTN_DANGER_SM =
  'inline-flex min-h-10 w-auto cursor-pointer items-center justify-center gap-2 rounded-full border border-danger-bg bg-danger-bg px-5 py-2 text-[13px] font-extrabold leading-[21px] text-danger transition duration-200 hover:enabled:border-danger hover:enabled:bg-danger hover:enabled:text-white active:enabled:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60'
const BTN_DANGER =
  'inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-danger px-7 py-3.5 text-[14.4px] font-extrabold leading-[21px] text-white shadow-btn transition duration-200 hover:enabled:opacity-[0.92] hover:enabled:shadow-btn-hover active:enabled:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60'
const LINK_BUTTON =
  'mt-4 block w-full cursor-pointer rounded-md bg-transparent py-2 text-center text-sm font-semibold text-primary-600 hover:underline'
const INPUT_FIELD =
  'min-h-11 w-full rounded-md border border-neutral-light px-4 py-3 text-base text-text-primary transition placeholder:text-text-disabled focus:border-primary-600 focus:shadow-focus-ring focus:outline-none'
const INPUT_FIELD_PW =
  'min-h-11 w-full rounded-md border border-neutral-light py-3 pl-4 pr-11 text-base text-text-primary transition placeholder:text-text-disabled focus:border-primary-600 focus:shadow-focus-ring focus:outline-none'
const ERROR_MESSAGE = 'mb-4 rounded-md bg-danger-bg px-3 py-2 text-sm text-danger'
const ICON_BTN = 'flex items-center justify-center rounded-sm p-2 text-text-tertiary transition-colors hover:bg-surface-gray'
const ICON_BTN_DANGER = 'flex items-center justify-center rounded-sm p-2 text-danger transition-colors hover:bg-danger-bg'
const EMPTY_TEXT = 'py-8 text-center text-base text-text-disabled'

// Ubah URL polos di dalam teks (field Cara Bermain / Aturan & Referensi Video) jadi link yang bisa diklik.
function linkify(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  return text.split(urlRegex).map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="break-all text-primary-600 underline">
        {part}
      </a>
    ) : (
      part
    )
  )
}

// Cari semua URL di dalam sebuah teks (dipakai buat render preview video di bawahnya).
function extractUrls(text) {
  return text.match(/https?:\/\/[^\s]+/g) || []
}

function getYouTubeId(url) {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

function isTikTokUrl(url) {
  return /tiktok\.com/.test(url)
}

// Kartu preview thumbnail buat link YouTube/TikTok. YouTube langsung dari URL thumbnail
// bawaannya (nggak perlu fetch). TikTok perlu fetch oEmbed API mereka — kalau gagal/CORS
// diblokir, otomatis fallback jadi link teks biasa (nggak bikin UI rusak).
function VideoPreview({ url }) {
  const youtubeId = getYouTubeId(url)
  const isTikTok = !youtubeId && isTikTokUrl(url)
  const [tiktokData, setTiktokData] = useState(null)
  const [tiktokError, setTiktokError] = useState(false)

  useEffect(() => {
    if (!isTikTok) return
    let cancelled = false
    fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`)
      .then((res) => {
        if (!res.ok) throw new Error('oEmbed gagal')
        return res.json()
      })
      .then((data) => {
        if (!cancelled) setTiktokData(data)
      })
      .catch(() => {
        if (!cancelled) setTiktokError(true)
      })
    return () => {
      cancelled = true
    }
  }, [url, isTikTok])

  if (!youtubeId && !isTikTok) return null

  if (youtubeId) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 flex items-center gap-3 overflow-hidden rounded-lg border border-neutral-lighter bg-white transition hover:border-primary-300"
      >
        <img
          src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
          alt="Thumbnail video YouTube"
          className="h-16 w-28 shrink-0 object-cover"
        />
        <span className="truncate pr-3 text-sm font-medium text-primary-600">Buka video YouTube</span>
      </a>
    )
  }

  if (tiktokError) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="mt-2 block break-all text-sm text-primary-600 underline">
        {url}
      </a>
    )
  }

  if (!tiktokData) {
    return <div className="mt-2 h-16 w-full animate-pulse rounded-lg bg-surface-gray" />
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 flex items-center gap-3 overflow-hidden rounded-lg border border-neutral-lighter bg-white transition hover:border-primary-300"
    >
      <img src={tiktokData.thumbnail_url} alt="Thumbnail video TikTok" className="h-16 w-16 shrink-0 object-cover" />
      <span className="truncate pr-3 text-sm font-medium text-primary-600">{tiktokData.title || 'Buka video TikTok'}</span>
    </a>
  )
}

// Komponen pemilih icon untuk pilihan voting: tombol trigger + grid icon lucide-react.
function IconPicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const SelectedIcon = getOptionIcon(value)

  return (
    <div className="relative shrink-0" ref={wrapperRef}>
      <button
        type="button"
        className={`flex h-11 w-[52px] items-center justify-center rounded-md border transition-colors hover:border-primary-300 ${
          open ? 'border-primary-600 shadow-focus-ring' : 'border-neutral-light'
        } ${value ? 'text-primary-600' : 'text-text-disabled'}`}
        onClick={() => setOpen((prev) => !prev)}
        title="Pilih icon"
      >
        <SelectedIcon size={20} />
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-20 grid max-h-[220px] w-[264px] grid-cols-6 gap-1 overflow-y-auto rounded-lg border border-neutral-lighter bg-white p-3 shadow-elevated">
          {OPTION_ICONS.map(({ name, label, Icon }) => (
            <button
              key={name}
              type="button"
              className={`flex h-9 w-9 items-center justify-center rounded-sm border transition-colors ${
                value === name
                  ? 'border-primary-200 bg-primary-50 text-primary-600'
                  : 'border-transparent text-text-tertiary hover:bg-surface-gray'
              }`}
              onClick={() => {
                onChange(name)
                setOpen(false)
              }}
              title={label}
            >
              <Icon size={18} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Info tambahan per pilihan voting (cara bermain + aturan/referensi video), bisa dibuka/tutup.
// Dipakai di kartu voting DAN di halaman status (sudah voting / terima kasih) — makanya
// selalu stopPropagation, biar aman dipasang di dalam elemen yang bisa diklik (vote-card).
function LombaInfo({ option }) {
  const [expanded, setExpanded] = useState(false)
  const caraBermain = option?.cara_bermain?.trim()
  const aturan = option?.aturan_referensi?.trim()

  if (!caraBermain && !aturan) return null

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setExpanded((prev) => !prev)
        }}
        className="mx-auto flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:underline"
      >
        Cara Bermain & Aturan
        <ChevronDown size={16} className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <div className="mt-3 space-y-3 rounded-lg bg-primary-50 p-4 text-left">
          {caraBermain && (
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-primary-700">Cara Bermain</p>
              <p className="whitespace-pre-line text-sm text-text-tertiary">{linkify(caraBermain)}</p>
              {extractUrls(caraBermain).map((url, i) => (
                <VideoPreview key={`${url}-${i}`} url={url} />
              ))}
            </div>
          )}
          {aturan && (
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-primary-700">Aturan & Referensi Video</p>
              <p className="whitespace-pre-line text-sm text-text-tertiary">{linkify(aturan)}</p>
              {extractUrls(aturan).map((url, i) => (
                <VideoPreview key={`${url}-${i}`} url={url} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Satu kartu pilihan voting (dipisah jadi komponen sendiri supaya dropdown info-nya
// punya state buka/tutup masing-masing, independen antar kartu).
function VoteCard({ option, loading, onVote }) {
  const OptionIcon = getOptionIcon(option.icon)
  return (
    <div
      className="cursor-pointer rounded-xl border border-neutral-lighter bg-white p-6 text-center shadow-card transition duration-200 hover:-translate-y-1 hover:border-primary-300 hover:shadow-elevated"
      onClick={() => !loading && onVote(option)}
    >
      <div className="mb-3 flex justify-center text-primary-600">
        <OptionIcon size={40} />
      </div>
      <h3 className="mb-2 text-lg">{option.title}</h3>
      <p className="min-h-12 text-base leading-6 text-text-secondary">{option.description}</p>
      <div className="my-3">
        <LombaInfo option={option} />
      </div>
      <button className={BTN_PRIMARY} disabled={loading}>
        {loading ? 'Memproses...' : 'Pilih'}
      </button>
    </div>
  )
}

// Topbar biru — tampil di semua halaman setelah login (voting siswa & admin). Cuma nama, tanpa logo.
function TopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 w-full shrink-0 items-center justify-center bg-primary-600">
      <span className="font-heading text-lg font-extrabold tracking-widest text-white">VOTAS</span>
    </header>
  )
}

// Modal konfirmasi custom (pengganti window.confirm bawaan browser yang tampilannya nggak matching)
function ConfirmModal({ open, title, message, confirmText, danger = true, icon: Icon = Trash2, onConfirm, onCancel }) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => e.key === 'Escape' && onCancel()
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onCancel}
    >
      <div
        className="fade-in-up w-full max-w-sm rounded-xl bg-white p-6 text-center shadow-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${
            danger ? 'bg-danger-bg text-danger' : 'bg-primary-50 text-primary-600'
          }`}
        >
          <Icon size={22} />
        </div>
        <h3 className="mb-2 text-lg">{title}</h3>
        <p className="mb-6 text-sm leading-6 text-text-secondary">{message}</p>
        <div className="flex gap-3">
          <button className={`${BTN_GRAY} flex-1`} onClick={onCancel}>
            Batal
          </button>
          <button className={`${danger ? BTN_DANGER : BTN_PRIMARY} flex-1`} onClick={onConfirm} autoFocus>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  // ---------- STATE ----------
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [hasVoted, setHasVoted] = useState(false)
  const [votedData, setVotedData] = useState(null)
  const [page, setPage] = useState('login') // 'login' | 'voting' | 'thankyou' | 'already' | 'admin'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [loginData, setLoginData] = useState({ nama: '', password: '' })
  const [adminData, setAdminData] = useState({ username: '', password: '' })
  const [showAdminLogin, setShowAdminLogin] = useState(false)
  const [showStudentPassword, setShowStudentPassword] = useState(false)
  const [showAdminPassword, setShowAdminPassword] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState(null) // { title, message, confirmText, onConfirm } | null
  const [votingResults, setVotingResults] = useState([]) // statistik per pilihan (+ persentase)
  const [totalVotes, setTotalVotes] = useState(0)
  const [allVotes, setAllVotes] = useState([]) // data mentah semua vote, untuk tabel & export CSV
  const [votingOptions, setVotingOptions] = useState([]) // sekarang dari Supabase, bukan hardcoded
  const [optionForm, setOptionForm] = useState({
    id: null,
    title: '',
    description: '',
    icon: '',
    cara_bermain: '',
    aturan_referensi: '',
  }) // form tambah/edit pilihan (admin)

  // Muat pilihan voting sekali saat app dibuka
  useEffect(() => {
    fetchVotingOptions()
  }, [])

  // ---------- FUNCTIONS ----------

  // Ambil daftar pilihan voting dari Supabase
  const fetchVotingOptions = async () => {
    try {
      const { data, error: err } = await supabase.from('voting_options').select('*').order('id', { ascending: true })

      if (err) throw err
      setVotingOptions(data || [])
    } catch (err) {
      console.error(err)
      setError('Gagal memuat pilihan voting.')
    }
  }

  // Cek apakah nama ini sudah pernah voting
  const checkVoteStatus = async (nama) => {
    try {
      // Lewat RPC (SECURITY DEFINER), bukan select langsung — tabel votes sekarang
      // cuma bisa di-SELECT oleh admin. RPC ini cuma balikin baris punya nama sendiri.
      const { data, error: err } = await supabase.rpc('check_vote_by_nama', { p_nama: nama })

      if (err) throw err

      if (data && data.length > 0) {
        setHasVoted(true)
        setVotedData(data[0])
        setPage('already')
      } else {
        setHasVoted(false)
        setVotedData(null)
        setPage('voting')
      }
    } catch (err) {
      console.error(err)
      setError('Gagal memeriksa status voting. Coba lagi.')
    }
  }

  // Login siswa
  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const match = accounts.find(
      (acc) =>
        acc.nama.trim().toLowerCase() === loginData.nama.trim().toLowerCase() &&
        acc.password === loginData.password
    )

    if (!match) {
      setError('Nama atau password salah!')
      setLoading(false)
      return
    }

    setCurrentUser(match)
    setIsLoggedIn(true)
    await checkVoteStatus(match.nama)
    setLoading(false)
  }

  // Login admin — pakai Supabase Auth beneran (bukan hardcoded lagi).
  // Username diketik biasa, di-mapping ke email tetap sebelum dikirim ke Supabase Auth.
  const handleAdminLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const usernameClean = adminData.username.trim().toLowerCase()
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: `${usernameClean}@${ADMIN_EMAIL_DOMAIN}`,
      password: adminData.password,
    })

    if (authErr) {
      setError('Username atau password admin salah!')
      setLoading(false)
      return
    }

    setIsAdmin(true)
    setIsLoggedIn(true)
    setPage('admin')
    await fetchVotingOptions()
    await fetchAllVotes() // fetchAllVotes yang akan matikan loading di akhir
  }

  // Ambil semua data voting untuk dashboard admin (statistik + tabel)
  const fetchAllVotes = async () => {
    setLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('votes')
        .select('*')
        .order('timestamp', { ascending: false })

      if (err) throw err

      const votes = data || []
      setAllVotes(votes)
      setTotalVotes(votes.length)

      const results = votingOptions.map((opt) => {
        const count = votes.filter((v) => v.pilihan === opt.title).length
        const percentage = votes.length > 0 ? ((count / votes.length) * 100).toFixed(1) : 0
        return { ...opt, count, percentage }
      })
      setVotingResults(results)
    } catch (err) {
      console.error(err)
      setError('Gagal mengambil data voting.')
    } finally {
      setLoading(false)
    }
  }

  // Klik "Pilih" -> tampilkan modal konfirmasi dulu, belum langsung submit ke Supabase
  const handleVote = (option) => {
    setConfirmDialog({
      title: 'Konfirmasi Pilihan',
      message: `Yakin mau pilih "${option.title}"? Setelah dikonfirmasi, pilihan tidak bisa diubah lagi.`,
      confirmText: 'Ya, Pilih Ini',
      danger: false,
      icon: CircleCheckBig,
      onConfirm: () => doVote(option),
    })
  }

  const doVote = async (option) => {
    setConfirmDialog(null)
    setLoading(true)
    setError('')
    try {
      const { error: err } = await supabase.from('votes').insert([
        {
          nama: currentUser.nama,
          pilihan: option.title,
          timestamp: new Date().toISOString(),
        },
      ])

      if (err) throw err

      setVotedData({
        nama: currentUser.nama,
        pilihan: option.title,
        timestamp: new Date().toISOString(),
      })
      setPage('thankyou')
    } catch (err) {
      console.error(err)
      setError('Gagal menyimpan suara. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  // Reset semua state ke default (dipakai tombol Logout)
  const handleLogout = async () => {
    await supabase.auth.signOut() // no-op kalau yang logout siswa (nggak pernah auth ke Supabase)
    setIsLoggedIn(false)
    setCurrentUser(null)
    setIsAdmin(false)
    setHasVoted(false)
    setVotedData(null)
    setPage('login')
    setLoading(false)
    setError('')
    setLoginData({ nama: '', password: '' })
    setAdminData({ username: '', password: '' })
    setShowAdminLogin(false)
    setVotingResults([])
    setTotalVotes(0)
    setAllVotes([])
    setOptionForm({ id: null, title: '', description: '', icon: '', cara_bermain: '', aturan_referensi: '' })
  }

  const toggleAdminLogin = () => {
    setShowAdminLogin((prev) => !prev)
    setError('')
  }

  // Export tabel voting ke CSV (fitur opsional admin)
  const exportCSV = () => {
    const header = ['No', 'Nama', 'Pilihan', 'Waktu']
    const rows = allVotes.map((v, i) => [
      i + 1,
      `"${v.nama}"`,
      `"${v.pilihan}"`,
      `"${new Date(v.timestamp).toLocaleString('id-ID')}"`,
    ])
    const csvContent = [header, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'hasil_voting.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Reset form tambah/edit pilihan voting
  const resetOptionForm = () => {
    setOptionForm({ id: null, title: '', description: '', icon: '', cara_bermain: '', aturan_referensi: '' })
  }

  // Mulai mode edit: isi form dengan data pilihan yang dipilih
  const handleEditOption = (option) => {
    setOptionForm({
      id: option.id,
      title: option.title,
      description: option.description || '',
      icon: option.icon,
      cara_bermain: option.cara_bermain || '',
      aturan_referensi: option.aturan_referensi || '',
    })
    setError('')
  }

  // Tambah pilihan voting baru
  const handleAddOption = async (e) => {
    e.preventDefault()
    if (!optionForm.title.trim() || !optionForm.icon.trim()) {
      setError('Judul dan icon pilihan wajib diisi.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const { error: err } = await supabase.from('voting_options').insert([
        {
          title: optionForm.title.trim(),
          description: optionForm.description.trim(),
          icon: optionForm.icon.trim(),
          cara_bermain: optionForm.cara_bermain.trim(),
          aturan_referensi: optionForm.aturan_referensi.trim(),
        },
      ])

      if (err) throw err
      resetOptionForm()
      await fetchVotingOptions()
    } catch (err) {
      console.error(err)
      setError('Gagal menambah pilihan voting.')
    } finally {
      setLoading(false)
    }
  }

  // Simpan perubahan pilihan voting yang sedang diedit
  const handleUpdateOption = async (e) => {
    e.preventDefault()
    if (!optionForm.title.trim() || !optionForm.icon.trim()) {
      setError('Judul dan icon pilihan wajib diisi.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const oldOption = votingOptions.find((o) => o.id === optionForm.id)
      const newTitle = optionForm.title.trim()

      const { error: err } = await supabase
        .from('voting_options')
        .update({
          title: newTitle,
          description: optionForm.description.trim(),
          icon: optionForm.icon.trim(),
          cara_bermain: optionForm.cara_bermain.trim(),
          aturan_referensi: optionForm.aturan_referensi.trim(),
        })
        .eq('id', optionForm.id)

      if (err) throw err

      // Kalau judul berubah, sinkronkan juga ke suara lama biar histori tetap nyambung
      if (oldOption && oldOption.title !== newTitle) {
        await supabase.from('votes').update({ pilihan: newTitle }).eq('pilihan', oldOption.title)
      }

      resetOptionForm()
      await fetchVotingOptions()
    } catch (err) {
      console.error(err)
      setError('Gagal menyimpan perubahan pilihan.')
    } finally {
      setLoading(false)
    }
  }

  // Hapus pilihan voting (dengan konfirmasi, dan peringatan kalau sudah ada suara masuk)
  const handleDeleteOption = async (option) => {
    let voteCount = 0
    try {
      const { count } = await supabase
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .eq('pilihan', option.title)
      voteCount = count || 0
    } catch (err) {
      console.error(err)
    }

    const message =
      voteCount > 0
        ? `"${option.title}" sudah punya ${voteCount} suara masuk. Suara lama tidak akan hilang, tapi tidak akan tampil lagi di statistik. Tetap hapus?`
        : `Hapus pilihan "${option.title}"?`

    setConfirmDialog({
      title: 'Hapus Pilihan Voting?',
      message,
      confirmText: 'Ya, Hapus',
      onConfirm: () => doDeleteOption(option),
    })
  }

  const doDeleteOption = async (option) => {
    setConfirmDialog(null)
    setLoading(true)
    setError('')
    try {
      const { error: err } = await supabase.from('voting_options').delete().eq('id', option.id)
      if (err) throw err
      await fetchVotingOptions()
    } catch (err) {
      console.error(err)
      setError('Gagal menghapus pilihan voting.')
    } finally {
      setLoading(false)
    }
  }

  // Hapus satu data voting (dengan konfirmasi)
  const handleDeleteVote = (vote) => {
    setConfirmDialog({
      title: 'Hapus Suara Ini?',
      message: `Hapus suara dari "${vote.nama}" (pilihan: ${vote.pilihan})?`,
      confirmText: 'Ya, Hapus',
      onConfirm: () => doDeleteVote(vote),
    })
  }

  const doDeleteVote = async (vote) => {
    setConfirmDialog(null)
    setLoading(true)
    setError('')
    try {
      const { error: err } = await supabase.from('votes').delete().eq('id', vote.id)
      if (err) throw err
      await fetchAllVotes()
    } catch (err) {
      console.error(err)
      setError('Gagal menghapus data voting.')
    } finally {
      setLoading(false)
    }
  }

  // Hapus SEMUA data voting sekaligus (dengan konfirmasi, karena permanen & tidak bisa dibatalkan)
  const handleDeleteAllVotes = () => {
    if (allVotes.length === 0) return
    setConfirmDialog({
      title: 'Hapus Semua Data Voting?',
      message: `Hapus SEMUA ${allVotes.length} data voting? Tindakan ini permanen dan tidak bisa dibatalkan.`,
      confirmText: 'Ya, Hapus Semua',
      onConfirm: doDeleteAllVotes,
    })
  }

  const doDeleteAllVotes = async () => {
    setConfirmDialog(null)
    setLoading(true)
    setError('')
    try {
      const { error: err } = await supabase.from('votes').delete().gt('id', 0)
      if (err) throw err
      await fetchAllVotes()
    } catch (err) {
      console.error(err)
      setError('Gagal menghapus semua data voting.')
    } finally {
      setLoading(false)
    }
  }

  // ---------- RENDER: LOGIN ----------
  const renderLogin = () => (
    <div className="fade-in-up flex min-h-screen w-full flex-col items-center justify-center gap-6 p-4">
      <div className="flex items-center justify-center gap-5">
        <img src="/mpk.png" alt="MPK SMA Negeri 13 Pontianak" className="h-14 w-auto sm:h-16" />
        <img src="/smantas.png" alt="SMA Negeri 13 Pontianak" className="h-14 w-auto sm:h-16" />
        <img src="/osis.png" alt="OSIS SMA Negeri 13 Pontianak" className="h-14 w-auto sm:h-16" />
      </div>
      <div className="w-full max-w-[640px] rounded-xl border border-neutral-lighter bg-white p-6 px-4 shadow-card sm:px-6">
        <h1 className="mb-2 flex items-center justify-center gap-2.5 text-center text-2xl leading-tight sm:text-[30px]">
          <Vote size={28} strokeWidth={2.5} /> SISTEM VOTING
        </h1>
        <p className="mb-6 text-center text-base text-text-secondary">Masuk untuk memberikan suaramu</p>

        {!showAdminLogin ? (
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label htmlFor="nama" className="mb-2 block text-sm font-semibold leading-5 text-text-tertiary">
                Nama
              </label>
              <input
                id="nama"
                type="text"
                value={loginData.nama}
                onChange={(e) => setLoginData({ ...loginData, nama: e.target.value })}
                placeholder="Masukkan nama lengkap"
                required
                className={INPUT_FIELD}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="password" className="mb-2 block text-sm font-semibold leading-5 text-text-tertiary">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showStudentPassword ? 'text' : 'password'}
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  placeholder="Masukkan password"
                  required
                  className={INPUT_FIELD_PW}
                />
                <button
                  type="button"
                  onClick={() => setShowStudentPassword((v) => !v)}
                  className={`${ICON_BTN} absolute right-1 top-1/2 -translate-y-1/2`}
                  tabIndex={-1}
                  aria-label={showStudentPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showStudentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            {error && <p className={ERROR_MESSAGE}>{error}</p>}
            <button type="submit" className={BTN_PRIMARY} disabled={loading}>
              {loading ? 'Memproses...' : 'Login'}
            </button>
            <button type="button" className={LINK_BUTTON} onClick={toggleAdminLogin}>
              Login sebagai Admin
            </button>
          </form>
        ) : (
          <form onSubmit={handleAdminLogin} className="mt-6 border-t border-neutral-lighter pt-6">
            <div className="mb-4">
              <label htmlFor="admin-username" className="mb-2 block text-sm font-semibold leading-5 text-text-tertiary">
                Username
              </label>
              <input
                id="admin-username"
                type="text"
                value={adminData.username}
                onChange={(e) => setAdminData({ ...adminData, username: e.target.value })}
                placeholder="Username admin"
                required
                className={INPUT_FIELD}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="admin-password" className="mb-2 block text-sm font-semibold leading-5 text-text-tertiary">
                Password
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showAdminPassword ? 'text' : 'password'}
                  value={adminData.password}
                  onChange={(e) => setAdminData({ ...adminData, password: e.target.value })}
                  placeholder="Password admin"
                  required
                  className={INPUT_FIELD_PW}
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPassword((v) => !v)}
                  className={`${ICON_BTN} absolute right-1 top-1/2 -translate-y-1/2`}
                  tabIndex={-1}
                  aria-label={showAdminPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showAdminPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            {error && <p className={ERROR_MESSAGE}>{error}</p>}
            <button type="submit" className={BTN_ACCENT} disabled={loading}>
              {loading ? 'Memproses...' : 'Login Admin'}
            </button>
            <button type="button" className={LINK_BUTTON} onClick={toggleAdminLogin}>
              Kembali ke Login Siswa
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-text-disabled">
          Password: <strong>VOTING</strong> (huruf kapital)
        </p>
      </div>
    </div>
  )

  // ---------- RENDER: VOTING ----------
  const renderVoting = () => (
    <>
      <TopBar />
      <div className="fade-in-up mx-auto w-full max-w-[1280px] px-8 py-12">
        <div className="mb-12 text-center">
          <h1 className="mb-2 text-2xl sm:text-[30px]">Halo, {currentUser?.nama}!</h1>
          <p className="text-base text-text-secondary">Silakan pilih salah satu opsi di bawah ini</p>
        </div>
        {votingOptions.length === 0 ? (
          <p className={EMPTY_TEXT}>Pilihan voting belum tersedia. Coba refresh halaman.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {votingOptions.map((option) => (
              <VoteCard key={option.id} option={option} loading={loading} onVote={handleVote} />
            ))}
          </div>
        )}
        {error && <p className={`${ERROR_MESSAGE} mt-4 text-center`}>{error}</p>}
      </div>
    </>
  )

  // ---------- RENDER: SUDAH VOTING ----------
  const renderAlreadyVoted = () => {
    const votedOption = votingOptions.find((o) => o.title === votedData?.pilihan)
    return (
      <>
        <TopBar />
        <div className="fade-in-up flex w-full flex-1 items-center justify-center p-4">
          <div className="w-full max-w-[640px] rounded-xl border border-neutral-lighter bg-white p-6 px-4 text-center shadow-card sm:px-6">
            <div className="mb-4 flex justify-center text-primary-600">
              <CircleCheckBig size={64} />
            </div>
            <h1 className="text-2xl sm:text-[30px]">Anda Sudah Voting!</h1>
            <div className="my-6 rounded-lg bg-primary-50 p-4 text-left">
              <p className="mb-2 text-sm text-text-tertiary">
                <strong>Nama:</strong> {votedData?.nama}
              </p>
              <p className="mb-2 text-sm text-text-tertiary">
                <strong>Pilihan:</strong> {votedData?.pilihan}
              </p>
              <p className="mb-0 text-sm text-text-tertiary">
                <strong>Waktu:</strong>{' '}
                {votedData?.timestamp ? new Date(votedData.timestamp).toLocaleString('id-ID') : '-'}
              </p>
            </div>
            <div className="mb-6">
              <LombaInfo option={votedOption} />
            </div>
            <p className="mb-6 text-base text-text-secondary">Terima kasih telah berpartisipasi!</p>
            <button className={BTN_GRAY} onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </>
    )
  }

  // ---------- RENDER: THANK YOU ----------
  const renderThankYou = () => {
    const votedOption = votingOptions.find((o) => o.title === votedData?.pilihan)
    return (
      <>
        <TopBar />
        <div className="fade-in-up flex w-full flex-1 items-center justify-center p-4">
          <div className="w-full max-w-[640px] rounded-xl border border-neutral-lighter bg-white p-6 px-4 text-center shadow-card sm:px-6">
            <div className="mb-4 flex justify-center text-primary-600">
              <PartyPopper size={64} />
            </div>
            <h1 className="text-2xl sm:text-[30px]">Suara Berhasil Tersimpan!</h1>
            <p className="my-4 text-lg text-text-tertiary">Terima kasih, {votedData?.nama}!</p>
            <div className="mb-3 inline-block rounded-full border border-primary-200 bg-primary-50 px-5 py-2 font-semibold text-primary-700">
              {votedData?.pilihan}
            </div>
            <div className="mb-6">
              <LombaInfo option={votedOption} />
            </div>
            <p className="mb-6 text-base text-text-secondary">Suara Anda sangat berarti untuk kami!</p>
            <button className={BTN_GRAY} onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </>
    )
  }

  // ---------- RENDER: ADMIN DASHBOARD ----------
  const renderAdmin = () => (
    <>
      <TopBar />
      <div className="fade-in-up mx-auto w-full max-w-[1280px] px-8 py-12">
      <div className="mb-12 flex flex-col items-start gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h1 className="mb-1 flex items-center gap-2.5 text-2xl sm:text-[28px]">
            <Crown size={26} /> Dashboard Admin
          </h1>
          <p className="text-base text-text-secondary">
            Total Voting: {totalVotes}{' '}
            <span className="ml-2 inline-block rounded-lg border border-primary-200 bg-primary-50 px-3 py-1 align-middle text-xs font-semibold text-primary-700">
              Live
            </span>
          </p>
        </div>
        <button className={BTN_GRAY} onClick={handleLogout}>
          Logout
        </button>
      </div>

      {loading ? (
        <p className="py-8 text-center text-base text-text-disabled">Memuat data...</p>
      ) : (
        <>
          <div className="mb-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {votingResults.map((r) => {
              const StatIcon = getOptionIcon(r.icon)
              return (
                <div key={r.id} className="rounded-xl border border-neutral-lighter bg-white p-4 text-center shadow-card">
                  <div className="mb-1.5 flex justify-center text-primary-600">
                    <StatIcon size={20} />
                  </div>
                  <h3 className="mb-1.5 truncate text-sm" title={r.title}>{r.title}</h3>
                  <p className="mb-2 font-heading text-xl font-extrabold text-primary-600">{r.count} suara</p>
                  <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-surface-gray">
                    <div
                      className="h-full bg-primary-600 transition-[width] duration-500"
                      style={{ width: `${r.percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-text-secondary">{r.percentage}%</p>
                </div>
              )
            })}
          </div>

          <div className="mb-8 rounded-xl border border-neutral-lighter bg-white p-6 shadow-card">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg">Kelola Pilihan Voting</h2>
            </div>

            <form onSubmit={optionForm.id ? handleUpdateOption : handleAddOption} className="mb-5 rounded-lg border border-neutral-lighter bg-surface-subtle p-4">
              <div className="mb-3 flex items-center gap-3">
                <IconPicker
                  value={optionForm.icon}
                  onChange={(name) => setOptionForm({ ...optionForm, icon: name })}
                />
                <input
                  type="text"
                  value={optionForm.title}
                  onChange={(e) => setOptionForm({ ...optionForm, title: e.target.value })}
                  placeholder="Judul pilihan"
                  required
                  className="min-w-0 flex-1 rounded-md border border-neutral-light px-3.5 py-2.5 text-sm text-text-primary focus:border-primary-600 focus:shadow-focus-ring focus:outline-none"
                />
              </div>
              <textarea
                value={optionForm.description}
                onChange={(e) => setOptionForm({ ...optionForm, description: e.target.value })}
                placeholder="Deskripsi singkat (opsional)"
                className="mb-3 min-h-14 w-full resize-y rounded-md border border-neutral-light px-3.5 py-2.5 text-sm text-text-primary focus:border-primary-600 focus:shadow-focus-ring focus:outline-none"
              />
              <textarea
                value={optionForm.cara_bermain}
                onChange={(e) => setOptionForm({ ...optionForm, cara_bermain: e.target.value })}
                placeholder="Cara bermain (opsional)"
                className="mb-3 min-h-14 w-full resize-y rounded-md border border-neutral-light px-3.5 py-2.5 text-sm text-text-primary focus:border-primary-600 focus:shadow-focus-ring focus:outline-none"
              />
              <textarea
                value={optionForm.aturan_referensi}
                onChange={(e) => setOptionForm({ ...optionForm, aturan_referensi: e.target.value })}
                placeholder="Aturan & referensi video, misal link TikTok (opsional)"
                className="mb-1 min-h-14 w-full resize-y rounded-md border border-neutral-light px-3.5 py-2.5 text-sm text-text-primary focus:border-primary-600 focus:shadow-focus-ring focus:outline-none"
              />
              <p className="mb-3 text-xs text-text-disabled">Link (TikTok, dll) yang ditempel di sini otomatis jadi bisa diklik.</p>
              <div className="flex gap-2">
                <button type="submit" className={BTN_PRIMARY_SM} disabled={loading}>
                  {optionForm.id ? 'Simpan Perubahan' : '+ Tambah Pilihan'}
                </button>
                {optionForm.id && (
                  <button type="button" className={BTN_GRAY_SM} onClick={resetOptionForm}>
                    Batal
                  </button>
                )}
              </div>
            </form>

            {votingOptions.length === 0 ? (
              <p className={EMPTY_TEXT}>Belum ada pilihan voting</p>
            ) : (
              <div className="flex flex-col gap-2">
                {votingOptions.map((opt) => {
                  const OptIcon = getOptionIcon(opt.icon)
                  return (
                    <div key={opt.id} className="flex items-center gap-3 rounded-md border border-neutral-lighter p-3">
                      <span className="flex shrink-0 items-center text-primary-600">
                        <OptIcon size={20} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <strong className="block text-sm text-text-primary">{opt.title}</strong>
                        {opt.description && <p className="mt-0.5 text-[13px] text-text-secondary">{opt.description}</p>}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button className={ICON_BTN} onClick={() => handleEditOption(opt)} title="Edit">
                          <Pencil size={16} />
                        </button>
                        <button className={ICON_BTN_DANGER} onClick={() => handleDeleteOption(opt)} title="Hapus">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-neutral-lighter bg-white p-6 shadow-card">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg">Daftar Voting</h2>
              {allVotes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <button className={BTN_PRIMARY_SM} onClick={exportCSV}>
                    <Download size={16} /> Export CSV
                  </button>
                  <button className={BTN_DANGER_SM} onClick={handleDeleteAllVotes} disabled={loading}>
                    <Trash2 size={16} /> Hapus Semua
                  </button>
                </div>
              )}
            </div>

            {allVotes.length === 0 ? (
              <p className={EMPTY_TEXT}>Belum ada voting</p>
            ) : (
              <div className="max-h-[480px] overflow-x-auto overflow-y-auto rounded-md">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="sticky top-0 bg-primary-50 px-4 py-3 text-left text-[13px] font-bold text-primary-700">No</th>
                      <th className="sticky top-0 bg-primary-50 px-4 py-3 text-left text-[13px] font-bold text-primary-700">Nama</th>
                      <th className="sticky top-0 bg-primary-50 px-4 py-3 text-left text-[13px] font-bold text-primary-700">Pilihan</th>
                      <th className="sticky top-0 bg-primary-50 px-4 py-3 text-left text-[13px] font-bold text-primary-700">Waktu</th>
                      <th className="sticky top-0 bg-primary-50 px-4 py-3 text-right text-[13px] font-bold text-primary-700">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allVotes.map((v, i) => (
                      <tr key={v.id} className="even:bg-surface-subtle">
                        <td className="border-t border-surface-gray px-4 py-3 text-sm text-text-primary">{i + 1}</td>
                        <td className="border-t border-surface-gray px-4 py-3 text-sm text-text-primary">{v.nama}</td>
                        <td className="border-t border-surface-gray px-4 py-3 text-sm text-text-primary">{v.pilihan}</td>
                        <td className="border-t border-surface-gray px-4 py-3 text-sm text-text-primary">
                          {new Date(v.timestamp).toLocaleString('id-ID')}
                        </td>
                        <td className="border-t border-surface-gray px-4 py-3 text-right text-sm">
                          <button className={ICON_BTN_DANGER} onClick={() => handleDeleteVote(v)} title="Hapus suara ini" disabled={loading}>
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
      </div>
    </>
  )

  // ---------- MAIN RENDER ----------
  return (
    <div className="flex min-h-screen flex-col">
      {page === 'login' && renderLogin()}
      {page === 'voting' && renderVoting()}
      {page === 'already' && renderAlreadyVoted()}
      {page === 'thankyou' && renderThankYou()}
      {page === 'admin' && renderAdmin()}
      <ConfirmModal
        open={!!confirmDialog}
        title={confirmDialog?.title}
        message={confirmDialog?.message}
        confirmText={confirmDialog?.confirmText}
        danger={confirmDialog?.danger}
        icon={confirmDialog?.icon}
        onConfirm={confirmDialog?.onConfirm}
        onCancel={() => setConfirmDialog(null)}
      />
    </div>
  )
}
