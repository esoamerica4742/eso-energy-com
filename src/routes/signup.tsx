import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

const SignUpPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [particles, setParticles] = useState([]);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    if (user) navigate({ to: "/dashboard" });
  }, [user, navigate]);

  useEffect(() => {
    setMounted(true);
    const pts = Array.from({ length: 24 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 50,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.4 + 0.1,
      speed: Math.random() * 22 + 14,
      delay: Math.random() * 12,
    }));
    setParticles(pts);
    const tick = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  const handleSignIn = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setError("");
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError(err.message); setLoading(false); }
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/dashboard` } });
  };

  const fmt = (n) => String(n).padStart(2, "0");
  const timeStr = `${fmt(time.getHours())}:${fmt(time.getMinutes())}:${fmt(time.getSeconds())}`;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Outfit:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --void: #07080C;
          --surface: #0C0E15;
          --border: rgba(255,255,255,0.07);
          --gold: #C8A852;
          --gold-bright: #E0C06A;
          --gold-dim: rgba(200,168,82,0.15);
          --text-primary: #EDE8DC;
          --text-secondary: #6B6860;
          --text-muted: #3A3830;
          --green: #2DD4BF;
          --input-bg: rgba(255,255,255,0.03);
          --input-hover: rgba(255,255,255,0.055);
          --red: #EF4444;
        }
        .si-root { min-height: 100vh; background: var(--void); display: flex; font-family: 'Outfit', sans-serif; color: var(--text-primary); overflow: hidden; }

        /* LEFT */
        .si-left { width: 52%; min-height: 100vh; background: var(--surface); position: relative; display: flex; flex-direction: column; justify-content: space-between; padding: 48px 56px; overflow: hidden; border-right: 1px solid var(--border); }
        .si-left::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse 80% 60% at 20% 80%, rgba(200,168,82,0.06) 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 80% 20%, rgba(45,212,191,0.04) 0%, transparent 60%); pointer-events: none; }
        .solar-grid { position: absolute; inset: 0; opacity: 0.035; background-image: linear-gradient(rgba(200,168,82,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(200,168,82,0.8) 1px, transparent 1px); background-size: 44px 44px; mask-image: radial-gradient(ellipse 90% 90% at 30% 60%, black 20%, transparent 80%); }
        .particle { position: absolute; border-radius: 50%; background: var(--gold); animation: floatUp linear infinite; pointer-events: none; }
        @keyframes floatUp { 0% { transform: translateY(0) translateX(0); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 0.5; } 100% { transform: translateY(-110px) translateX(18px); opacity: 0; } }
        .orb { position: absolute; border-radius: 50%; filter: blur(70px); pointer-events: none; }

        /* Brand */
        .brand-mark { display: flex; align-items: center; gap: 12px; position: relative; z-index: 2; }
        .brand-icon { width: 38px; height: 38px; border: 1px solid rgba(200,168,82,0.35); border-radius: 8px; display: flex; align-items: center; justify-content: center; background: rgba(200,168,82,0.06); }
        .brand-name { font-size: 15px; font-weight: 600; letter-spacing: 0.25em; color: var(--text-primary); text-transform: uppercase; }
        .brand-sub { font-size: 10px; letter-spacing: 0.15em; color: var(--text-secondary); text-transform: uppercase; }

        /* Live clock */
        .live-panel { position: relative; z-index: 2; background: rgba(200,168,82,0.04); border: 1px solid rgba(200,168,82,0.1); border-radius: 14px; padding: 24px 28px; }
        .live-label { font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
        .live-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--green); animation: blink 1.4s ease-in-out infinite; }
        @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.2; } }
        .live-clock { font-family: 'Cormorant', serif; font-size: 42px; font-weight: 300; color: var(--text-primary); letter-spacing: 0.04em; line-height: 1; margin-bottom: 16px; }
        .live-clock span { color: var(--gold); }
        .live-stats { display: flex; gap: 20px; }
        .live-stat { display: flex; flex-direction: column; gap: 3px; }
        .live-stat-val { font-size: 16px; font-weight: 500; color: var(--text-primary); }
        .live-stat-val em { font-style: normal; color: var(--gold); font-size: 12px; }
        .live-stat-label { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted); }
        .live-divider { width: 1px; background: var(--border); align-self: stretch; }

        /* Inverter cards */
        .inverter-grid { display: flex; flex-direction: column; gap: 8px; position: relative; z-index: 2; }
        .inv-label { font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 4px; }
        .inv-card { display: flex; align-items: center; gap: 14px; padding: 12px 16px; background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: 10px; transition: border-color 0.3s; }
        .inv-card:hover { border-color: rgba(200,168,82,0.18); }
        .inv-status { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .inv-status.on { background: var(--green); box-shadow: 0 0 6px rgba(45,212,191,0.5); animation: blink 2s ease-in-out infinite; }
        .inv-status.warn { background: #F59E0B; box-shadow: 0 0 6px rgba(245,158,11,0.4); }
        .inv-info { flex: 1; }
        .inv-name { font-size: 12.5px; color: var(--text-primary); font-weight: 400; }
        .inv-loc { font-size: 10px; color: var(--text-muted); letter-spacing: 0.05em; }
        .inv-output { text-align: right; }
        .inv-kw { font-size: 13px; font-weight: 500; color: var(--gold); }
        .inv-eff { font-size: 10px; color: var(--text-muted); }
        .inv-bar-wrap { width: 60px; }
        .inv-bar { height: 3px; background: var(--border); border-radius: 2px; overflow: hidden; }
        .inv-bar-fill { height: 100%; border-radius: 2px; background: linear-gradient(90deg, var(--gold), var(--gold-bright)); }

        /* Hero */
        .hero-copy { position: relative; z-index: 2; }
        .hero-label { font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--gold); font-weight: 500; margin-bottom: 16px; display: flex; align-items: center; gap: 10px; }
        .hero-label::before { content: ''; width: 24px; height: 1px; background: var(--gold); }
        .hero-title { font-family: 'Cormorant', serif; font-size: 46px; line-height: 1.08; font-weight: 400; color: var(--text-primary); margin-bottom: 14px; }
        .hero-title em { font-style: italic; color: var(--gold-bright); }
        .hero-desc { font-size: 13.5px; color: var(--text-secondary); line-height: 1.7; font-weight: 300; }

        /* RIGHT */
        .si-right { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 56px; background: var(--void); position: relative; overflow-y: auto; }
        .si-right::before { content: ''; position: absolute; top: -200px; right: -200px; width: 500px; height: 500px; border-radius: 50%; background: radial-gradient(circle, rgba(200,168,82,0.04) 0%, transparent 70%); pointer-events: none; }

        .form-container { width: 100%; max-width: 400px; position: relative; z-index: 2; }

        /* Animations */
        .fade-up { opacity: 0; transform: translateY(14px); animation: slideUp 0.55s ease forwards; }
        @keyframes slideUp { to { opacity: 1; transform: translateY(0); } }
        .d1 { animation-delay: 0s; }
        .d2 { animation-delay: 0.08s; }
        .d3 { animation-delay: 0.16s; }
        .d4 { animation-delay: 0.24s; }
        .d5 { animation-delay: 0.32s; }
        .d6 { animation-delay: 0.40s; }
        .d7 { animation-delay: 0.48s; }

        /* Form header */
        .form-eyebrow { font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--gold); font-weight: 500; margin-bottom: 10px; }
        .form-title { font-family: 'Cormorant', serif; font-size: 36px; font-weight: 400; color: var(--text-primary); line-height: 1.15; margin-bottom: 6px; }
        .form-subtitle { font-size: 13px; color: var(--text-secondary); font-weight: 300; line-height: 1.6; margin-bottom: 32px; }

        /* SSO */
        .sso-row { display: flex; gap: 10px; margin-bottom: 22px; }
        .sso-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 11px 12px; background: var(--input-bg); border: 1px solid var(--border); border-radius: 8px; font-size: 12.5px; font-family: 'Outfit', sans-serif; color: var(--text-secondary); cursor: pointer; transition: all 0.2s; white-space: nowrap; }
        .sso-btn:hover { background: var(--input-hover); border-color: rgba(255,255,255,0.14); color: var(--text-primary); transform: translateY(-1px); }

        /* Divider */
        .or-divider { display: flex; align-items: center; gap: 12px; margin: 20px 0; }
        .or-divider::before, .or-divider::after { content: ''; flex: 1; height: 1px; background: var(--border); }
        .or-text { font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--text-muted); }

        /* Fields */
        .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
        .field-label { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-secondary); font-weight: 500; }
        .field-input-wrap { position: relative; }
        .field-input { width: 100%; background: var(--input-bg); border: 1px solid var(--border); border-radius: 8px; padding: 13px 16px; font-size: 14px; font-family: 'Outfit', sans-serif; font-weight: 300; color: var(--text-primary); outline: none; transition: all 0.25s ease; -webkit-appearance: none; }
        .field-input::placeholder { color: var(--text-muted); }
        .field-input:hover { background: var(--input-hover); border-color: rgba(255,255,255,0.12); }
        .field-input:focus { background: rgba(200,168,82,0.04); border-color: var(--gold); box-shadow: 0 0 0 3px rgba(200,168,82,0.08); }
        .field-input.error { border-color: var(--red); box-shadow: 0 0 0 3px rgba(239,68,68,0.08); }
        .field-input-wrap .icon { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted); cursor: pointer; transition: color 0.2s; display: flex; align-items: center; }
        .field-input-wrap .icon:hover { color: var(--text-secondary); }
        .field-input.with-icon { padding-right: 44px; }

        /* Forgot */
        .forgot-row { display: flex; justify-content: flex-end; margin-top: -6px; margin-bottom: 8px; }
        .forgot-link { font-size: 12px; color: var(--gold); text-decoration: none; opacity: 0.75; transition: opacity 0.2s; }
        .forgot-link:hover { opacity: 1; }

        /* Error */
        .error-msg { display: flex; align-items: center; gap: 8px; background: rgba(239,68,68,0.07); border: 1px solid rgba(239,68,68,0.2); border-radius: 8px; padding: 10px 14px; font-size: 12.5px; color: #FCA5A5; margin-bottom: 14px; }

        /* CTA */
        .cta-btn { width: 100%; padding: 15px 24px; background: linear-gradient(135deg, var(--gold) 0%, #A8882A 100%); border: none; border-radius: 8px; font-size: 13.5px; font-family: 'Outfit', sans-serif; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--void); cursor: pointer; transition: all 0.25s; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 4px; }
        .cta-btn::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%); opacity: 0; transition: opacity 0.2s; }
        .cta-btn:hover::before { opacity: 1; }
        .cta-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(200,168,82,0.28); }
        .cta-btn:active { transform: translateY(0); }
        .cta-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        /* Bottom links */
        .bottom-row { text-align: center; margin-top: 22px; font-size: 12.5px; color: var(--text-muted); }
        .bottom-row a { color: var(--gold); text-decoration: none; font-weight: 500; }
        .bottom-row a:hover { text-decoration: underline; }

        .terms-text { font-size: 11px; color: var(--text-muted); text-align: center; margin-top: 14px; line-height: 1.65; }
        .terms-text a { color: var(--gold); text-decoration: none; opacity: 0.7; }
        .terms-text a:hover { opacity: 1; }

        /* Divider line */
        .form-divider { height: 1px; background: var(--border); margin: 24px 0; }

        /* Security badge */
        .security-badge { display: flex; align-items: center; justify-content: center; gap: 7px; font-size: 11px; color: var(--text-muted); letter-spacing: 0.06em; }
        .security-badge svg { width: 12px; height: 12px; color: var(--gold); opacity: 0.6; }

        @media (max-width: 900px) { .si-left { display: none; } .si-right { padding: 32px 24px; } }
      `}</style>

      <div className="si-root">
        {/* LEFT */}
        <div className="si-left">
          <div className="solar-grid" />
          {mounted && particles.map((p) => (
            <div key={p.id} className="particle" style={{ left: `${p.x}%`, bottom: `${p.y % 45}%`, width: `${p.size}px`, height: `${p.size}px`, opacity: p.opacity, animationDuration: `${p.speed}s`, animationDelay: `${p.delay}s` }} />
          ))}
          <div className="orb" style={{ width: 340, height: 340, background: "radial-gradient(circle, rgba(200,168,82,0.08) 0%, transparent 70%)", bottom: -80, right: -100 }} />
          <div className="orb" style={{ width: 220, height: 220, background: "radial-gradient(circle, rgba(45,212,191,0.05) 0%, transparent 70%)", top: 60, right: 20 }} />

          {/* Brand */}
          <div className="brand-mark">
            <div className="brand-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="#C8A852" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <div className="brand-name">ESO Energy</div>
              <div className="brand-sub">Inverter Intelligence</div>
            </div>
          </div>

          {/* Hero */}
          <div className="hero-copy">
            <div className="hero-label">Operator Access</div>
            <h1 className="hero-title">
              Your fleet is<br/><em>waiting</em> for<br/>you.
            </h1>
            <p className="hero-desc">
              Sign in to your ESO workspace and access real-time inverter telemetry, fault alerts, and yield performance across every site in your portfolio.
            </p>
          </div>

          {/* Live clock */}
          <div className="live-panel">
            <div className="live-label">
              <span className="live-dot" />
              Fleet Status — Live
            </div>
            <div className="live-clock">
              {timeStr.split(":").map((seg, i) => (
                <span key={i} style={{ color: i === 2 ? "var(--gold)" : "var(--text-primary)" }}>
                  {seg}{i < 2 ? <span style={{ color: "var(--gold)", opacity: 0.5 }}>:</span> : ""}
                </span>
              ))}
            </div>
            <div className="live-stats">
              <div className="live-stat">
                <div className="live-stat-val">14.2 <em>GW</em></div>
                <div className="live-stat-label">Online capacity</div>
              </div>
              <div className="live-divider" />
              <div className="live-stat">
                <div className="live-stat-val">2,418 <em>sites</em></div>
                <div className="live-stat-label">Active now</div>
              </div>
              <div className="live-divider" />
              <div className="live-stat">
                <div className="live-stat-val">99.8 <em>%</em></div>
                <div className="live-stat-label">Uptime</div>
              </div>
            </div>
          </div>

          {/* Inverter cards */}
          <div className="inverter-grid">
            <div className="inv-label">Active Inverters — Sample View</div>
            {[
              { name: "INV-004 Alpha", loc: "Berlin, DE", kw: "48.2 kW", eff: "97.4%", pct: 92, status: "on" },
              { name: "INV-017 Gamma", loc: "Madrid, ES", kw: "36.7 kW", eff: "94.1%", pct: 76, status: "on" },
              { name: "INV-031 Delta", loc: "Dubai, UAE", kw: "22.1 kW", eff: "88.3%", pct: 58, status: "warn" },
            ].map((inv) => (
              <div className="inv-card" key={inv.name}>
                <div className={`inv-status ${inv.status}`} />
                <div className="inv-info">
                  <div className="inv-name">{inv.name}</div>
                  <div className="inv-loc">{inv.loc}</div>
                </div>
                <div className="inv-bar-wrap">
                  <div className="inv-bar">
                    <div className="inv-bar-fill" style={{ width: `${inv.pct}%` }} />
                  </div>
                </div>
                <div className="inv-output">
                  <div className="inv-kw">{inv.kw}</div>
                  <div className="inv-eff">{inv.eff}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT */}
        <div className="si-right">
          <div className="form-container">

            <div className="fade-up d1">
              <div className="form-eyebrow">Welcome Back</div>
              <h2 className="form-title">Sign in to ESO</h2>
              <p className="form-subtitle">Access your inverter monitoring workspace.</p>
            </div>

            {/* SSO */}
            <div className="sso-row fade-up d2">
              <button className="sso-btn" onClick={handleGoogle}>
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>
              <button className="sso-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#60A5FA">
                  <path d="M21.007 0H2.993A2.993 2.993 0 000 2.993v18.014A2.993 2.993 0 002.993 24h9.18v-9.297H9.25V11.07h2.923V8.418c0-2.9 1.772-4.479 4.365-4.479 1.24 0 2.306.092 2.616.133v3.035h-1.795c-1.407 0-1.68.67-1.68 1.65v2.313h3.356l-.437 3.633h-2.919V24h5.328A2.993 2.993 0 0024 21.007V2.993A2.993 2.993 0 0021.007 0z"/>
                </svg>
                Microsoft
              </button>
            </div>

            <div className="or-divider fade-up d3">
              <span className="or-text">or sign in with email</span>
            </div>

            {/* Error */}
            {error && (
              <div className="error-msg">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            {/* Email */}
            <div className="field fade-up d3">
              <label className="field-label">Work Email</label>
              <div className="field-input-wrap">
                <input
                  className={`field-input ${error ? "error" : ""}`}
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                />
                <span className="icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </span>
              </div>
            </div>

            {/* Password */}
            <div className="field fade-up d4">
              <label className="field-label">Password</label>
              <div className="field-input-wrap">
                <input
                  className={`field-input with-icon ${error ? "error" : ""}`}
                  type={showPass ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                />
                <span className="icon" onClick={() => setShowPass(!showPass)}>
                  {showPass ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </span>
              </div>
            </div>

            {/* Forgot */}
            <div className="forgot-row fade-up d4">
              <Link to="/forgot-password" className="forgot-link">Forgot password?</Link>
            </div>

            {/* Submit */}
            <button className="cta-btn fade-up d5" onClick={handleSignIn} disabled={loading}>
              {loading ? (
                <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Authenticating...</>
              ) : (
                "Sign In to ESO →"
              )}
            </button>

            <div className="form-divider fade-up d6" />

            {/* Security */}
            <div className="security-badge fade-up d6">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              256-bit SSL encrypted · SOC 2 Type II compliant
            </div>

            <div className="bottom-row fade-up d7">
              Don't have a workspace?{" "}
              <Link to="/register">Create account →</Link>
            </div>

            <p className="terms-text fade-up d7">
              By signing in you agree to ESO Energy's{" "}
              <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
            </p>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
};

export const Route = createFileRoute("/signup")({
  component: SignUpPage,
});

export default SignUpPage;