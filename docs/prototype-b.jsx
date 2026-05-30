// Direction B — "Athletic OS" — bold, dark, high-contrast performance dashboard
const B_TOKENS = {
  bg: '#0A0B0D',
  surface: '#111317',
  surface2: '#171A1F',
  border: '#1F242B',
  border2: '#2A3038',
  ink: '#F5F7FA',
  ink2: '#9BA3AE',
  ink3: '#5A6270',
  accent: '#C5F73B', // electric lime
  warn: '#FF8A3D',
  danger: '#FF5C5C',
  good: '#3DE8A0',
  sans: '"Geist", "Inter", -apple-system, sans-serif',
  mono: '"Geist Mono", "JetBrains Mono", ui-monospace, monospace',
};

const bBase = {
  fontFamily: B_TOKENS.sans,
  background: B_TOKENS.bg,
  color: B_TOKENS.ink,
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
};

const bMono = { fontFamily: B_TOKENS.mono, fontFeatureSettings: '"tnum"' };
const bChip = { fontFamily: B_TOKENS.mono, fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '3px 7px', borderRadius: 3 };

// ============ COACH: CLIENTS ============
function BCoachClients() {
  const clients = [
    { name: 'Marko Horvat', tag: 'CUT.W3', last: '2h', wt: 82.4, d: -0.6, adh: 86, rpe: 7.8, st: 'green' },
    { name: 'Iva Kraljević', tag: 'RECOMP.W7', last: '4h', wt: 64.1, d: 0.1, adh: 100, rpe: 8.2, st: 'green' },
    { name: 'Luka Babić', tag: 'BULK.W2', last: '2d', wt: 91.0, d: 0.8, adh: 57, rpe: 6.4, st: 'amber' },
    { name: 'Ana Petrović', tag: 'CUT.W5', last: '1h', wt: 58.2, d: -0.4, adh: 100, rpe: 8.0, st: 'green' },
    { name: 'Tomislav Jurić', tag: 'MAINT', last: '5d', wt: 78.9, d: 0.0, adh: 28, rpe: '—', st: 'red' },
    { name: 'Sara Kovač', tag: 'CUT.W1', last: '1d', wt: 70.3, d: -0.2, adh: 71, rpe: 7.5, st: 'green' },
    { name: 'Filip Novak', tag: 'BULK.W9', last: '3h', wt: 88.5, d: 0.3, adh: 86, rpe: 8.5, st: 'green' },
    { name: 'Mia Vuković', tag: 'RECOMP.W4', last: '1d', wt: 61.7, d: -0.1, adh: 71, rpe: 7.2, st: 'green' },
  ];
  const stColor = { green: B_TOKENS.good, amber: B_TOKENS.warn, red: B_TOKENS.danger };
  return (
    <div style={bBase}>
      <BSidebar active="clients" />
      <div style={{ marginLeft: 240, flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <BTopBar />
        <div style={{ padding: '32px 40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ ...bMono, fontSize: 11, color: B_TOKENS.ink3, letterSpacing: '0.08em' }}>~/CLIENTS — 8 ACTIVE</div>
              <h1 style={{ fontSize: 36, fontWeight: 600, margin: '8px 0 0', letterSpacing: '-0.02em' }}>Roster</h1>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ background: B_TOKENS.surface, color: B_TOKENS.ink, border: `1px solid ${B_TOKENS.border}`, padding: '8px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer', ...bMono }}>⌘K Search</button>
              <button style={{ background: B_TOKENS.accent, color: '#0A0B0D', border: 'none', padding: '8px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ New client</button>
            </div>
          </div>

          {/* Stat strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 28 }}>
            {[
              ['Logging today', '5/8', B_TOKENS.accent, 0.62],
              ['Avg adherence', '78%', B_TOKENS.good, 0.78],
              ['Need attention', '2', B_TOKENS.warn, 0.25],
              ['Avg RPE 7d', '7.6', B_TOKENS.ink, 0.76],
            ].map(([k, v, c, p]) => (
              <div key={k} style={{ background: B_TOKENS.surface, border: `1px solid ${B_TOKENS.border}`, borderRadius: 8, padding: 16 }}>
                <div style={{ ...bMono, fontSize: 10, color: B_TOKENS.ink3, letterSpacing: '0.08em' }}>{k.toUpperCase()}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 8 }}>
                  <span style={{ fontSize: 28, fontWeight: 600, ...bMono }}>{v}</span>
                  <svg width="60" height="20" viewBox="0 0 60 20">
                    <polyline points={[0,1,2,3,4,5,6,7,8,9].map((x,i) => `${x*6.6},${10 + Math.sin(i*0.8)*5*(1-p)}`).join(' ')} fill="none" stroke={c} strokeWidth="1.5" />
                  </svg>
                </div>
              </div>
            ))}
          </div>

          {/* Filter chips */}
          <div style={{ display: 'flex', gap: 6, marginTop: 28, alignItems: 'center' }}>
            {['All', 'On track', 'Need attention', 'Overdue', 'Cut', 'Bulk', 'Recomp'].map((f, i) => (
              <button key={f} style={{
                ...bChip,
                background: i === 0 ? B_TOKENS.ink : B_TOKENS.surface,
                color: i === 0 ? B_TOKENS.bg : B_TOKENS.ink2,
                border: `1px solid ${i === 0 ? B_TOKENS.ink : B_TOKENS.border}`,
                cursor: 'pointer',
              }}>{f}</button>
            ))}
            <span style={{ marginLeft: 'auto', ...bMono, fontSize: 11, color: B_TOKENS.ink3 }}>SORT: LAST_LOG ↓</span>
          </div>

          {/* Table */}
          <div style={{ marginTop: 16, background: B_TOKENS.surface, border: `1px solid ${B_TOKENS.border}`, borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.6fr 0.7fr 0.6fr 1fr 0.6fr 0.4fr', padding: '12px 20px', borderBottom: `1px solid ${B_TOKENS.border}`, ...bMono, fontSize: 10, color: B_TOKENS.ink3, letterSpacing: '0.08em' }}>
              <span>CLIENT</span><span>PHASE</span><span>LAST</span><span>WEIGHT</span><span>7D Δ</span><span>ADHERENCE</span><span>RPE</span><span></span>
            </div>
            {clients.map((c, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.6fr 0.7fr 0.6fr 1fr 0.6fr 0.4fr', padding: '14px 20px', borderBottom: i < clients.length - 1 ? `1px solid ${B_TOKENS.border}` : 'none', alignItems: 'center', fontSize: 13 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: B_TOKENS.surface2, border: `1px solid ${B_TOKENS.border2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600 }}>{c.name.split(' ').map(s => s[0]).join('')}</div>
                  <span style={{ fontWeight: 500 }}>{c.name}</span>
                </div>
                <span style={{ ...bChip, background: B_TOKENS.surface2, color: B_TOKENS.ink2, border: `1px solid ${B_TOKENS.border2}`, justifySelf: 'start' }}>{c.tag}</span>
                <span style={{ ...bMono, fontSize: 11, color: B_TOKENS.ink2 }}>{c.last}</span>
                <span style={{ ...bMono, fontSize: 12 }}>{c.wt}</span>
                <span style={{ ...bMono, fontSize: 12, color: c.d < 0 ? B_TOKENS.good : c.d > 0 ? B_TOKENS.warn : B_TOKENS.ink3 }}>{c.d > 0 ? '+' : ''}{c.d.toFixed(1)}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 4, background: B_TOKENS.border, borderRadius: 2, overflow: 'hidden', maxWidth: 80 }}>
                    <div style={{ height: '100%', width: `${c.adh}%`, background: stColor[c.st] }} />
                  </div>
                  <span style={{ ...bMono, fontSize: 11, color: B_TOKENS.ink2 }}>{c.adh}%</span>
                </div>
                <span style={{ ...bMono, fontSize: 12 }}>{c.rpe}</span>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: stColor[c.st], boxShadow: `0 0 8px ${stColor[c.st]}66`, justifySelf: 'end' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BSidebar({ active }) {
  const items = [
    ['clients', 'Clients', 'C'],
    ['programs', 'Programs', 'P'],
    ['exercises', 'Exercises', 'E'],
    ['foods', 'Foods', 'F'],
    ['meals', 'Meals', 'M'],
    ['analytics', 'Analytics', 'A'],
  ];
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 240, background: B_TOKENS.surface, borderRight: `1px solid ${B_TOKENS.border}`, padding: '20px 16px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 8px 24px' }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: B_TOKENS.accent, color: '#0A0B0D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>K</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>koach</div>
          <div style={{ ...bMono, fontSize: 9, color: B_TOKENS.ink3, letterSpacing: '0.1em' }}>v2.4 · COACH</div>
        </div>
      </div>

      <div style={{ ...bMono, fontSize: 9, color: B_TOKENS.ink3, padding: '12px 8px 8px', letterSpacing: '0.1em' }}>WORKSPACE</div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map(([id, label, k]) => (
          <a key={id} style={{
            padding: '8px 10px',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: active === id ? B_TOKENS.ink : B_TOKENS.ink2,
            background: active === id ? B_TOKENS.surface2 : 'transparent',
            fontSize: 13,
            cursor: 'pointer',
          }}>
            <span style={{ flex: 1 }}>{label}</span>
            <span style={{ ...bMono, fontSize: 10, color: B_TOKENS.ink3, padding: '1px 5px', background: B_TOKENS.bg, borderRadius: 3, border: `1px solid ${B_TOKENS.border}` }}>{k}</span>
          </a>
        ))}
      </nav>

      <div style={{ marginTop: 'auto', padding: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: `1px solid ${B_TOKENS.border}` }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #C5F73B, #3DE8A0)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0A0B0D', fontSize: 11, fontWeight: 700 }}>IG</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500 }}>Coach Igor</div>
            <div style={{ ...bMono, fontSize: 10, color: B_TOKENS.good }}>● online</div>
          </div>
          <div style={{ display: 'flex', gap: 2 }}>
            <span style={{ ...bChip, background: B_TOKENS.surface2, color: B_TOKENS.ink3 }}>HR</span>
            <span style={{ ...bChip, background: B_TOKENS.accent, color: '#0A0B0D' }}>EN</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function BTopBar() {
  return (
    <div style={{ height: 44, borderBottom: `1px solid ${B_TOKENS.border}`, background: B_TOKENS.surface, display: 'flex', alignItems: 'center', padding: '0 24px 0 32px', gap: 16, position: 'relative', zIndex: 1 }}>
      <span style={{ ...bMono, fontSize: 11, color: B_TOKENS.ink3 }}>workspace / coach / clients</span>
      <span style={{ marginLeft: 'auto', ...bMono, fontSize: 11, color: B_TOKENS.ink3 }}>THU 7 MAY · 09:42</span>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: B_TOKENS.good }} />
    </div>
  );
}

// ============ COACH: CLIENT DETAIL ============
function BCoachClientDetail() {
  return (
    <div style={bBase}>
      <BSidebar active="clients" />
      <div style={{ marginLeft: 240, flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <BTopBar />
        <div style={{ padding: '24px 40px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: 12, background: 'linear-gradient(135deg, #C5F73B, #3DE8A0)', color: '#0A0B0D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18 }}>MH</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h1 style={{ fontSize: 28, fontWeight: 600, margin: 0, letterSpacing: '-0.01em' }}>Marko Horvat</h1>
                <span style={{ ...bChip, background: 'rgba(61,232,160,0.12)', color: B_TOKENS.good, border: `1px solid rgba(61,232,160,0.3)` }}>● ON TRACK</span>
                <span style={{ ...bChip, background: B_TOKENS.surface, color: B_TOKENS.ink2, border: `1px solid ${B_TOKENS.border}` }}>CUT.W3</span>
              </div>
              <div style={{ ...bMono, fontSize: 11, color: B_TOKENS.ink3, marginTop: 4 }}>STARTED 14_APR_2026 · 35 DAYS · NEXT CHECK-IN: SUN</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button style={{ background: B_TOKENS.surface, color: B_TOKENS.ink, border: `1px solid ${B_TOKENS.border}`, padding: '8px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Message</button>
              <button style={{ background: B_TOKENS.surface, color: B_TOKENS.ink, border: `1px solid ${B_TOKENS.border}`, padding: '8px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>↻ Reminder</button>
              <button style={{ background: B_TOKENS.accent, color: '#0A0B0D', border: 'none', padding: '8px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Open program ↗</button>
            </div>
          </div>

          {/* Macro rings */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginTop: 24 }}>
            {[
              ['CALORIES', '2,180', '2,400', 91, B_TOKENS.accent],
              ['PROTEIN', '168', '180', 93, '#7DD3FC'],
              ['CARBS', '210', '240', 87, '#FBBF24'],
              ['FAT', '62', '70', 88, '#FB7185'],
              ['STEPS', '8.4k', '10k', 84, '#A78BFA'],
              ['SLEEP', '7.5h', '8h', 94, '#3DE8A0'],
            ].map(([k, v, t, p, c]) => (
              <div key={k} style={{ background: B_TOKENS.surface, border: `1px solid ${B_TOKENS.border}`, borderRadius: 10, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ ...bMono, fontSize: 10, color: B_TOKENS.ink3, letterSpacing: '0.08em' }}>{k}</div>
                  <svg width="28" height="28" viewBox="0 0 28 28">
                    <circle cx="14" cy="14" r="11" fill="none" stroke={B_TOKENS.border2} strokeWidth="2.5" />
                    <circle cx="14" cy="14" r="11" fill="none" stroke={c} strokeWidth="2.5" strokeDasharray="69" strokeDashoffset={69 - (69 * p / 100)} transform="rotate(-90 14 14)" strokeLinecap="round" />
                  </svg>
                </div>
                <div style={{ ...bMono, fontSize: 22, fontWeight: 600, marginTop: 8 }}>{v}</div>
                <div style={{ ...bMono, fontSize: 10, color: B_TOKENS.ink3, marginTop: 2 }}>/ {t} · {p}%</div>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, marginTop: 16 }}>
            <div style={{ background: B_TOKENS.surface, border: `1px solid ${B_TOKENS.border}`, borderRadius: 10, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ ...bMono, fontSize: 10, color: B_TOKENS.ink3, letterSpacing: '0.08em' }}>BODY WEIGHT · 30D</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
                    <span style={{ fontSize: 32, fontWeight: 600, ...bMono }}>82.4</span>
                    <span style={{ fontSize: 14, color: B_TOKENS.ink3 }}>kg</span>
                    <span style={{ ...bChip, background: 'rgba(61,232,160,0.12)', color: B_TOKENS.good, marginLeft: 8 }}>↓ 1.8 kg</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {['7D', '30D', '90D', 'ALL'].map((p, i) => (
                    <button key={p} style={{ ...bChip, background: i === 1 ? B_TOKENS.surface2 : 'transparent', color: i === 1 ? B_TOKENS.ink : B_TOKENS.ink3, border: `1px solid ${i === 1 ? B_TOKENS.border2 : 'transparent'}`, cursor: 'pointer' }}>{p}</button>
                  ))}
                </div>
              </div>
              <svg viewBox="0 0 600 160" style={{ width: '100%', height: 160, marginTop: 16 }}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={B_TOKENS.accent} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={B_TOKENS.accent} stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[40, 80, 120].map(y => <line key={y} x1="0" y1={y} x2="600" y2={y} stroke={B_TOKENS.border} strokeDasharray="3 4" />)}
                <path d="M 0,40 L 0,50 L 30,55 L 60,52 L 90,60 L 120,58 L 150,68 L 180,65 L 210,75 L 240,72 L 270,80 L 300,78 L 330,88 L 360,85 L 390,95 L 420,92 L 450,100 L 480,98 L 510,108 L 540,105 L 570,115 L 600,110 L 600,160 L 0,160 Z" fill="url(#grad)" />
                <polyline points="0,50 30,55 60,52 90,60 120,58 150,68 180,65 210,75 240,72 270,80 300,78 330,88 360,85 390,95 420,92 450,100 480,98 510,108 540,105 570,115 600,110" fill="none" stroke={B_TOKENS.accent} strokeWidth="2" />
                <circle cx="600" cy="110" r="4" fill={B_TOKENS.accent} />
                <circle cx="600" cy="110" r="8" fill={B_TOKENS.accent} fillOpacity="0.2" />
              </svg>
            </div>

            <div style={{ background: B_TOKENS.surface, border: `1px solid ${B_TOKENS.border}`, borderRadius: 10, padding: 20 }}>
              <div style={{ ...bMono, fontSize: 10, color: B_TOKENS.ink3, letterSpacing: '0.08em' }}>ADHERENCE · 14D</div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', marginTop: 16, height: 100 }}>
                {[80, 100, 90, 70, 100, 100, 60, 90, 100, 80, 70, 100, 90, 86].map((h, i) => (
                  <div key={i} style={{ flex: 1, height: `${h}%`, background: h >= 80 ? B_TOKENS.accent : h >= 60 ? B_TOKENS.warn : B_TOKENS.danger, borderRadius: 2, opacity: i === 13 ? 1 : 0.6 }} />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', ...bMono, fontSize: 10, color: B_TOKENS.ink3, marginTop: 10 }}>
                <span>2W AGO</span><span>TODAY</span>
              </div>
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${B_TOKENS.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
                  <span style={{ color: B_TOKENS.ink2 }}>Avg adherence</span>
                  <span style={{ ...bMono, fontWeight: 600 }}>86%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: B_TOKENS.ink2 }}>Streak</span>
                  <span style={{ ...bMono, fontWeight: 600, color: B_TOKENS.accent }}>9 days 🔥</span>
                </div>
              </div>
            </div>
          </div>

          {/* Daily logs */}
          <div style={{ marginTop: 16, background: B_TOKENS.surface, border: `1px solid ${B_TOKENS.border}`, borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${B_TOKENS.border}`, display: 'flex', alignItems: 'center', gap: 20 }}>
              {['Daily logs', 'Check-ins', 'Measurements', 'Notes', 'Photos'].map((t, i) => (
                <a key={t} style={{ fontSize: 13, color: i === 0 ? B_TOKENS.ink : B_TOKENS.ink3, fontWeight: i === 0 ? 600 : 400, cursor: 'pointer', position: 'relative', paddingBottom: 2 }}>
                  {t}
                  {i === 0 && <span style={{ position: 'absolute', left: 0, right: 0, bottom: -16, height: 2, background: B_TOKENS.accent }} />}
                </a>
              ))}
              <span style={{ marginLeft: 'auto', ...bMono, fontSize: 11, color: B_TOKENS.ink3 }}>14 ROWS</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.7fr 0.7fr 0.7fr 0.7fr 0.7fr 0.7fr', padding: '10px 20px', borderBottom: `1px solid ${B_TOKENS.border}`, ...bMono, fontSize: 10, color: B_TOKENS.ink3, letterSpacing: '0.08em' }}>
              <span>DATE</span><span>WEIGHT</span><span>KCAL</span><span>P</span><span>C</span><span>STEPS</span><span>SLEEP</span>
            </div>
            {[
              ['Thu 7 May', '82.4', '2,180', '168', '210', '8,420', '7.5'],
              ['Wed 6 May', '82.6', '2,210', '172', '215', '9,100', '7.0'],
              ['Tue 5 May', '82.8', '2,350', '180', '230', '10,200', '8.0'],
              ['Mon 4 May', '82.7', '2,090', '165', '200', '7,800', '6.5'],
              ['Sun 3 May', '83.0', '—', '—', '—', '5,200', '7.0'],
            ].map((r, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 0.7fr 0.7fr 0.7fr 0.7fr 0.7fr 0.7fr', padding: '12px 20px', borderBottom: i < 4 ? `1px solid ${B_TOKENS.border}` : 'none', ...bMono, fontSize: 12 }}>
                {r.map((v, j) => <span key={j} style={{ color: v === '—' ? B_TOKENS.ink3 : B_TOKENS.ink }}>{v}</span>)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ CLIENT: TODAY ============
function BClientToday() {
  return (
    <div style={{ ...bBase, fontSize: 14 }}>
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ ...bMono, fontSize: 10, color: B_TOKENS.ink3, letterSpacing: '0.1em' }}>THU · 07 MAY · DAY 35</div>
            <h1 style={{ fontSize: 28, fontWeight: 600, margin: '6px 0 0', letterSpacing: '-0.02em' }}>Hey Marko.</h1>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <span style={{ ...bChip, background: 'rgba(197,247,59,0.12)', color: B_TOKENS.accent, border: `1px solid rgba(197,247,59,0.3)` }}>🔥 9D</span>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        {/* Hero card */}
        <div style={{ background: B_TOKENS.surface, border: `1px solid ${B_TOKENS.border}`, borderRadius: 14, padding: 20, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, background: `radial-gradient(circle, ${B_TOKENS.accent}33, transparent 70%)` }} />
          <div style={{ ...bMono, fontSize: 10, color: B_TOKENS.ink3, letterSpacing: '0.1em' }}>ENERGY BUDGET</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 8 }}>
            <span style={{ fontSize: 44, fontWeight: 700, ...bMono, letterSpacing: '-0.02em' }}>1,920</span>
            <span style={{ fontSize: 14, color: B_TOKENS.ink2 }}>/ 2,400 kcal</span>
          </div>
          <div style={{ marginTop: 14, height: 6, background: B_TOKENS.border, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '80%', background: B_TOKENS.accent, borderRadius: 3 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 18 }}>
            {[
              ['PROTEIN', '142', '180', '#7DD3FC'],
              ['CARBS', '188', '240', '#FBBF24'],
              ['FAT', '54', '70', '#FB7185'],
            ].map(([k, v, t, c]) => (
              <div key={k}>
                <div style={{ ...bMono, fontSize: 9, color: B_TOKENS.ink3, letterSpacing: '0.08em' }}>{k}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                  <span style={{ ...bMono, fontSize: 16, fontWeight: 600 }}>{v}</span>
                  <span style={{ ...bMono, fontSize: 10, color: B_TOKENS.ink3 }}>/{t}g</span>
                </div>
                <div style={{ marginTop: 4, height: 2, background: B_TOKENS.border, borderRadius: 1 }}>
                  <div style={{ height: '100%', width: `${(v/t)*100}%`, background: c, borderRadius: 1 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Training card */}
        <div style={{ marginTop: 14, background: B_TOKENS.surface, border: `1px solid ${B_TOKENS.border}`, borderRadius: 14, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ ...bMono, fontSize: 10, color: B_TOKENS.ink3, letterSpacing: '0.1em' }}>TODAY'S SESSION</div>
            <span style={{ ...bChip, background: B_TOKENS.surface2, color: B_TOKENS.ink2 }}>RPE 7–8</span>
          </div>
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: B_TOKENS.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🦵</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 600 }}>Day A — Legs</div>
              <div style={{ ...bMono, fontSize: 11, color: B_TOKENS.ink3, marginTop: 2 }}>5 EXERCISES · ~52 MIN · 18 SETS</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 14 }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{ flex: 1, height: 28, background: B_TOKENS.surface2, border: `1px solid ${B_TOKENS.border2}`, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', ...bMono, fontSize: 10, color: B_TOKENS.ink3 }}>{i}</div>
            ))}
          </div>
          <button style={{ marginTop: 14, width: '100%', background: B_TOKENS.accent, color: '#0A0B0D', border: 'none', padding: '14px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>▶ Start session</button>
        </div>

        {/* Meals */}
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ ...bMono, fontSize: 10, color: B_TOKENS.ink3, letterSpacing: '0.1em' }}>MEALS · 3 / 4</div>
            <a style={{ fontSize: 12, color: B_TOKENS.accent, cursor: 'pointer' }}>+ Log</a>
          </div>
          {[
            ['Breakfast', 'Oats, banana, whey', 480, true],
            ['Lunch', 'Chicken, rice, veg', 720, true],
            ['Snack', 'Greek yogurt, berries', 220, true],
            ['Dinner', 'Salmon, sweet potato', 500, false],
          ].map(([m, f, k, done]) => (
            <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: B_TOKENS.surface, border: `1px solid ${B_TOKENS.border}`, borderRadius: 10, marginBottom: 6 }}>
              <span style={{ width: 18, height: 18, borderRadius: 5, background: done ? B_TOKENS.accent : 'transparent', border: `1px solid ${done ? B_TOKENS.accent : B_TOKENS.border2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#0A0B0D' }}>{done ? '✓' : ''}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{m}</div>
                <div style={{ fontSize: 11, color: B_TOKENS.ink3, marginTop: 2 }}>{f}</div>
              </div>
              <div style={{ ...bMono, fontSize: 12, color: done ? B_TOKENS.ink : B_TOKENS.ink3 }}>{k}<span style={{ fontSize: 9, color: B_TOKENS.ink3 }}>kcal</span></div>
            </div>
          ))}
        </div>

        {/* Mini stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
          <div style={{ background: B_TOKENS.surface, border: `1px solid ${B_TOKENS.border}`, borderRadius: 10, padding: 14 }}>
            <div style={{ ...bMono, fontSize: 9, color: B_TOKENS.ink3, letterSpacing: '0.08em' }}>STEPS</div>
            <div style={{ ...bMono, fontSize: 22, fontWeight: 600, marginTop: 6 }}>8,420</div>
            <div style={{ marginTop: 6, height: 2, background: B_TOKENS.border, borderRadius: 1 }}><div style={{ height: '100%', width: '84%', background: '#A78BFA', borderRadius: 1 }} /></div>
          </div>
          <div style={{ background: B_TOKENS.surface, border: `1px solid ${B_TOKENS.border}`, borderRadius: 10, padding: 14 }}>
            <div style={{ ...bMono, fontSize: 9, color: B_TOKENS.ink3, letterSpacing: '0.08em' }}>SLEEP</div>
            <div style={{ ...bMono, fontSize: 22, fontWeight: 600, marginTop: 6 }}>7.5<span style={{ fontSize: 12, color: B_TOKENS.ink3 }}>h</span></div>
            <div style={{ marginTop: 6, height: 2, background: B_TOKENS.border, borderRadius: 1 }}><div style={{ height: '100%', width: '94%', background: B_TOKENS.good, borderRadius: 1 }} /></div>
          </div>
        </div>
      </div>

      <BBottomNav active="today" />
    </div>
  );
}

function BBottomNav({ active }) {
  const items = [
    ['today', 'Today', '◉'],
    ['log', 'Log', '◍'],
    ['workout', 'Train', '◎'],
    ['checkin', 'Check', '◑'],
    ['profile', 'You', '◐'],
  ];
  return (
    <div style={{ display: 'flex', borderTop: `1px solid ${B_TOKENS.border}`, background: B_TOKENS.surface, padding: '6px 8px 12px' }}>
      {items.map(([id, label, icon]) => (
        <a key={id} style={{
          flex: 1, padding: '8px 0', textAlign: 'center', cursor: 'pointer',
          color: active === id ? B_TOKENS.accent : B_TOKENS.ink3,
        }}>
          <div style={{ fontSize: 18 }}>{icon}</div>
          <div style={{ ...bMono, fontSize: 9, letterSpacing: '0.08em', marginTop: 2, textTransform: 'uppercase' }}>{label}</div>
        </a>
      ))}
    </div>
  );
}

// ============ CLIENT: WORKOUT ============
function BClientWorkout() {
  return (
    <div style={bBase}>
      <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${B_TOKENS.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ ...bMono, fontSize: 10, color: B_TOKENS.ink3, letterSpacing: '0.1em' }}>EX 01 / 05 · SET 02 / 04</div>
          <span style={{ ...bChip, background: B_TOKENS.surface, color: B_TOKENS.ink2, border: `1px solid ${B_TOKENS.border}` }}>14:23 ELAPSED</span>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 600, margin: '6px 0 0', letterSpacing: '-0.02em' }}>Back squat</h1>
        <div style={{ fontSize: 12, color: B_TOKENS.ink2, marginTop: 4 }}>Knees over toes · full depth · brace</div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
        {/* Big lifting card */}
        <div style={{ background: 'linear-gradient(180deg, #1A1F12, #111317)', border: `1px solid ${B_TOKENS.accent}33`, borderRadius: 16, padding: 20, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 80% 20%, ${B_TOKENS.accent}22, transparent 50%)` }} />
          <div style={{ position: 'relative' }}>
            <div style={{ ...bMono, fontSize: 10, color: B_TOKENS.accent, letterSpacing: '0.12em' }}>● LIFTING NOW</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 16 }}>
              {[['LOAD', '100', 'kg'], ['REPS', '10', ''], ['RPE', '8', '/10']].map(([k, v, u]) => (
                <div key={k}>
                  <div style={{ ...bMono, fontSize: 9, color: B_TOKENS.ink3, letterSpacing: '0.08em' }}>{k}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 6 }}>
                    <span style={{ ...bMono, fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em' }}>{v}</span>
                    {u && <span style={{ ...bMono, fontSize: 11, color: B_TOKENS.ink3 }}>{u}</span>}
                  </div>
                </div>
              ))}
            </div>
            <button style={{ marginTop: 18, width: '100%', background: B_TOKENS.accent, color: '#0A0B0D', border: 'none', padding: '14px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>✓ Log set</button>
          </div>
        </div>

        {/* Set log */}
        <div style={{ marginTop: 16, background: B_TOKENS.surface, border: `1px solid ${B_TOKENS.border}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${B_TOKENS.border}`, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ ...bMono, fontSize: 11, color: B_TOKENS.ink3, letterSpacing: '0.1em' }}>SET LOG</span>
            <span style={{ ...bMono, fontSize: 11, color: B_TOKENS.ink3 }}>4 × 8–12</span>
          </div>
          {[
            ['1', '100', '12', '7', 'done'],
            ['2', '100', '10', '8', 'now'],
            ['3', '—', '—', '—', 'next'],
            ['4', '—', '—', '—', 'next'],
          ].map(([n, w, r, rpe, st], i) => (
            <div key={n} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 1fr 80px', padding: '14px 16px', borderBottom: i < 3 ? `1px solid ${B_TOKENS.border}` : 'none', ...bMono, fontSize: 13, alignItems: 'center', background: st === 'now' ? `${B_TOKENS.accent}0a` : 'transparent' }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: st === 'next' ? B_TOKENS.ink3 : B_TOKENS.ink }}>#{n}</span>
              <span style={{ color: st === 'next' ? B_TOKENS.ink3 : B_TOKENS.ink }}>{w}{w !== '—' && ' kg'}</span>
              <span style={{ color: st === 'next' ? B_TOKENS.ink3 : B_TOKENS.ink }}>{r}{r !== '—' && ' rep'}</span>
              <span style={{ color: st === 'next' ? B_TOKENS.ink3 : B_TOKENS.ink }}>{rpe !== '—' ? `@${rpe}` : '—'}</span>
              <span style={{
                ...bChip, justifySelf: 'end',
                background: st === 'done' ? 'rgba(61,232,160,0.12)' : st === 'now' ? `${B_TOKENS.accent}22` : B_TOKENS.surface2,
                color: st === 'done' ? B_TOKENS.good : st === 'now' ? B_TOKENS.accent : B_TOKENS.ink3,
              }}>{st}</span>
            </div>
          ))}
        </div>

        {/* Rest timer */}
        <div style={{ marginTop: 16, background: B_TOKENS.surface, border: `1px solid ${B_TOKENS.border}`, borderRadius: 12, padding: 18, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ ...bMono, fontSize: 10, color: B_TOKENS.ink3, letterSpacing: '0.1em' }}>REST TIMER</div>
          <div style={{ ...bMono, fontSize: 56, fontWeight: 700, lineHeight: 1, margin: '8px 0', letterSpacing: '-0.04em', color: B_TOKENS.accent }}>1:42</div>
          <div style={{ ...bMono, fontSize: 10, color: B_TOKENS.ink3 }}>OF 2:00 · TARGET</div>
          <div style={{ marginTop: 12, height: 3, background: B_TOKENS.border, borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '15%', background: B_TOKENS.accent, borderRadius: 2 }} />
          </div>
        </div>

        {/* Up next */}
        <div style={{ marginTop: 16 }}>
          <div style={{ ...bMono, fontSize: 10, color: B_TOKENS.ink3, letterSpacing: '0.1em', marginBottom: 8 }}>UP NEXT</div>
          {[
            ['02', 'Romanian DL', '3 × 10–12 @7'],
            ['03', 'Overhead press', '4 × 8–12 @8'],
            ['04', 'Squat back-off', '3 × 10 @10'],
            ['05', 'RDL volume', '5 × 10 @8'],
          ].map(([n, name, m]) => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', background: B_TOKENS.surface, border: `1px solid ${B_TOKENS.border}`, borderRadius: 10, marginBottom: 6 }}>
              <span style={{ ...bMono, fontSize: 14, fontWeight: 700, color: B_TOKENS.ink3, width: 24 }}>{n}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{name}</div>
                <div style={{ ...bMono, fontSize: 11, color: B_TOKENS.ink3, marginTop: 2 }}>{m}</div>
              </div>
              <span style={{ color: B_TOKENS.ink3 }}>›</span>
            </div>
          ))}
        </div>
      </div>

      <BBottomNav active="workout" />
    </div>
  );
}

// ============ CLIENT: CHECK-IN ============
function BClientCheckin() {
  const sliders = [
    ['Energy', 7, B_TOKENS.accent],
    ['Stress', 4, B_TOKENS.warn],
    ['Motivation', 8, '#A78BFA'],
    ['Sleep quality', 6, B_TOKENS.good],
    ['Appetite', 7, '#FBBF24'],
  ];
  return (
    <div style={bBase}>
      <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${B_TOKENS.border}` }}>
        <div style={{ ...bMono, fontSize: 10, color: B_TOKENS.ink3, letterSpacing: '0.1em' }}>WEEK 18 · SUNDAY REVIEW</div>
        <h1 style={{ fontSize: 28, fontWeight: 600, margin: '6px 0 0', letterSpacing: '-0.02em' }}>Weekly check-in</h1>
        <div style={{ marginTop: 12, height: 3, background: B_TOKENS.border, borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: '40%', background: B_TOKENS.accent, borderRadius: 2 }} />
        </div>
        <div style={{ ...bMono, fontSize: 10, color: B_TOKENS.ink3, marginTop: 6, letterSpacing: '0.08em' }}>2 / 5 SECTIONS</div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
        <div style={{ background: B_TOKENS.surface, border: `1px solid ${B_TOKENS.border}`, borderRadius: 12, padding: 18 }}>
          <div style={{ ...bMono, fontSize: 10, color: B_TOKENS.ink3, letterSpacing: '0.1em', marginBottom: 14 }}>HOW DID YOU FEEL THIS WEEK?</div>
          {sliders.map(([label, val, color]) => (
            <div key={label} style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
                <span style={{ ...bMono, fontSize: 14, fontWeight: 600, color }}>{val}<span style={{ fontSize: 10, color: B_TOKENS.ink3 }}>/10</span></span>
              </div>
              <div style={{ display: 'flex', gap: 3 }}>
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} style={{ flex: 1, height: 8, borderRadius: 2, background: i < val ? color : B_TOKENS.border }} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 14, background: B_TOKENS.surface, border: `1px solid ${B_TOKENS.border}`, borderRadius: 12, padding: 18 }}>
          <div style={{ ...bMono, fontSize: 10, color: B_TOKENS.ink3, letterSpacing: '0.1em', marginBottom: 12 }}>DIET ADHERENCE</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 12 }}>
            <span style={{ ...bMono, fontSize: 36, fontWeight: 700 }}>86</span>
            <span style={{ ...bMono, fontSize: 14, color: B_TOKENS.ink3 }}>%</span>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {['<60', '60', '70', '80', '90', '100'].map((v, i) => (
              <button key={v} style={{
                flex: 1, padding: '8px 0', borderRadius: 6,
                background: i === 3 ? B_TOKENS.accent : B_TOKENS.surface2,
                color: i === 3 ? '#0A0B0D' : B_TOKENS.ink2,
                border: 'none', ...bMono, fontSize: 11, fontWeight: 600, cursor: 'pointer'
              }}>{v}%</button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 14, background: B_TOKENS.surface, border: `1px solid ${B_TOKENS.border}`, borderRadius: 12, padding: 18 }}>
          <div style={{ ...bMono, fontSize: 10, color: B_TOKENS.ink3, letterSpacing: '0.1em', marginBottom: 10 }}>WHAT WENT WELL?</div>
          <div style={{ background: B_TOKENS.bg, border: `1px solid ${B_TOKENS.border2}`, borderRadius: 8, padding: 14, fontSize: 13, color: B_TOKENS.ink2, minHeight: 80, lineHeight: 1.5 }}>
            Hit every workout this week, slept 7+ on five nights, prepped meals on Sunday so weekday lunches were easy…
          </div>
        </div>

        <div style={{ marginTop: 14, background: B_TOKENS.surface, border: `1px solid ${B_TOKENS.border}`, borderRadius: 12, padding: 18 }}>
          <div style={{ ...bMono, fontSize: 10, color: B_TOKENS.ink3, letterSpacing: '0.1em', marginBottom: 10 }}>CHALLENGES</div>
          <div style={{ background: B_TOKENS.bg, border: `1px solid ${B_TOKENS.border2}`, borderRadius: 8, padding: 14, fontSize: 13, color: B_TOKENS.ink3, minHeight: 60 }}>
            Optional…
          </div>
        </div>

        <button style={{ marginTop: 18, marginBottom: 10, width: '100%', background: B_TOKENS.accent, color: '#0A0B0D', border: 'none', padding: '16px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Send check-in →</button>
      </div>

      <BBottomNav active="checkin" />
    </div>
  );
}

Object.assign(window, { BCoachClients, BCoachClientDetail, BClientToday, BClientWorkout, BClientCheckin });
