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

        .eso-root {
          min-height: 100vh;
          background: var(--void);
          display: flex;
          font-family: 'Outfit', sans-serif;
          color: var(--text-primary);
          overflow: hidden;
          position: relative;
        }

        /* LEFT PANEL */
        .eso-left {
          width: 52%;
          min-height: 100vh;
          background: var(--surface);
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 48px 56px;
          overflow: hidden;
          border-right: 1px solid var(--border);
        }

        .eso-left::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse 80% 60% at 20% 80%, rgba(200,168,82,0.06) 0%, transparent 70%),
                      radial-gradient(ellipse 60% 50% at 80% 20%, rgba(45,212,191,0.04) 0%, transparent 60%);
          pointer-events: none;
        }

        /* Solar grid pattern */
        .solar-grid {
          position: absolute;
          inset: 0;
          opacity: 0.035;
          background-image:
            linear-gradient(rgba(200,168,82,0.8) 1px, transparent 1px),
            linear-gradient(90deg, rgba(200,168,82,0.8) 1px, transparent 1px);
          background-size: 44px 44px;
          mask-image: radial-gradient(ellipse 90% 90% at 30% 60%, black 20%, transparent 80%);
        }

        /* Particles */
        .particle {
          position: absolute;
          border-radius: 50%;
          background: var(--gold);
          animation: floatUp linear infinite;
          pointer-events: none;
        }

        @keyframes floatUp {
          0% { transform: translateY(0px) translateX(0px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 0.6; }
          100% { transform: translateY(-120px) translateX(20px); opacity: 0; }
        }

        /* Inverter visualization */
        .inverter-visual {
          position: absolute;
          bottom: 80px;
          right: -30px;
          width: 340px;
          height: 340px;
          opacity: 0.9;
        }

        .energy-ring {
          position: absolute;
          border-radius: 50%;
          border: 1px solid;
          animation: pulseRing 3s ease-in-out infinite;
        }

        @keyframes pulseRing {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.04); opacity: 1; }
        }

        .energy-bar-wrap {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 24px;
        }

        .energy-bar {
          height: 3px;
          border-radius: 2px;
          background: var(--border);
          overflow: hidden;
          position: relative;
        }

        .energy-bar-fill {
          height: 100%;
          border-radius: 2px;
          animation: fillBar 2.5s ease-in-out infinite alternate;
        }

        @keyframes fillBar {
          from { width: 30%; }
          to { width: 100%; }
        }

        .stat-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(45,212,191,0.08);
          border: 1px solid rgba(45,212,191,0.2);
          border-radius: 100px;
          padding: 6px 14px;
          font-size: 12px;
          font-weight: 500;
          color: var(--green);
          letter-spacing: 0.04em;
        }

        .stat-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--green);
          animation: blink 1.4s ease-in-out infinite;
        }

        @keyframes blink {
          0%,100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        /* Brand mark */
        .brand-mark {
          display: flex;
          align-items: center;
          gap: 12px;
          position: relative;
          z-index: 2;
        }

        .brand-icon {
          width: 38px;
          height: 38px;
          border: 1px solid rgba(200,168,82,0.35);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(200,168,82,0.06);
          position: relative;
        }

        .brand-icon svg { width: 20px; height: 20px; }

        .brand-name {
          font-family: 'Outfit', sans-serif;
          font-size: 15px;
          font-weight: 600;
          letter-spacing: 0.25em;
          color: var(--text-primary);
          text-transform: uppercase;
        }

        .brand-sub {
          font-size: 10px;
          letter-spacing: 0.15em;
          color: var(--text-secondary);
          text-transform: uppercase;
          font-weight: 400;
        }

        /* Hero copy */
        .hero-copy {
          position: relative;
          z-index: 2;
          max-width: 420px;
        }

        .hero-label {
          font-size: 11px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--gold);
          font-weight: 500;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .hero-label::before {
          content: '';
          width: 24px;
          height: 1px;
          background: var(--gold);
        }

        .hero-title {
          font-family: 'Cormorant', serif;
          font-size: 52px;
          line-height: 1.08;
          font-weight: 400;
          color: var(--text-primary);
          margin-bottom: 20px;
          letter-spacing: -0.01em;
        }

        .hero-title em {
          font-style: italic;
          color: var(--gold-bright);
        }

        .hero-desc {
          font-size: 14.5px;
          color: var(--text-secondary);
          line-height: 1.7;
          font-weight: 300;
          margin-bottom: 32px;
        }

        /* Metrics row */
        .metrics {
          display: flex;
          gap: 28px;
          position: relative;
          z-index: 2;
        }

        .metric {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .metric-value {
          font-family: 'Cormorant', serif;
          font-size: 30px;
          font-weight: 500;
          color: var(--text-primary);
          line-height: 1;
        }

        .metric-value span {
          font-size: 16px;
          color: var(--gold);
        }

        .metric-label {
          font-size: 11px;
          color: var(--text-secondary);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-weight: 400;
        }

        .metric-divider {
          width: 1px;
          background: var(--border);
          align-self: stretch;
        }

        /* RIGHT PANEL */
        .eso-right {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 56px;
          background: var(--void);
          position: relative;
          overflow-y: auto;
        }

        .eso-right::before {
          content: '';
          position: absolute;
          top: -200px;
          right: -200px;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(200,168,82,0.04) 0%, transparent 70%);
          pointer-events: none;
        }

        .form-container {
          width: 100%;
          max-width: 420px;
          position: relative;
          z-index: 2;
        }

        .form-header {
          margin-bottom: 36px;
          opacity: 0;
          transform: translateY(16px);
          animation: slideIn 0.6s ease forwards;
        }

        @keyframes slideIn {
          to { opacity: 1; transform: translateY(0); }
        }

        .form-eyebrow {
          font-size: 11px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--gold);
          font-weight: 500;
          margin-bottom: 10px;
        }

        .form-title {
          font-family: 'Cormorant', serif;
          font-size: 34px;
          font-weight: 400;
          color: var(--text-primary);
          line-height: 1.15;
          margin-bottom: 8px;
        }

        .form-subtitle {
          font-size: 13.5px;
          color: var(--text-secondary);
          font-weight: 300;
          line-height: 1.6;
        }

        /* Steps */
        .step-indicator {
          display: flex;
          align-items: center;
          gap: 0;
          margin-bottom: 32px;
          opacity: 0;
          animation: slideIn 0.6s 0.1s ease forwards;
        }

        .step-node {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.02em;
          border: 1px solid;
          transition: all 0.4s ease;
          cursor: pointer;
          position: relative;
          z-index: 1;
        }

        .step-node.done {
          background: var(--gold);
          border-color: var(--gold);
          color: var(--void);
        }

        .step-node.active {
          background: var(--gold-dim);
          border-color: var(--gold);
          color: var(--gold);
          box-shadow: 0 0 0 4px rgba(200,168,82,0.1);
        }

        .step-node.idle {
          background: transparent;
          border-color: var(--text-muted);
          color: var(--text-muted);
        }

        .step-line {
          flex: 1;
          height: 1px;
          background: var(--border);
          margin: 0 4px;
          transition: background 0.4s ease;
          max-width: 60px;
        }

        .step-line.done { background: var(--gold); opacity: 0.4; }

        .step-label-row {
          display: flex;
          justify-content: space-between;
          margin-top: 6px;
          margin-bottom: 28px;
        }

        .step-label {
          font-size: 10px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-muted);
          font-weight: 400;
          transition: color 0.3s;
        }

        .step-label.active { color: var(--gold); }

        /* Form fields */
        .field-group {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-bottom: 20px;
          opacity: 0;
          animation: slideIn 0.5s 0.2s ease forwards;
        }

        .field-row {
          display: flex;
          gap: 12px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
        }

        .field-label {
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .field-input-wrap {
          position: relative;
        }

        .field-input {
          width: 100%;
          background: var(--input-bg);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 13px 16px;
          font-size: 14px;
          font-family: 'Outfit', sans-serif;
          font-weight: 300;
          color: var(--text-primary);
          outline: none;
          transition: all 0.25s ease;
          -webkit-appearance: none;
        }

        .field-input::placeholder { color: var(--text-muted); }

        .field-input:hover {
          background: var(--input-hover);
          border-color: rgba(255,255,255,0.12);
        }

        .field-input:focus {
          background: rgba(200,168,82,0.04);
          border-color: var(--gold);
          box-shadow: 0 0 0 3px rgba(200,168,82,0.08);
        }

        .field-input-wrap .icon {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          cursor: pointer;
          transition: color 0.2s;
          display: flex;
          align-items: center;
        }

        .field-input-wrap .icon:hover { color: var(--text-secondary); }
        .field-input-wrap.has-icon .field-input { padding-right: 44px; }

        select.field-input {
          cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 7L11 1' stroke='%236B6860' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 14px center;
          padding-right: 40px;
        }

        /* Password strength */
        .strength-row {
          display: flex;
          gap: 4px;
          margin-top: 8px;
          align-items: center;
        }

        .strength-seg {
          height: 2px;
          flex: 1;
          border-radius: 2px;
          background: var(--text-muted);
          transition: background 0.3s ease;
        }

        .strength-text {
          font-size: 11px;
          letter-spacing: 0.06em;
          font-weight: 500;
          margin-left: 8px;
          min-width: 60px;
          transition: color 0.3s;
        }

        /* Divider */
        .or-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 20px 0;
          opacity: 0;
          animation: slideIn 0.5s 0.25s ease forwards;
        }

        .or-divider::before,
        .or-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--border);
        }

        .or-text {
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--text-muted);
          font-weight: 400;
        }

        /* SSO Buttons */
        .sso-row {
          display: flex;
          gap: 10px;
          margin-bottom: 24px;
          opacity: 0;
          animation: slideIn 0.5s 0.3s ease forwards;
        }

        .sso-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 11px 12px;
          background: var(--input-bg);
          border: 1px solid var(--border);
          border-radius: 8px;
          font-size: 12.5px;
          font-family: 'Outfit', sans-serif;
          font-weight: 400;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .sso-btn:hover {
          background: var(--input-hover);
          border-color: rgba(255,255,255,0.14);
          color: var(--text-primary);
        }

        .sso-btn svg { width: 16px; height: 16px; flex-shrink: 0; }

        /* CTA */
        .cta-btn {
          width: 100%;
          padding: 15px 24px;
          background: linear-gradient(135deg, var(--gold) 0%, #A8882A 100%);
          border: none;
          border-radius: 8px;
          font-size: 13.5px;
          font-family: 'Outfit', sans-serif;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--void);
          cursor: pointer;
          transition: all 0.25s ease;
          position: relative;
          overflow: hidden;
          opacity: 0;
          animation: slideIn 0.5s 0.35s ease forwards;
        }

        .cta-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%);
          opacity: 0;
          transition: opacity 0.2s;
        }

        .cta-btn:hover::before { opacity: 1; }
        .cta-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(200,168,82,0.25); }
        .cta-btn:active { transform: translateY(0); }

        .cta-secondary {
          width: 100%;
          padding: 14px 24px;
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 8px;
          font-size: 13.5px;
          font-family: 'Outfit', sans-serif;
          font-weight: 400;
          letter-spacing: 0.04em;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
          margin-top: 10px;
        }

        .cta-secondary:hover {
          border-color: rgba(255,255,255,0.14);
          color: var(--text-primary);
          background: var(--input-hover);
        }

        /* Terms */
        .terms-text {
          font-size: 11.5px;
          color: var(--text-muted);
          text-align: center;
          margin-top: 18px;
          line-height: 1.65;
          opacity: 0;
          animation: slideIn 0.5s 0.4s ease forwards;
        }

        .terms-text a {
          color: var(--gold);
          text-decoration: none;
          opacity: 0.8;
        }

        .terms-text a:hover { opacity: 1; text-decoration: underline; }

        /* Sign in link */
        .signin-row {
          text-align: center;
          margin-top: 20px;
          font-size: 12.5px;
          color: var(--text-muted);
          opacity: 0;
          animation: slideIn 0.5s 0.45s ease forwards;
        }

        .signin-row a {
          color: var(--gold);
          text-decoration: none;
          font-weight: 500;
        }

        /* Feature badges on left */
        .feature-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          position: relative;
          z-index: 2;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 13px;
          color: var(--text-secondary);
          font-weight: 300;
        }

        .feature-icon {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          background: var(--gold-dim);
          border: 1px solid rgba(200,168,82,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .feature-icon svg { width: 13px; height: 13px; color: var(--gold); }

        /* Animated orb */
        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          pointer-events: none;
        }

        /* Input with prefix */
        .input-prefix {
          position: absolute;
          left: 1px;
          top: 1px;
          bottom: 1px;
          display: flex;
          align-items: center;
          padding: 0 12px;
          font-size: 12px;
          color: var(--text-muted);
          border-right: 1px solid var(--border);
          border-radius: 7px 0 0 7px;
          background: rgba(255,255,255,0.02);
          letter-spacing: 0.02em;
          white-space: nowrap;
        }

        .field-input.with-prefix { padding-left: 74px; }

        /* Step content fade */
        .step-content {
          animation: slideIn 0.4s ease forwards;
        }

        @media (max-width: 900px) {
          .eso-left { display: none; }
          .eso-right { padding: 32px 24px; }
          .form-container { max-width: 100%; }
        }
      `}</style>

      <div className="eso-root">
        {/* LEFT PANEL */}
        <div className="eso-left">
          <div className="solar-grid" />

          {/* Floating particles */}
          {mounted && particles.map((p) => (
            <div
              key={p.id}
              className="particle"
              style={{
                left: `${p.x}%`,
                bottom: `${p.y % 40}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                opacity: p.opacity,
                animationDuration: `${p.speed}s`,
                animationDelay: `${p.delay}s`,
              }}
            />
          ))}

          {/* Ambient orb */}
          <div className="orb" style={{
            width: 320, height: 320,
            background: "radial-gradient(circle, rgba(200,168,82,0.09) 0%, transparent 70%)",
            bottom: -60, right: -80,
          }} />
          <div className="orb" style={{
            width: 200, height: 200,
            background: "radial-gradient(circle, rgba(45,212,191,0.06) 0%, transparent 70%)",
            top: 80, right: 40,
          }} />

          {/* Brand */}
          <div className="brand-mark">
            <div className="brand-icon">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                  stroke="#C8A852" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <div className="brand-name">ESO Energy</div>
              <div className="brand-sub">Inverter Intelligence</div>
            </div>
          </div>

          {/* Hero */}
          <div className="hero-copy">
            <div className="hero-label">Enterprise Platform</div>
            <h1 className="hero-title">
              Monitor every<br/>watt with<br/><em>precision.</em>
            </h1>
            <p className="hero-desc">
              Real-time solar inverter intelligence for energy operators who demand complete visibility across every asset, site, and megawatt in their portfolio.
            </p>
            <div className="stat-pill">
              <span className="stat-dot" />
              Live across 2,400+ sites globally
            </div>
          </div>

          {/* Energy bars */}
          <div style={{ position: "relative", zIndex: 2 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 10, fontWeight: 400 }}>
              Active Output — Fleet Average
            </div>
            <div className="energy-bar-wrap">
              {[
                { label: "Site A — Berlin", pct: 92, color: "#C8A852", delay: "0s" },
                { label: "Site B — Madrid", pct: 78, color: "#2DD4BF", delay: "0.3s" },
                { label: "Site C — Dubai", pct: 85, color: "#C8A852", delay: "0.6s" },
              ].map((b) => (
                <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", width: 130, flexShrink: 0, fontWeight: 300 }}>{b.label}</div>
                  <div className="energy-bar" style={{ flex: 1 }}>
                    <div className="energy-bar-fill" style={{
                      background: `linear-gradient(90deg, ${b.color}88, ${b.color})`,
                      width: `${b.pct}%`,
                      animationDelay: b.delay,
                    }} />
                  </div>
                  <div style={{ fontSize: 11, color: b.color, width: 36, textAlign: "right", fontWeight: 500 }}>{b.pct}%</div>
                </div>
              ))}
            </div>
          </div>

          {/* Metrics */}
          <div className="metrics">
            <div className="metric">
              <div className="metric-value">14.2<span>GW</span></div>
              <div className="metric-label">Monitored capacity</div>
            </div>
            <div className="metric-divider" />
            <div className="metric">
              <div className="metric-value">99.8<span>%</span></div>
              <div className="metric-label">Platform uptime</div>
            </div>
            <div className="metric-divider" />
            <div className="metric">
              <div className="metric-value">340<span>ms</span></div>
              <div className="metric-label">Avg. alert latency</div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="eso-right">
          <div className="form-container">
            <div className="form-header">
              <div className="form-eyebrow">New Account</div>
              <h2 className="form-title">
                {step === 1 ? "Create your workspace" : "Configure your fleet"}
              </h2>
              <p className="form-subtitle">
                {step === 1
                  ? "Start monitoring your inverter portfolio in minutes."
                  : "Tell us about your energy infrastructure."}
              </p>
            </div>

            {/* Step indicator */}
            <div className="step-indicator">
              {[1, 2].map((s, i) => (
                <>
                  <div
                    key={s}
                    className={`step-node ${s < step ? "done" : s === step ? "active" : "idle"}`}
                    onClick={() => s < step && setStep(s)}
                  >
                    {s < step ? (
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : s}
                  </div>
                  {i < 1 && (
                    <div key={`line-${s}`} className={`step-line ${s < step ? "done" : ""}`} />
                  )}
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
                {/* SSO */}
                <div className="sso-row">
                  <button className="sso-btn">
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Google SSO
                  </button>
                  <button className="sso-btn">
                    <svg viewBox="0 0 24 24" fill="currentColor" style={{color:"#60A5FA"}}>
                      <path d="M21.007 0H2.993A2.993 2.993 0 000 2.993v18.014A2.993 2.993 0 002.993 24h9.18v-9.297H9.25V11.07h2.923V8.418c0-2.9 1.772-4.479 4.365-4.479 1.24 0 2.306.092 2.616.133v3.035h-1.795c-1.407 0-1.68.67-1.68 1.65v2.313h3.356l-.437 3.633h-2.919V24h5.328A2.993 2.993 0 0024 21.007V2.993A2.993 2.993 0 0021.007 0z"/>
                    </svg>
                    Microsoft SSO
                  </button>
                </div>

                <div className="or-divider"><span className="or-text">or continue with email</span></div>

                <div className="field-group">
                  <div className="field-row">
                    <div className="field">
                      <label className="field-label">First Name</label>
                      <div className="field-input-wrap">
                        <input className="field-input" name="fullName" placeholder="Alex" value={formData.fullName} onChange={handleChange} onFocus={() => setFocused("fullName")} onBlur={() => setFocused(null)} />
                      </div>
                    </div>
                    <div className="field">
                      <label className="field-label">Last Name</label>
                      <div className="field-input-wrap">
                        <input className="field-input" name="lastName" placeholder="Morgan" onChange={handleChange} onFocus={() => setFocused("lastName")} onBlur={() => setFocused(null)} />
                      </div>
                    </div>
                  </div>

                  <div className="field">
                    <label className="field-label">Work Email</label>
                    <div className="field-input-wrap">
                      <input className="field-input" type="email" name="email" placeholder="alex@company.com" value={formData.email} onChange={handleChange} onFocus={() => setFocused("email")} onBlur={() => setFocused(null)} />
                      <span className="icon">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                          <polyline points="22,6 12,13 2,6"/>
                        </svg>
                      </span>
                    </div>
                  </div>

                  <div className="field">
                    <label className="field-label">Password</label>
                    <div className="field-input-wrap has-icon">
                      <input className="field-input" type={showPass ? "text" : "password"} name="password" placeholder="Min. 8 characters" value={formData.password} onChange={handleChange} onFocus={() => setFocused("password")} onBlur={() => setFocused(null)} />
                      <span className="icon" onClick={() => setShowPass(!showPass)}>
                        {showPass ? (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                            <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                            <line x1="1" y1="1" x2="23" y2="23"/>
                          </svg>
                        ) : (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                        )}
                      </span>
                    </div>
                    {formData.password && (
                      <div className="strength-row">
                        {[1,2,3,4].map((i) => (
                          <div key={i} className="strength-seg" style={{
                            background: i <= strength ? strengthColor : undefined,
                            opacity: i <= strength ? 1 : undefined,
                          }} />
                        ))}
                        <span className="strength-text" style={{ color: strengthColor }}>{strengthLabel}</span>
                      </div>
                    )}
                  </div>
                </div>

                <button className="cta-btn" onClick={() => setStep(2)}>
                  Continue — Fleet Setup →
                </button>
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

                  {/* Feature list */}
                  <div style={{ marginTop: 4, padding: "16px", background: "rgba(200,168,82,0.04)", border: "1px solid rgba(200,168,82,0.12)", borderRadius: 10 }}>
                    <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--gold)", fontWeight: 500, marginBottom: 12 }}>Your plan includes</div>
                    <div className="feature-list">
                      {[
                        { icon: "⚡", text: "Real-time inverter telemetry & fault alerts" },
                        { icon: "📊", text: "Yield analysis & performance benchmarking" },
                        { icon: "🔌", text: "Multi-brand inverter protocol support" },
                      ].map((f) => (
                        <div className="feature-item" key={f.text}>
                          <div className="feature-icon">
                            <span style={{ fontSize: 11 }}>{f.icon}</span>
                          </div>
                          {f.text}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <button className="cta-btn">
                  Activate ESO Workspace →
                </button>
                <button className="cta-secondary" onClick={() => setStep(1)}>
                  ← Back to account details
                </button>
              </div>
            )}

            <p className="terms-text">
              By creating an account you agree to ESO Energy's{" "}
              <a href="#">Terms of Service</a> and{" "}
              <a href="#">Privacy Policy</a>. Enterprise agreements available on request.
            </p>

            <div className="signin-row">
              Already have a workspace?{" "}
              <a href="#">Sign in →</a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default EsoEnergyCreateAccount;