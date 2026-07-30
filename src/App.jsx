/**
 * App.jsx — Sistem Voting
 * Semua state, logic, dan render UI ada di satu file ini (sesuai struktur project).
 */
import { useState } from 'react'
import { supabase } from './supabase'
import { accounts, votingOptions, adminAccount } from './data'

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
  const [votingResults, setVotingResults] = useState([]) // statistik per pilihan (+ persentase)
  const [totalVotes, setTotalVotes] = useState(0)
  const [allVotes, setAllVotes] = useState([]) // data mentah semua vote, untuk tabel & export CSV

  // ---------- FUNCTIONS ----------

  // Cek apakah nama ini sudah pernah voting
  const checkVoteStatus = async (nama) => {
    try {
      const { data, error: err } = await supabase.from('votes').select('*').eq('nama', nama).limit(1)

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

  // Login admin
  const handleAdminLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (adminData.username === adminAccount.username && adminData.password === adminAccount.password) {
      setIsAdmin(true)
      setIsLoggedIn(true)
      setPage('admin')
      await fetchAllVotes() // fetchAllVotes yang akan matikan loading di akhir
    } else {
      setError('Username atau password admin salah!')
      setLoading(false)
    }
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

  // Simpan pilihan voting siswa
  const handleVote = async (option) => {
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
  const handleLogout = () => {
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

  // ---------- RENDER: LOGIN ----------
  const renderLogin = () => (
    <div className="page-center fade-in-up">
      <div className="card login-card">
        <h1 className="login-title">🗳️ SISTEM VOTING</h1>
        <p className="login-subtitle">Masuk untuk memberikan suaramu</p>

        {!showAdminLogin ? (
          <form onSubmit={handleLogin} className="form">
            <div className="form-group">
              <label htmlFor="nama">Nama</label>
              <input
                id="nama"
                type="text"
                value={loginData.nama}
                onChange={(e) => setLoginData({ ...loginData, nama: e.target.value })}
                placeholder="Masukkan nama lengkap"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                placeholder="Masukkan password"
                required
              />
            </div>
            {error && <p className="error-message">{error}</p>}
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Memproses...' : 'Login'}
            </button>
            <button type="button" className="link-button" onClick={toggleAdminLogin}>
              Login sebagai Admin
            </button>
          </form>
        ) : (
          <form onSubmit={handleAdminLogin} className="form admin-form">
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                value={adminData.username}
                onChange={(e) => setAdminData({ ...adminData, username: e.target.value })}
                placeholder="Username admin"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="admin-password">Password</label>
              <input
                id="admin-password"
                type="password"
                value={adminData.password}
                onChange={(e) => setAdminData({ ...adminData, password: e.target.value })}
                placeholder="Password admin"
                required
              />
            </div>
            {error && <p className="error-message">{error}</p>}
            <button type="submit" className="btn btn-accent" disabled={loading}>
              {loading ? 'Memproses...' : 'Login Admin'}
            </button>
            <button type="button" className="link-button" onClick={toggleAdminLogin}>
              Kembali ke Login Siswa
            </button>
          </form>
        )}

        <p className="login-footer">
          Password: <strong>VOTING</strong> (huruf kapital)
        </p>
      </div>
    </div>
  )

  // ---------- RENDER: VOTING ----------
  const renderVoting = () => (
    <div className="page-container fade-in-up">
      <div className="voting-header">
        <h1>Halo, {currentUser?.nama}! 👋</h1>
        <p>Silakan pilih salah satu opsi di bawah ini</p>
      </div>
      <div className="voting-grid">
        {votingOptions.map((option) => (
          <div key={option.id} className="vote-card" onClick={() => !loading && handleVote(option)}>
            <div className="vote-icon">{option.icon}</div>
            <h3>{option.title}</h3>
            <p>{option.description}</p>
            <button className="btn btn-vote" disabled={loading}>
              {loading ? 'Memproses...' : 'Pilih'}
            </button>
          </div>
        ))}
      </div>
      {error && <p className="error-message center">{error}</p>}
    </div>
  )

  // ---------- RENDER: SUDAH VOTING ----------
  const renderAlreadyVoted = () => (
    <div className="page-center fade-in-up">
      <div className="card status-card">
        <div className="status-icon">✅</div>
        <h1>Anda Sudah Voting!</h1>
        <div className="status-detail">
          <p>
            <strong>Nama:</strong> {votedData?.nama}
          </p>
          <p>
            <strong>Pilihan:</strong> {votedData?.pilihan}
          </p>
          <p>
            <strong>Waktu:</strong>{' '}
            {votedData?.timestamp ? new Date(votedData.timestamp).toLocaleString('id-ID') : '-'}
          </p>
        </div>
        <p className="status-message">Terima kasih telah berpartisipasi! 🙏</p>
        <button className="btn btn-gray" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  )

  // ---------- RENDER: THANK YOU ----------
  const renderThankYou = () => (
    <div className="page-center fade-in-up">
      <div className="card status-card">
        <div className="status-icon">🎉</div>
        <h1>Suara Berhasil Tersimpan!</h1>
        <p className="thankyou-name">Terima kasih, {votedData?.nama}!</p>
        <div className="vote-highlight">{votedData?.pilihan}</div>
        <p className="status-message">Suara Anda sangat berarti untuk kami! 🙌</p>
        <button className="btn btn-gray" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  )

  // ---------- RENDER: ADMIN DASHBOARD ----------
  const renderAdmin = () => (
    <div className="page-container fade-in-up">
      <div className="admin-header">
        <div>
          <h1>👑 Dashboard Admin</h1>
          <p>
            Total Voting: {totalVotes} <span className="badge">Live</span>
          </p>
        </div>
        <button className="btn btn-gray" onClick={handleLogout}>
          Logout
        </button>
      </div>

      {loading ? (
        <p className="loading-text">Memuat data...</p>
      ) : (
        <>
          <div className="stats-grid">
            {votingResults.map((r) => (
              <div key={r.id} className="stat-card">
                <div className="stat-icon">{r.icon}</div>
                <h3>{r.title}</h3>
                <p className="stat-count">{r.count} suara</p>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${r.percentage}%` }} />
                </div>
                <p className="stat-percentage">{r.percentage}%</p>
              </div>
            ))}
          </div>

          <div className="table-section">
            <div className="table-header">
              <h2>Daftar Voting</h2>
              {allVotes.length > 0 && (
                <button className="btn btn-primary-sm" onClick={exportCSV}>
                  ⬇ Export CSV
                </button>
              )}
            </div>

            {allVotes.length === 0 ? (
              <p className="empty-text">Belum ada voting</p>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Nama</th>
                      <th>Pilihan</th>
                      <th>Waktu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allVotes.map((v, i) => (
                      <tr key={v.id}>
                        <td>{i + 1}</td>
                        <td>{v.nama}</td>
                        <td>{v.pilihan}</td>
                        <td>{new Date(v.timestamp).toLocaleString('id-ID')}</td>
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
  )

  // ---------- MAIN RENDER ----------
  return (
    <div className="app">
      {page === 'login' && renderLogin()}
      {page === 'voting' && renderVoting()}
      {page === 'already' && renderAlreadyVoted()}
      {page === 'thankyou' && renderThankYou()}
      {page === 'admin' && renderAdmin()}
    </div>
  )
}
