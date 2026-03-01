import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

const API = ''

async function authFetch(url, body) {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })
    const contentType = res.headers.get('content-type') || ''
    const data = contentType.includes('application/json') ? await res.json() : { detail: await res.text() }
    if (!res.ok) throw new Error(data?.detail || 'Request failed')
    return data
}

export default function AuthPage() {
    const [tab, setTab] = useState('login')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const { login } = useAuth()
    const navigate = useNavigate()

    const submit = async (e) => {
        e.preventDefault()
        setError('')

        if (tab === 'register' && password !== confirmPassword) {
            setError('Passwords do not match.')
            return
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters.')
            return
        }

        setLoading(true)
        try {
            const endpoint = tab === 'login' ? '/login' : '/register'
            const data = await authFetch(`${API}${endpoint}`, { email, password })
            login(data.access_token, { email: data.email })
            navigate('/app')
        } catch (e) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="auth-page">
            {/* Background blobs */}
            <div className="auth-blob auth-blob-1" />
            <div className="auth-blob auth-blob-2" />

            <div className="auth-card">
                {/* Logo */}
                <div className="auth-logo">
                    <div className="logo-icon">🧠</div>
                    <span className="logo-text">AI Document Assistant</span>
                </div>

                <h1 className="auth-title">
                    {tab === 'login' ? 'Welcome back' : 'Create your account'}
                </h1>
                <p className="auth-sub">
                    {tab === 'login'
                        ? 'Sign in to access your documents'
                        : 'Start chatting with your documents for free'}
                </p>

                {/* Tab switcher */}
                <div className="auth-tabs">
                    <button
                        className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
                        onClick={() => { setTab('login'); setError('') }}
                        type="button"
                    >
                        Sign In
                    </button>
                    <button
                        className={`auth-tab ${tab === 'register' ? 'active' : ''}`}
                        onClick={() => { setTab('register'); setError('') }}
                        type="button"
                    >
                        Register
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={submit} className="auth-form">
                    <div className="auth-field">
                        <label>Email address</label>
                        <input
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>

                    <div className="auth-field">
                        <label>Password</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                    </div>

                    {tab === 'register' && (
                        <div className="auth-field">
                            <label>Confirm Password</label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                    )}

                    {error && (
                        <div className="auth-error">
                            ❌ {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: 8 }}
                        disabled={loading}
                    >
                        {loading ? (
                            <><div className="spinner" />
                                {tab === 'login' ? 'Signing in...' : 'Creating account...'}</>
                        ) : (
                            tab === 'login' ? '🚀 Sign In' : '✨ Create Account'
                        )}
                    </button>
                </form>

                <p className="auth-footer">
                    {tab === 'login'
                        ? <>Don't have an account? <button type="button" className="auth-link" onClick={() => setTab('register')}>Register free →</button></>
                        : <>Already have an account? <button type="button" className="auth-link" onClick={() => setTab('login')}>Sign in →</button></>
                    }
                </p>
            </div>
        </div>
    )
}
