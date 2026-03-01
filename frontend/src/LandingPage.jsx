import { useNavigate } from 'react-router-dom'

const features = [
    { icon: '📄', title: 'Upload Any Document', desc: 'PDF, DOCX, or TXT — drag & drop or click to upload instantly.' },
    { icon: '💬', title: 'Chat with Your Docs', desc: 'Ask anything and get precise AI-powered answers from your document.' },
    { icon: '✨', title: 'Instant Summaries', desc: 'Get a structured overview with key points in seconds.' },
    { icon: '🌍', title: 'Any Language', desc: 'Works with documents in French, Arabic, English, and more.' },
    { icon: '🔒', title: 'Secure & Private', desc: 'Files are processed locally and never shared.' },
    { icon: '⚡', title: 'Lightning Fast', desc: 'Powered by Groq LLaMA and FAISS for near-instant responses.' },
]

export default function LandingPage() {
    const navigate = useNavigate()

    return (
        <div className="landing">
            {/* Nav */}
            <nav className="landing-nav">
                <div className="landing-logo">
                    <span className="logo-icon">🧠</span>
                    <span className="logo-text">AI Document Assistant</span>
                </div>
                <button className="btn btn-primary" onClick={() => navigate('/app')}>
                    Launch App →
                </button>
            </nav>

            {/* Hero */}
            <section className="hero">
                <div className="hero-badge">✨ Powered by LLaMA 3.3 · 70B</div>
                <h1 className="hero-title">
                    Turn Any Document Into<br />
                    <span className="hero-gradient">An AI Knowledge Base</span>
                </h1>
                <p className="hero-sub">
                    Upload a PDF, DOCX, or TXT file and instantly chat with it, summarize it,
                    and extract insights — in any language.
                </p>
                <div className="hero-actions">
                    <button className="btn btn-primary btn-lg" onClick={() => navigate('/app')}>
                        🚀 Start for Free
                    </button>
                    <button className="btn btn-secondary btn-lg" onClick={() => navigate('/app')}>
                        See How It Works
                    </button>
                </div>

                {/* Floating preview card */}
                <div className="hero-preview">
                    <div className="preview-bar">
                        <span className="preview-dot red" /><span className="preview-dot yellow" /><span className="preview-dot green" />
                        <span style={{ marginLeft: 8, fontSize: '0.72rem', color: 'var(--text-muted)' }}>AI Document Assistant</span>
                    </div>
                    <div className="preview-body">
                        <div className="preview-msg ai">
                            <span>🤖</span>
                            <div>Hi! I've loaded your <strong>contract.pdf</strong>. Ask me anything!</div>
                        </div>
                        <div className="preview-msg user">
                            <span>👤</span>
                            <div>What are the key deadlines?</div>
                        </div>
                        <div className="preview-msg ai">
                            <span>🤖</span>
                            <div>The document mentions <strong>3 key deadlines</strong>:<br />
                                • Submission: <strong>March 15</strong><br />
                                • Review: <strong>April 1</strong><br />
                                • Final approval: <strong>April 30</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="features">
                <h2 className="section-title">Everything You Need</h2>
                <p className="section-sub">All the tools to work smarter with your documents</p>
                <div className="features-grid">
                    {features.map(f => (
                        <div key={f.title} className="feature-card">
                            <div className="feature-icon">{f.icon}</div>
                            <h3>{f.title}</h3>
                            <p>{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA */}
            <section className="cta-section">
                <h2>Ready to Work Smarter?</h2>
                <p>No signup required. Upload your first document and start chatting.</p>
                <button className="btn btn-primary btn-lg" onClick={() => navigate('/app')}>
                    🚀 Launch App — It's Free
                </button>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <span>🧠 AI Document Assistant · MVP v1.0</span>
                <span>Built with FastAPI · Groq · FAISS · React</span>
            </footer>
        </div>
    )
}
