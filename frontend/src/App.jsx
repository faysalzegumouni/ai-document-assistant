import { useState, useEffect, useRef, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import LandingPage from './LandingPage'
import AuthPage from './AuthPage'
import { AuthProvider, useAuth } from './AuthContext'

const API = ''  // proxy via vite.config.js

// Safe fetch helper — always sends JWT token if available
function useApiFetch() {
    const { token, logout } = useAuth()
    return async (url, options = {}) => {
        const headers = { ...options.headers }
        if (token) headers['Authorization'] = `Bearer ${token}`
        const res = await fetch(url, { ...options, headers })
        let data
        const contentType = res.headers.get('content-type') || ''
        if (contentType.includes('application/json')) {
            data = await res.json()
        } else {
            const text = await res.text()
            try { data = JSON.parse(text) } catch { data = { detail: text || `HTTP ${res.status}` } }
        }
        if (res.status === 401) {
            logout()
            throw new Error('Session expired. Please log in again.')
        }
        if (!res.ok) throw new Error(data?.detail || `Request failed (${res.status})`)
        return data
    }
}

function Toast({ toast, onDismiss }) {
    useEffect(() => {
        const t = setTimeout(onDismiss, 4000)
        return () => clearTimeout(t)
    }, [onDismiss])
    return (
        <div className={`toast ${toast.type}`}>
            <span>{toast.type === 'success' ? '✅' : '❌'}</span>
            {toast.message}
        </div>
    )
}

function Sidebar({ docs, activeDoc, onSelect, onDelete, onUpload, uploading }) {
    const [dragging, setDragging] = useState(false)
    const inputRef = useRef()
    const { user, logout } = useAuth()
    const navigate = useNavigate()

    const handleDrop = useCallback(e => {
        e.preventDefault(); setDragging(false)
        const file = e.dataTransfer.files[0]
        if (file) onUpload(file)
    }, [onUpload])

    const handleLogout = () => { logout(); navigate('/') }

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="sidebar-title">📂 Documents</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{user?.email?.split('@')[0]}</span>
                        <button
                            onClick={handleLogout}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, padding: '2px 4px' }}
                            title="Logout"
                        >⏻</button>
                    </div>
                </div>
                <div
                    className={`upload-zone ${dragging ? 'dragging' : ''}`}
                    style={{ padding: '24px 16px' }}
                    onDragOver={e => { e.preventDefault(); setDragging(true) }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => inputRef.current?.click()}
                >
                    <span className="upload-icon" style={{ fontSize: 28 }}>☁️</span>
                    <p style={{ fontSize: '0.78rem' }}>
                        {uploading ? 'Uploading...' : 'Drop file or click'}
                    </p>
                    <div className="upload-chips" style={{ marginTop: 8 }}>
                        {['PDF', 'DOCX', 'TXT'].map(t => (
                            <span key={t} className="chip">{t}</span>
                        ))}
                    </div>
                    <input
                        ref={inputRef}
                        type="file"
                        accept=".pdf,.docx,.txt"
                        onChange={e => e.target.files[0] && onUpload(e.target.files[0])}
                    />
                </div>
            </div>
            <div className="doc-list">
                {docs.length === 0 && (
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 12 }}>
                        No documents yet
                    </p>
                )}
                {docs.map(doc => (
                    <div
                        key={doc.doc_id}
                        className={`doc-item ${activeDoc?.doc_id === doc.doc_id ? 'active' : ''}`}
                        onClick={() => onSelect(doc)}
                    >
                        <span className="doc-icon">📄</span>
                        <div className="doc-info">
                            <div className="doc-name">{doc.file_name}</div>
                            <div className="doc-date">
                                {doc.upload_date ? new Date(doc.upload_date).toLocaleDateString() : 'Just uploaded'}
                            </div>
                        </div>
                        <button
                            className="doc-delete"
                            onClick={e => { e.stopPropagation(); onDelete(doc.doc_id) }}
                            title="Delete document"
                        >🗑️</button>
                    </div>
                ))}
            </div>
        </aside>
    )
}

function ChatPanel({ activeDoc }) {
    const [messages, setMessages] = useState([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const bottomRef = useRef()
    const apiFetch = useApiFetch()

    useEffect(() => {
        setMessages([{
            role: 'ai',
            content: activeDoc
                ? `Hi! I've loaded **${activeDoc.file_name}**. Ask me anything about it! 🚀`
                : 'Please select a document from the sidebar to start chatting.'
        }])
    }, [activeDoc])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const send = async () => {
        if (!input.trim() || !activeDoc || loading) return
        const question = input.trim()
        setInput('')
        setMessages(m => [...m, { role: 'user', content: question }])
        setLoading(true)
        try {
            const data = await apiFetch(`${API}/ask`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ doc_id: activeDoc.doc_id, question }),
            })
            setMessages(m => [...m, { role: 'ai', content: data.answer }])
        } catch (e) {
            setMessages(m => [...m, { role: 'ai', content: `❌ **Error:** ${e.message}` }])
        } finally {
            setLoading(false)
        }
    }

    const handleKey = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }

    return (
        <>
            <div className="chat-area">
                {messages.map((m, i) => (
                    <div key={i} className={`message ${m.role}`}>
                        <div className="msg-avatar">{m.role === 'ai' ? '🤖' : '👤'}</div>
                        <div className="msg-bubble">
                            {m.role === 'ai' ? (
                                <div className="prose"><ReactMarkdown>{m.content}</ReactMarkdown></div>
                            ) : m.content}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="message ai">
                        <div className="msg-avatar">🤖</div>
                        <div className="msg-bubble"><div className="thinking"><span /><span /><span /></div></div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>
            <div className="chat-input-bar">
                <textarea
                    className="chat-input" rows={1}
                    placeholder={activeDoc ? 'Ask a question about your document...' : 'Select a document first'}
                    value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKey} disabled={!activeDoc || loading}
                />
                <button className="btn btn-icon" onClick={send} disabled={!activeDoc || !input.trim() || loading} title="Send">
                    {loading ? <div className="spinner" /> : '➤'}
                </button>
            </div>
        </>
    )
}

function SummarizePanel({ activeDoc }) {
    const [summary, setSummary] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const apiFetch = useApiFetch()

    useEffect(() => { setSummary(''); setError('') }, [activeDoc])

    const generate = async () => {
        if (!activeDoc) return
        setLoading(true); setSummary(''); setError('')
        try {
            const data = await apiFetch(`${API}/summarize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ doc_id: activeDoc.doc_id }),
            })
            setSummary(data.summary)
        } catch (e) { setError(e.message) } finally { setLoading(false) }
    }

    if (!activeDoc) return (
        <div className="panel"><div className="empty-state"><div className="icon">📋</div><p>Select a document to generate a summary.</p></div></div>
    )

    return (
        <div className="panel">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                    <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Document Summary</h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>{activeDoc.file_name}</p>
                </div>
                <button className="btn btn-primary" onClick={generate} disabled={loading}>
                    {loading ? <><div className="spinner" /> Generating...</> : '✨ Generate Summary'}
                </button>
            </div>
            {error && (
                <div style={{ background: 'rgba(255,95,126,0.1)', border: '1px solid rgba(255,95,126,0.3)', borderRadius: 'var(--radius)', padding: '12px 16px', color: 'var(--error)', fontSize: '0.85rem', marginBottom: 16 }}>
                    ❌ {error}
                </div>
            )}
            {!summary && !loading && !error && (
                <div className="empty-state"><div className="icon">✨</div><p>Click "Generate Summary" to get an AI-powered summary.</p></div>
            )}
            {summary && (
                <div className="summary-box">
                    <h3>📝 Summary</h3>
                    <div className="prose"><ReactMarkdown>{summary}</ReactMarkdown></div>
                </div>
            )}
        </div>
    )
}

function AppShell() {
    const [docs, setDocs] = useState([])
    const [activeDoc, setActiveDoc] = useState(null)
    const [tab, setTab] = useState('chat')
    const [uploading, setUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [toast, setToast] = useState(null)
    const { user } = useAuth()
    const apiFetch = useApiFetch()

    const showToast = (message, type = 'success') => setToast({ message, type })

    const fetchDocs = async () => {
        try { const data = await apiFetch(`${API}/documents`); setDocs(data) } catch { }
    }

    useEffect(() => { fetchDocs() }, [])

    const handleUpload = async (file) => {
        setUploading(true); setUploadProgress(10)
        const formData = new FormData()
        formData.append('file', file)
        try {
            setUploadProgress(40)
            const data = await apiFetch(`${API}/upload`, { method: 'POST', body: formData })
            setUploadProgress(90)
            showToast(`✅ "${file.name}" uploaded and indexed!`)
            const newDoc = { doc_id: data.doc_id, file_name: data.file_name, upload_date: new Date().toISOString() }
            setDocs(d => [newDoc, ...d])
            setActiveDoc(newDoc)
            setUploadProgress(100)
            setTimeout(() => setUploadProgress(0), 800)
        } catch (e) {
            showToast(e.message, 'error')
            setUploadProgress(0)
        } finally { setUploading(false) }
    }

    const handleDelete = async (docId) => {
        try {
            await apiFetch(`${API}/document/${docId}`, { method: 'DELETE' })
            setDocs(d => d.filter(doc => doc.doc_id !== docId))
            if (activeDoc?.doc_id === docId) setActiveDoc(null)
            showToast('Document deleted.')
        } catch { showToast('Failed to delete.', 'error') }
    }

    return (
        <div className="app">
            <header className="header">
                <div className="header-logo">🧠</div>
                <h1>AI Document Assistant</h1>
                <span>MVP</span>
            </header>
            <div className="main">
                <Sidebar docs={docs} activeDoc={activeDoc} onSelect={setActiveDoc}
                    onDelete={handleDelete} onUpload={handleUpload} uploading={uploading} />
                <div className="content">
                    {uploading && uploadProgress > 0 && (
                        <div className="progress-card" style={{ margin: '16px 24px 0', borderRadius: 'var(--radius)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                                <span>⚡ Processing document…</span>
                                <span style={{ color: 'var(--accent-light)' }}>{uploadProgress}%</span>
                            </div>
                            <div className="progress-bar-track">
                                <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
                            </div>
                        </div>
                    )}
                    <div className="tabs">
                        {[{ id: 'chat', label: '💬 Chat / Q&A' }, { id: 'summarize', label: '📋 Summarize' }].map(t => (
                            <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
                                {t.label}
                            </button>
                        ))}
                    </div>
                    {tab === 'chat' && <ChatPanel activeDoc={activeDoc} />}
                    {tab === 'summarize' && <SummarizePanel activeDoc={activeDoc} />}
                </div>
            </div>
            {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
        </div>
    )
}

// Protected route — redirects to /login if not authenticated
function PrivateRoute({ children }) {
    const { isAuthenticated } = useAuth()
    return isAuthenticated ? children : <Navigate to="/login" replace />
}

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<AuthPage />} />
                    <Route path="/app" element={<PrivateRoute><AppShell /></PrivateRoute>} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    )
}
