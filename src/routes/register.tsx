import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";

const EsoEnergyCreateAccount = () => {
  const [step, setStep] = useState(1);
  const [focused, setFocused] = useState(null);
  const [formData, setFormData] = useState({
    companyName: "",
    fullName: "",
    email: "",
    password: "",
    companySize: "",
    role: "",
    country: "",
  });
  const [showPass, setShowPass] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    setMounted(true);
    const pts = Array.from({ length: 28 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.5 + 0.1,
      speed: Math.random() * 20 + 15,
      delay: Math.random() * 10,
    }));
    setParticles(pts);
  }, []);

  const handleChange = (e) => {
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const strength = (() => {
    const p = formData.password;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  })();

  const strengthLabel = ["", "Weak", "Fair", "Strong", "Excellent"][strength];
  const strengthColor = ["", "#EF4444", "#F59E0B", "#22C55E", "#10B981"][strength];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Outfit:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --void: #07080C;
          --surface: #0C0E15;
          --panel: #0F1119;
          --border: rgba(255,255,255,0.07);
          --border-active: rgba(200,168,82,0.45);
          --gold: #C8A852;
          --gold-bright: #E0C06A;
          --gold-dim: rgba(200,168,82,0.15);
          --text-primary: #EDE8DC;
          --text-secondary: #6B6860;
          --text-muted: #3A3830;
          --green: #2DD4BF;
          --green-dim: rgba(45,212,191,0.1);
          --input-bg: rgba(255,255,255,0.03);
          --input-hover: rgba(255,255,255,0.055);
        }
        .eso-root { min-height: 100vh; background: var(--void); display: flex; font-family: 'Outfit', sans-serif; color: var(--text-primary); overflow: hidden; position: relative; }
        .eso-left { width: 52%; min-height: 100vh; background: var(--surface); position: relative; display: flex; flex-direction: column; justify-content: space-between; padding: 48px 56px; overflow: hidden; border-right: 1px solid var(--border); }
        .eso-left::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse 80% 60% at 20% 80%, rgba(200,168,82,0.06) 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 80% 20%, rgba(45,212,191,0.04) 0%, transparent 60%); pointer-events: none; }
        .solar-grid { position: absolute; inset: 0; opacity: 0.035; background-image: linear-gradient(rgba(200,168,82,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(200,168,82,0.8) 1px, transparent 1px); background-size: 44px 44px; mask-image: radial-gradient(ellipse 90% 90% at 30% 60%, black 20%, transparent 80%); }
        .particle { position: absolute; border-radius: 50%; background: var(--gold); animation: floatUp linear infinite; pointer-events: none; }
        @keyframes floatUp { 0% { transform: translateY(0px) translateX(0px); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 0.6; } 100% { transform: translateY(-120px) translateX(20px); opacity: 0; } }
        .orb { position: absolute; border-radius: 50%; filter: blur(60px); pointer-events: none; }
        .brand-mark { display: flex; align-items: center; gap: 12px; position: relative; z-index: 2; }
        .brand-icon { width: 38px; height: 38px; border: 1px solid rgba(200,168,82,0.35); border-radius: 8px; display: flex; align-items: center; justify-content: center; background: rgba(200,168,82,0.06); }
        .brand-name { font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 600; letter-spacing: 0.25em; color: var(--text-primary); text-transform: uppercase; }
        .brand-sub { font-size: 10px; letter-spacing: 0.15em; color: var(--text-secondary); text-transform: uppercase; }
        .hero-copy { position: relative; z-index: 2; max-width: 420px; }
        .hero-label { font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--gold); font-weight: 500; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
        .hero-label::before { content: ''; width: 24px; height: 1px; background: var(--gold); }
        .hero-title { font-family: 'Cormorant', serif; font-size: 52px; line-height: 1.08; font-weight: 400; color: var(--text-primary); margin-bottom: 20px; }
        .hero-title em { font-style: italic; color: var(--gold-bright); }
        .hero-desc { font-size: 14.5px; color: var(--text-secondary); line-height: 1.7; font-weight: 300; margin-bottom: 32px; }
        .stat-pill { display: inline-flex; align-items: center; gap: 8px; background: rgba(45,212,191,0.08); border: 1px solid rgba(45,212,191,0.2); border-radius: 100px; padding: 6px 14px; font-size: 12px; font-weight: 500; color: var(--green); letter-spacing: 0.04em; }
        .stat-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--green); animation: blink 1.4s ease-in-out infinite; }
        @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        .energy-bar-wrap { display: flex; flex-direction: column; gap: 8px; margin-top: 24px; }
        .energy-bar { height: 3px; border-radius: 2px; background: var(--border); overflow: hidden; }
        .energy-bar-fill { height: 100%; border-radius: 2px; animation: fillBar 2.5s ease-in-out infinite alternate; }
        @keyframes fillBar { from { width: 30%; } to { width: 100%; } }
        .metrics { display: flex; gap: 28px; position: relative; z-index: 2; }
        .metric-value { font-family: 'Cormorant', serif; font-size: 30px; font-weight: 500; color: var(--text-primary); line-height: 1; }
        .metric-value span { font-size: 16px; color: var(--gold); }
        .metric-label { font-size: 11px; color: var(--text-secondary); letter-spacing: 0.08em; text-transform: uppercase; }
        .metric-divider { width: 1px; background: var(--border); align-self: stretch; }
        .eso-right { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 56px; background: var(--void); position: relative; overflow-y: auto; }
        .form-container { width: 100%; max-width: 420px; position: relative; z-index: 2; }
        .form-header { margin-bottom: 36px; opacity: 0; transform: translateY(16px); animation: slideIn 0.6s ease forwards; }
        @keyframes slideIn { to { opacity: 1; transform: translateY(0); } }
        .form-eyebrow { font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--gold); font-weight: 500; margin-bottom: 10px; }
        .form-title { font-family: 'Cormorant', serif; font-size: 34px; font-weight: 400; color: var(--text-primary); line-height: 1.15; margin-bottom: 8px; }
        .form-subtitle { font-size: 13.5px; color: var(--text-secondary); font-weight: 300; line-height: 1.6; }
        .step-indicator { display: flex; align-items: center; gap: 0; margin-bottom: 32px; opacity: 0; animation: slideIn 0.6s 0.1s ease forwards; }
        .step-node { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; font-size: 11px; font-weight: 600; border: 1px solid; transition: all 0.4s ease; cursor: pointer; }
        .step-node.done { background: var(--gold); border-color: var(--gold); color: var(--void); }
        .step-node.active { background: var(--gold-dim); border-color: var(--gold); color: var(--gold); box-shadow: 0 0 0 4px rgba(200,168,82,0.1); }
        .step-node.idle { background: transparent; border-color: var(--text-muted); color: var(--text-muted); }
        .step-line { flex: 1; height: 1px; background: var(--border); margin: 0 4px; max-width: 60px; transition: background 0.4s; }
        .step-line.done { background: var(--gold); opacity: 0.4; }
        .step-label-row { display: flex; justify-content: space-between; margin-top: 6px; margin-bottom: 28px; }
        .step-label { font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); transition: color 0.3s; }
        .step-label.active { color: var(--gold); }
        .field-group { display: flex; flex-direction: column; gap: 14px; margin-bottom: 20px; opacity: 0; animation: slideIn 0.5s 0.2s ease forwards; }
        .field-row { display: flex; gap: 12px; }
        .field { display: flex; flex-direction: column; gap: 6px; flex: 1; }
        .field-label { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-secondary); font-weight: 500; }
        .field-input-wrap { position: relative; }
        .field-input { width: 100%; background: var(--input-bg); border: 1px solid var(--border); border-radius: 8px; padding: 13px 16px; font-size: 14px; font-family: 'Outfit', sans-serif; font-weight: 300; color: var(--text-primary); outline: none; transition: all 0.25s ease; -webkit-appearance: none; }
        .field-input::placeholder { color: var(--text-muted); }
        .field-input:hover { background: var(--input-hover); border-color: rgba(255,255,255,0.12); }
        .field-input:focus { background: rgba(200,168,82,0.04); border-color: var(--gold); box-shadow: 0 0 0 3px rgba(200,168,82,0.08); }
        .field-input-wrap .icon { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted); cursor: pointer; transition: color 0.2s; display: flex; align-items: center; }
        .field-input-wrap.has-icon .field-input { padding-right: 44px; }
        select.field-input { cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 7L11 1' stroke='%236B6860' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; padding-right: 40px; }
        .strength-row { display: flex; gap: 4px; margin-top: 8px; align-items: center; }
        .strength-seg { height: 2px; flex: 1; border-radius: 2px; background: var(--text-muted); transition: background 0.3s; }
        .strength-text { font-size: 11px; letter-spacing: 0.06em; font-weight: 500; margin-left: 8px; min-width: 60px; }
        .or-divider { display: flex; align-items: center; gap: 12px; margin: 20px 0; opacity: 0; animation: slideIn 0.5s 0.25s ease forwards; }
        .or-divider::before, .or-divider::after { content: ''; flex: 1; height: 1px; background: var(--border); }
        .or-text { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-muted); }
        .sso-row { display: flex; gap: 10px; margin-bottom: 24px; opacity: 0; animation: slideIn 0.5s 0.3s ease forwards; }
        .sso-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 11px 12px; background: var(--input-bg); border: 1px solid var(--border); border-radius: 8px; font-size: 12.5px; font-family: 'Outfit', sans-serif; color: var(--text-secondary); cursor: pointer; transition: all 0.2s; }
        .sso-btn:hover { background: var(--input-hover); border-color: rgba(255,255,255,0.14); color: var(--text-primary); }
        .cta-btn { width: 100%; padding: 15px 24px; background: linear-gradient(135deg, var(--gold) 0%, #A8882A 100%); border: none; border-radius: 8px; font-size: 13.5px; font-family: 'Outfit', sans-serif; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--void); cursor: pointer; transition: all 0.25s; position: relative; overflow: hidden; opacity: 0; animation: slideIn 0.5s 0.35s ease forwards; }
        .cta-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(200,168,82,0.25); }
        .cta-secondary { width: 100%; padding: 14px 24px; background: transparent; border: 1px solid var(--border); border-radius: 8px; font-size: 13.5px; font-family: 'Outfit', sans-serif; color: var(--text-secondary); cursor: pointer; transition: all 0.2s; margin-top: 10px; }
        .cta-secondary:hover { border-color: rgba(255,255,255,0.14); color: var(--text-primary); background: var(--input-hover); }
        .terms-text { font-size: 11.5px; color: var(--text-muted); text-align: center; margin-top: 18px; line-height: 1.65; opacity: 0; animation: slideIn 0.5s 0.4s ease forwards; }
        .terms-text a { color: var(--gold); text-decoration: none; opacity: 0.8; }
        .signin-row { text-align: center; margin-top: 20px; font-size: 12.5px; color: var(--text-muted); opacity: 0; animation: slideIn 0.5s 0.45s ease forwards; }
        .signin-row a { color: var(--gold); text-decoration: none; font-weight: 500; }
        .input-prefix { position: absolute; left: 1px; top: 1px; bottom: 1px; display: flex; align-items: center; padding: 0 12px; font-size: 12px; color: var(--text-muted); border-right: 1px solid var(--border); border-radius: 7px 0 0 7px; background: rgba(255,255,255,0.02); white-space: nowrap; }
        .field-input.with-prefix { padding-left: 74px; }
        .feature-list { display: flex; flex-direction: column; gap: 12px; }
        .feature-item { display: flex; align-items: center; gap: 12px; font-size: 13px; color: var(--text-secondary); font-weight: 300; }
        .feature-icon { width: 28px; height: 28px; border-radius: 6px; background: var(--gold-dim); border: 1px solid rgba(200,168,82,0.2); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .step-content { animation: slideIn 0.4s ease forwards; }
        @media (max-width: 900px) { .eso-left { display: none; } .eso-right { padding: 32px 24px; } }
      `}</style>

      <div className="eso-root">
        <div className="eso-left">
          <div className="solar-grid" />
          {mounted && particles.map((p) => (
            <div key={p.id} className="particle" style={{ left: `${p.x}%`, bottom: `${p.y % 40}%`, width: `${p.size}px`, height: `${p.size}px`, opacity: p.opacity, animationDuration: `${p.speed}s`, animationDelay: `${p.delay}s` }} />
          ))}
          <div className="orb" style={{ width: 320, height: 320, background: "radial-gradient(circle, rgba(200,168,82,0.09) 0%, transparent 70%)", bottom: -60, right: -80 }} />
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
          <div className="hero-copy">
            <div className="hero-label">Enterprise Platform</div>
            <h1 className="hero-title">Monitor every<br/>watt with<br/><em>precision.</em></h1>
            <p className="hero-desc">Real-time solar inverter intelligence for energy operators who demand complete visibility across every asset, site, and megawatt in their portfolio.</p>
            <div className="stat-pill"><span className="stat-dot" />Live across 2,400+ sites globally</div>
          </div>
          <div style={{ position: "relative", zIndex: 2 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 10 }}>Active Output — Fleet Average</div>
            <div className="energy-bar-wrap">
              {[{ label: "Site A — Berlin", pct: 92, color: "#C8A852", delay: "0s" }, { label: "Site B — Madrid", pct: 78, color: "#2DD4BF", delay: "0.3s" }, { label: "Site C — Dubai", pct: 85, color: "#C8A852", delay: "0.6s" }].map((b) => (
                <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", width: 130, flexShrink: 0 }}>{b.label}</div>
                  <div className="energy-bar" style={{ flex: 1 }}>
                    <div className="energy-bar-fill" style={{ background: `linear-gradient(90deg, ${b.color}88, ${b.color})`, width: `${b.pct}%`, animationDelay: b.delay }} />
                  </div>
                  <div style={{ fontSize: 11, color: b.color, width: 36, textAlign: "right" }}>{b.pct}%</div>
                </div>
              ))}
            </div>
          </div>
          <div className="metrics">
            <div><div className="metric-value">14.2<span>GW</span></div><div className="metric-label">Monitored</div></div>
            <div className="metric-divider" />
            <div><div className="metric-value">99.8<span>%</span></div><div className="metric-label">Uptime</div></div>
            <div className="metric-divider" />
            <div><div className="metric-value">340<span>ms</span></div><div className="metric-label">Latency</div></div>
          </div>
        </div>

        <div className="eso-right">
          <div className="form-container">
            <div className="form-header">
              <div className="form-eyebrow">New Account</div>
              <h2 className="form-title">{step === 1 ? "Create your workspace" : "Configure your fleet"}</h2>
              <p className="form-subtitle">{step === 1 ? "Start monitoring your inverter portfolio in minutes." : "Tell us about your energy infrastructure."}</p>
            </div>
            <div className="step-indicator">
              {[1, 2].map((s, i) => (
                <>
                  <div key={s} className={`step-node ${s < step ? "done" : s === step ? "active" : "idle"}`} onClick={() => s < step && setStep(s)}>
                    {s < step ? <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg> : s}
                  </div>
                  {i < 1 && <div key={`line-${s}`} className={`step-line ${s < step ? "done" : ""}`} />}
                </>
              ))}
            </div>
            <div className="step-label-row">
              {["Account Details", "Fleet Setup"].map((l, i) => (
                <div key={l} className={`step-label ${step === i + 1 ? "active" : ""}`}>{l}</div>
              ))}
            </div>

            {step === 1 ? (
              <div className="step-content" key="step1">
                <div className="sso-row">
                  <button className="sso-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    Google SSO
                  </button>
                  <button className="sso-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#60A5FA"><path d="M21.007 0H2.993A2.993 2.993 0 000 2.993v18.014A2.993 2.993 0 002.993 24h9.18v-9.297H9.25V11.07h2.923V8.418c0-2.9 1.772-4.479 4.365-4.479 1.24 0 2.306.092 2.616.133v3.035h-1.795c-1.407 0-1.68.67-1.68 1.65v2.313h3.356l-.437 3.633h-2.919V24h5.328A2.993 2.993 0 0024 21.007V2.993A2.993 2.993 0 0021.007 0z"/></svg>
                    Microsoft SSO
                  </button>
                </div>
                <div className="or-divider"><span className="or-text">or continue with email</span></div>
                <div className="field-group">
                  <div className="field-row">
                    <div className="field">
                      <label className="field-label">First Name</label>
                      <div className="field-input-wrap"><input className="field-input" name="fullName" placeholder="Alex" value={formData.fullName} onChange={handleChange} /></div>
                    </div>
                    <div className="field">
                      <label className="field-label">Last Name</label>
                      <div className="field-input-wrap"><input className="field-input" name="lastName" placeholder="Morgan" onChange={handleChange} /></div>
                    </div>
                  </div>
                  <div className="field">
                    <label className="field-label">Work Email</label>
                    <div className="field-input-wrap">
                      <input className="field-input" type="email" name="email" placeholder="alex@company.com" value={formData.email} onChange={handleChange} />
                      <span className="icon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></span>
                    </div>
                  </div>
                  <div className="field">
                    <label className="field-label">Password</label>
                    <div className="field-input-wrap has-icon">
                      <input className="field-input" type={showPass ? "text" : "password"} name="password" placeholder="Min. 8 characters" value={formData.password} onChange={handleChange} />
                      <span className="icon" onClick={() => setShowPass(!showPass)}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </span>
                    </div>
                    {formData.password && (
                      <div className="strength-row">
                        {[1,2,3,4].map((i) => (<div key={i} className="strength-seg" style={{ background: i <= strength ? strengthColor : undefined }} />))}
                        <span className="strength-text" style={{ color: strengthColor }}>{strengthLabel}</span>
                      </div>
                    )}
                  </div>
                </div>
                <button className="cta-btn" onClick={() => setStep(2)}>Continue — Fleet Setup →</button>
              </div>
            ) : (
              <div className="step-content" key="step2">
                <div className="field-group">
                  <div className="field">
                    <label className="field-label">Company Name</label>
                    <div className="field-input-wrap">
                      <div className="input-prefix">ESO /</div>
                      <input className="field-input with-prefix" name="companyName" placeholder="Your Company" value={formData.companyName} onChange={handleChange} />
                    </div>
                  </div>
                  <div className="field-row">
                    <div className="field">
                      <label className="field-label">Fleet Size</label>
                      <div className="field-input-wrap">
                        <select className="field-input" name="companySize" value={formData.companySize} onChange={handleChange}>
                          <option value="" disabled>Select range</option>
                          <option>1 – 10 Inverters</option>
                          <option>11 – 50 Inverters</option>
                          <option>51 – 200 Inverters</option>
                          <option>200+ Inverters</option>
                          <option>1 GW+ Portfolio</option>
                        </select>
                      </div>
                    </div>
                    <div className="field">
                      <label className="field-label">Your Role</label>
                      <div className="field-input-wrap">
                        <select className="field-input" name="role" value={formData.role} onChange={handleChange}>
                          <option value="" disabled>Select role</option>
                          <option>Asset Manager</option>
                          <option>O&M Engineer</option>
                          <option>Energy Analyst</option>
                          <option>CTO / VP Engineering</option>
                          <option>Developer / Integrator</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="field">
                    <label className="field-label">Primary Market</label>
                    <div className="field-input-wrap">
                      <select className="field-input" name="country" value={formData.country} onChange={handleChange}>
                        <option value="" disabled>Select region</option>
                        <option>Europe</option>
                        <option>Middle East & Africa</option>
                        <option>Asia Pacific</option>
                        <option>North America</option>
                        <option>Latin America</option>
                        <option>Multi-region</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ marginTop: 4, padding: "16px", background: "rgba(200,168,82,0.04)", border: "1px solid rgba(200,168,82,0.12)", borderRadius: 10 }}>
                    <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--gold)", fontWeight: 500, marginBottom: 12 }}>Your plan includes</div>
                    <div className="feature-list">
                      {[{ icon: "⚡", text: "Real-time inverter telemetry & fault alerts" }, { icon: "📊", text: "Yield analysis & performance benchmarking" }, { icon: "🔌", text: "Multi-brand inverter protocol support" }].map((f) => (
                        <div className="feature-item" key={f.text}>
                          <div className="feature-icon"><span style={{ fontSize: 11 }}>{f.icon}</span></div>
                          {f.text}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <button className="cta-btn">Activate ESO Workspace →</button>
                <button className="cta-secondary" onClick={() => setStep(1)}>← Back to account details</button>
              </div>
            )}

            <p className="terms-text">By creating an account you agree to ESO Energy's <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.</p>
            <div className="signin-row">Already have a workspace? <a href="#">Sign in →</a></div>
          </div>
        </div>
      </div>
    </>
  );
};

export const Route = createFileRoute("/signup")({
  component: EsoEnergyCreateAccount,
});

export default EsoEnergyCreateAccount;