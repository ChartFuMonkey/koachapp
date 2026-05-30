// Direction B — additional screens. Depends on B_TOKENS / BSidebar / BTopBar / BBottomNav from components-b.jsx
const bT = B_TOKENS;
const bBase2 = { fontFamily: bT.sans, background: bT.bg, color: bT.ink, width: '100%', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' };
const bMono2 = { fontFamily: bT.mono, fontFeatureSettings: '"tnum"' };
const bChip2 = { fontFamily: bT.mono, fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '3px 7px', borderRadius: 3 };
const bLabel = { fontFamily: bT.mono, fontSize: 10, color: bT.ink3, letterSpacing: '0.08em', textTransform: 'uppercase' };

// ============ B: COACH EXERCISES ============
function BCoachExercises() {
  const ex = [
    ['Back squat', 'Legs', 'Compound', 'Barbell', 142],
    ['Romanian deadlift', 'Legs', 'Compound', 'Barbell', 98],
    ['Overhead press', 'Shoulders', 'Compound', 'Barbell', 76],
    ['Bench press', 'Chest', 'Compound', 'Barbell', 134],
    ['Pull-up', 'Back', 'Compound', 'BW', 88],
    ['Bulgarian split', 'Legs', 'Unilateral', 'DB', 54],
    ['Lat pulldown', 'Back', 'Compound', 'Cable', 71],
    ['Leg curl', 'Legs', 'Isolation', 'Machine', 62],
    ['Lateral raise', 'Shoulders', 'Isolation', 'DB', 58],
    ['Face pull', 'Shoulders', 'Isolation', 'Cable', 41],
    ['Cable row', 'Back', 'Compound', 'Cable', 67],
    ['Calf raise', 'Legs', 'Isolation', 'Machine', 33],
  ];
  return (
    <div style={bBase2}>
      <BSidebar active="exercises" />
      <div style={{ marginLeft: 240, flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <BTopBar />
        <div style={{ padding: '32px 40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ ...bLabel }}>~/EXERCISES — 142 ENTRIES</div>
              <h1 style={{ fontSize: 36, fontWeight: 600, margin: '8px 0 0', letterSpacing: '-0.02em' }}>Exercises</h1>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ background: bT.surface, color: bT.ink, border: `1px solid ${bT.border}`, padding: '8px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer', ...bMono2 }}>Import CSV</button>
              <button style={{ background: bT.accent, color: bT.bg, border: 'none', padding: '8px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ New exercise</button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, marginTop: 24, alignItems: 'center' }}>
            {['All', 'Legs', 'Back', 'Chest', 'Shoulders', 'Arms', 'Core'].map((f, i) => (
              <button key={f} style={{ ...bChip2, background: i === 0 ? bT.ink : bT.surface, color: i === 0 ? bT.bg : bT.ink2, border: `1px solid ${i === 0 ? bT.ink : bT.border}`, cursor: 'pointer' }}>{f}</button>
            ))}
            <input placeholder="search…" style={{ marginLeft: 'auto', width: 220, padding: '6px 10px', background: bT.surface, border: `1px solid ${bT.border}`, borderRadius: 6, color: bT.ink, fontSize: 12, ...bMono2 }} />
          </div>

          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {ex.map((e, i) => (
              <div key={i} style={{ background: bT.surface, border: `1px solid ${bT.border}`, borderRadius: 8, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ ...bLabel, fontSize: 9 }}>{String(i + 1).padStart(3, '0')} · {e[3]}</div>
                    <div style={{ fontSize: 16, fontWeight: 600, marginTop: 6 }}>{e[0]}</div>
                  </div>
                  <span style={{ ...bChip2, background: bT.surface2, color: bT.ink2, border: `1px solid ${bT.border2}` }}>{e[1]}</span>
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 14, alignItems: 'baseline' }}>
                  <div>
                    <div style={{ ...bLabel, fontSize: 9 }}>USED</div>
                    <div style={{ ...bMono2, fontSize: 18, fontWeight: 600 }}>{e[4]}×</div>
                  </div>
                  <div style={{ flex: 1, height: 20, display: 'flex', alignItems: 'flex-end', gap: 2 }}>
                    {Array.from({ length: 12 }).map((_, j) => (
                      <div key={j} style={{ flex: 1, height: `${20 + Math.sin(i * 1.3 + j) * 50 + 50}%`, background: j > 8 ? bT.accent : bT.border2, borderRadius: 1 }} />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ B: COACH FOODS ============
function BCoachFoods() {
  const foods = [
    ['Avocado', 'Fats', 160, 2, 9, 15],
    ['Almonds', 'Fats', 579, 21, 22, 49],
    ['Banana', 'Fruit', 89, 1.1, 23, 0.3],
    ['Sweet potato', 'Veg', 86, 1.6, 20, 0.1],
    ['White fish', 'Protein', 90, 18, 0, 1.3],
    ['Egg whites', 'Protein', 52, 11, 0.7, 0.2],
    ['Blueberries', 'Fruit', 57, 0.7, 14, 0.3],
    ['Broccoli', 'Veg', 34, 2.8, 7, 0.4],
    ['Edamame', 'Legume', 121, 11.9, 8.6, 5.2],
    ['Beef steak', 'Protein', 271, 26, 0, 18],
    ['Greek yogurt 0%', 'Dairy', 59, 10, 3.6, 0.4],
    ['Apple', 'Fruit', 52, 0.3, 14, 0.2],
    ['Salmon', 'Protein', 208, 20, 0, 13],
    ['Quinoa', 'Grain', 120, 4.4, 21, 1.9],
    ['Olive oil', 'Fats', 884, 0, 0, 100],
  ];
  const catColor = { Fats: bT.warn, Protein: bT.accent, Fruit: '#9BC53D', Veg: bT.good, Dairy: '#8BD3FF', Legume: '#A688FA', Grain: '#FFB84D' };
  return (
    <div style={bBase2}>
      <BSidebar active="foods" />
      <div style={{ marginLeft: 240, flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <BTopBar />
        <div style={{ padding: '32px 40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={bLabel}>~/FOODS — 142 ENTRIES</div>
              <h1 style={{ fontSize: 36, fontWeight: 600, margin: '8px 0 0', letterSpacing: '-0.02em' }}>Foods</h1>
            </div>
            <button style={{ background: bT.accent, color: bT.bg, border: 'none', padding: '8px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Add food</button>
          </div>

          <input placeholder="Search foods…" style={{ marginTop: 24, width: '100%', padding: '12px 14px', background: bT.surface, border: `1px solid ${bT.border}`, borderRadius: 6, color: bT.ink, fontSize: 13, boxSizing: 'border-box', ...bMono2 }} />

          <div style={{ marginTop: 16, background: bT.surface, border: `1px solid ${bT.border}`, borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.7fr 0.6fr 0.6fr 0.6fr 0.7fr', padding: '12px 20px', borderBottom: `1px solid ${bT.border}`, ...bLabel }}>
              <span>NAME</span><span>CATEGORY</span><span>KCAL/100g</span><span>P</span><span>C</span><span>F</span><span></span>
            </div>
            {foods.map((f, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.7fr 0.6fr 0.6fr 0.6fr 0.7fr', padding: '12px 20px', borderBottom: i < foods.length - 1 ? `1px solid ${bT.border}` : 'none', alignItems: 'center', fontSize: 13 }}>
                <span style={{ fontWeight: 500 }}>{f[0]}</span>
                <span style={{ ...bChip2, background: bT.surface2, border: `1px solid ${bT.border2}`, color: catColor[f[1]] || bT.ink2, justifySelf: 'start' }}>{f[1]}</span>
                <span style={{ ...bMono2, fontSize: 12 }}>{f[2]}</span>
                <span style={{ ...bMono2, fontSize: 12, color: bT.accent }}>{f[3]}</span>
                <span style={{ ...bMono2, fontSize: 12, color: '#FFB84D' }}>{f[4]}</span>
                <span style={{ ...bMono2, fontSize: 12, color: bT.warn }}>{f[5]}</span>
                <span style={{ textAlign: 'right', ...bMono2, fontSize: 11, color: bT.ink3 }}>EDIT · DEL</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ B: COACH MEALS ============
function BCoachMeals() {
  const meals = [
    ['Power Oats', 'BREAKFAST', 480, 32, 65, 12, 4],
    ['Chicken Bowl', 'LUNCH', 720, 55, 80, 18, 5],
    ['Yogurt + Berries', 'SNACK', 220, 18, 22, 5, 3],
    ['Salmon Plate', 'DINNER', 540, 42, 48, 20, 4],
    ['Pre-workout shake', 'PRE', 180, 25, 12, 2, 2],
    ['Post-workout', 'POST', 380, 35, 45, 6, 3],
  ];
  return (
    <div style={bBase2}>
      <BSidebar active="meals" />
      <div style={{ marginLeft: 240, flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <BTopBar />
        <div style={{ padding: '32px 40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={bLabel}>~/MEALS — 18 TEMPLATES</div>
              <h1 style={{ fontSize: 36, fontWeight: 600, margin: '8px 0 0', letterSpacing: '-0.02em' }}>Meals</h1>
            </div>
            <button style={{ background: bT.accent, color: bT.bg, border: 'none', padding: '8px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ New meal</button>
          </div>

          <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {meals.map((m, i) => {
              const total = m[3] * 4 + m[4] * 4 + m[5] * 9;
              const pP = (m[3] * 4) / total, cP = (m[4] * 4) / total, fP = (m[5] * 9) / total;
              return (
                <div key={i} style={{ background: bT.surface, border: `1px solid ${bT.border}`, borderRadius: 8, padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ ...bChip2, background: bT.surface2, border: `1px solid ${bT.border2}`, color: bT.ink2 }}>{m[1]}</span>
                      <div style={{ fontSize: 22, fontWeight: 600, marginTop: 10, letterSpacing: '-0.01em' }}>{m[0]}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ ...bMono2, fontSize: 24, fontWeight: 600 }}>{m[2]}</div>
                      <div style={{ ...bLabel, fontSize: 9 }}>KCAL</div>
                    </div>
                  </div>

                  <div style={{ marginTop: 16, height: 6, borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
                    <div style={{ width: `${pP * 100}%`, background: bT.accent }} />
                    <div style={{ width: `${cP * 100}%`, background: '#FFB84D' }} />
                    <div style={{ width: `${fP * 100}%`, background: bT.warn }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, ...bMono2, fontSize: 11 }}>
                    <span style={{ color: bT.accent }}>P {m[3]}g</span>
                    <span style={{ color: '#FFB84D' }}>C {m[4]}g</span>
                    <span style={{ color: bT.warn }}>F {m[5]}g</span>
                    <span style={{ color: bT.ink3 }}>{m[6]} foods</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ B: COACH PROGRAM BUILDER ============
function BCoachProgramBuilder() {
  const days = [
    { name: 'PUSH', code: 'A', ex: [['Bench press', '4×6–10', '8'], ['Overhead press', '4×8–12', '8'], ['Lateral raise', '4×12–15', '9'], ['Dip', '3×8', '8']] },
    { name: 'PULL', code: 'B', ex: [['Pull-up', '4×max', '9'], ['Cable row', '3×10–12', '7'], ['Face pull', '3×15', '9'], ['Curl', '3×12', '8']] },
    { name: 'LEGS', code: 'C', ex: [['Back squat', '4×8–12', '8'], ['Romanian DL', '3×10', '7'], ['Bulgarian split', '3×10', '8'], ['Leg curl', '3×12–15', '9'], ['Calf raise', '4×12', '9']] },
  ];
  return (
    <div style={bBase2}>
      <BSidebar active="programs" />
      <div style={{ marginLeft: 240, flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <BTopBar />
        <div style={{ padding: '24px 40px 16px', borderBottom: `1px solid ${bT.border}` }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <div style={bLabel}>MARKO HORVAT · PROGRAM</div>
              <h1 style={{ fontSize: 32, fontWeight: 600, margin: '8px 0 0', letterSpacing: '-0.02em' }}>Push / Pull / Legs</h1>
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <span style={{ ...bChip2, background: bT.surface2, color: bT.ink2, border: `1px solid ${bT.border2}` }}>3D/WEEK</span>
                <span style={{ ...bChip2, background: bT.surface2, color: bT.ink2, border: `1px solid ${bT.border2}` }}>WEEK 3/8</span>
                <span style={{ ...bChip2, background: bT.accent, color: bT.bg }}>HYPERTROPHY</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ background: bT.surface, color: bT.ink, border: `1px solid ${bT.border}`, padding: '8px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>Duplicate</button>
              <button style={{ background: bT.accent, color: bT.bg, border: 'none', padding: '8px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Save</button>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', flex: 1 }}>
          <div style={{ padding: '24px 40px' }}>
            {days.map((d, di) => (
              <div key={di} style={{ marginBottom: 20, background: bT.surface, border: `1px solid ${bT.border}`, borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: `1px solid ${bT.border}` }}>
                  <span style={{ width: 28, height: 28, borderRadius: 6, background: bT.accent, color: bT.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>{d.code}</span>
                  <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: '0.05em' }}>{d.name}</span>
                  <span style={{ marginLeft: 'auto', ...bMono2, fontSize: 11, color: bT.ink3 }}>{d.ex.length} EXERCISES · ~52 MIN</span>
                </div>
                {d.ex.map((e, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '32px 2fr 1fr 0.7fr 0.4fr', padding: '12px 20px', borderBottom: i < d.ex.length - 1 ? `1px solid ${bT.border}` : 'none', alignItems: 'center' }}>
                    <span style={{ ...bMono2, fontSize: 11, color: bT.ink3 }}>{i + 1}.</span>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{e[0]}</span>
                    <span style={{ ...bMono2, fontSize: 12, color: bT.ink2 }}>{e[1]}</span>
                    <span style={{ ...bChip2, background: bT.surface2, color: bT.accent, justifySelf: 'start' }}>RPE {e[2]}</span>
                    <span style={{ textAlign: 'right', color: bT.ink3 }}>⋮</span>
                  </div>
                ))}
                <button style={{ width: '100%', padding: '12px', background: 'transparent', color: bT.ink3, border: 'none', borderTop: `1px dashed ${bT.border}`, fontSize: 12, cursor: 'pointer', ...bMono2 }}>+ ADD EXERCISE</button>
              </div>
            ))}
          </div>

          <div style={{ background: bT.surface, borderLeft: `1px solid ${bT.border}`, padding: 24 }}>
            <div style={bLabel}>SCHEDULE</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginTop: 10 }}>
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => {
                const codes = ['A', '', 'B', '', 'C', '', ''];
                const active = !!codes[i];
                return (
                  <div key={i} style={{ aspectRatio: 1, borderRadius: 6, background: active ? bT.accent : bT.surface2, color: active ? bT.bg : bT.ink3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: `1px solid ${active ? bT.accent : bT.border}` }}>
                    <span style={{ fontSize: 10, ...bMono2 }}>{d}</span>
                    {active && <span style={{ fontSize: 13, fontWeight: 700 }}>{codes[i]}</span>}
                  </div>
                );
              })}
            </div>

            <div style={{ ...bLabel, marginTop: 28, marginBottom: 12 }}>VOLUME / GROUP</div>
            {[['Legs', 18, 0.9], ['Back', 12, 0.6], ['Chest', 10, 0.5], ['Shoulders', 14, 0.7], ['Arms', 6, 0.3]].map(([g, sets, p]) => (
              <div key={g} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: bT.ink2 }}>{g}</span>
                  <span style={{ ...bMono2, color: bT.ink }}>{sets} sets</span>
                </div>
                <div style={{ height: 4, background: bT.border, borderRadius: 2 }}><div style={{ height: '100%', background: bT.accent, width: `${p * 100}%`, borderRadius: 2 }} /></div>
              </div>
            ))}

            <div style={{ ...bLabel, marginTop: 28, marginBottom: 8 }}>COACH NOTE</div>
            <div style={{ background: bT.surface2, border: `1px solid ${bT.border}`, padding: 12, borderRadius: 6, fontSize: 12, color: bT.ink2, lineHeight: 1.5 }}>
              Focus on bar speed and full ROM. Add 4th day in W5 if recovery allows.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ B: COACH PHASE MANAGER ============
function BCoachPhaseManager() {
  const phases = [
    { name: 'Cut', code: 'CUT', range: 'W1–W8', date: 'Mar — May', state: 'ACTIVE', kcal: '−400', color: bT.accent },
    { name: 'Maintain', code: 'MAINT', range: 'W9–W10', date: 'May 19', state: 'NEXT', kcal: '0', color: bT.ink2 },
    { name: 'Recomp', code: 'RECOMP', range: 'W11–W18', date: 'Jun — Jul', state: 'PLANNED', kcal: '+50', color: bT.ink3 },
    { name: 'Bulk', code: 'BULK', range: 'W19+', date: 'Aug', state: 'PLANNED', kcal: '+300', color: bT.ink3 },
  ];
  return (
    <div style={bBase2}>
      <BSidebar active="clients" />
      <div style={{ marginLeft: 240, flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <BTopBar />
        <div style={{ padding: '32px 40px' }}>
          <div style={bLabel}>MARKO HORVAT · PHASE MANAGER</div>
          <h1 style={{ fontSize: 36, fontWeight: 600, margin: '8px 0 0', letterSpacing: '-0.02em' }}>Phases</h1>

          <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {phases.map((p, i) => (
              <div key={i} style={{ background: bT.surface, border: `1px solid ${i === 0 ? bT.accent : bT.border}`, borderRadius: 8, padding: 20, position: 'relative' }}>
                {i === 0 && <div style={{ position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: '50%', background: bT.accent, boxShadow: `0 0 10px ${bT.accent}` }} />}
                <span style={{ ...bChip2, background: i === 0 ? bT.accent : bT.surface2, color: i === 0 ? bT.bg : bT.ink2, border: i === 0 ? 'none' : `1px solid ${bT.border2}` }}>{p.state}</span>
                <div style={{ fontSize: 26, fontWeight: 600, marginTop: 14, letterSpacing: '-0.01em' }}>{p.name}</div>
                <div style={{ ...bMono2, fontSize: 11, color: bT.ink3, marginTop: 4 }}>{p.range} · {p.date}</div>
                <div style={{ marginTop: 18, padding: '12px 0', borderTop: `1px solid ${bT.border}`, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ ...bLabel, fontSize: 9 }}>KCAL Δ</span>
                  <span style={{ ...bMono2, fontSize: 16, fontWeight: 600, color: i === 0 ? bT.accent : bT.ink }}>{p.kcal}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 32, background: bT.surface, border: `1px solid ${bT.border}`, borderRadius: 8 }}>
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${bT.border}`, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Active phase — Cut</span>
              <span style={{ ...bChip2, background: bT.accent, color: bT.bg }}>WEEK 3 / 8</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0 }}>
              {[
                ['Calorie target', '2,400 kcal', '−400 from maint.'],
                ['Protein target', '180g', '2.2 g/kg'],
                ['Step target', '10,000', 'per day'],
                ['Cardio', '2 × 30min', 'zone 2'],
                ['Lift volume', '−15%', 'vs. baseline'],
                ['Weigh-ins', 'Daily', 'fasted, AM'],
              ].map(([k, v, sub], i) => (
                <div key={k} style={{ padding: '20px 24px', borderBottom: i < 3 ? `1px solid ${bT.border}` : 'none', borderRight: (i % 3) < 2 ? `1px solid ${bT.border}` : 'none' }}>
                  <div style={bLabel}>{k}</div>
                  <div style={{ ...bMono2, fontSize: 22, fontWeight: 600, marginTop: 8 }}>{v}</div>
                  <div style={{ fontSize: 11, color: bT.ink3, marginTop: 4 }}>{sub}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 24, display: 'flex', gap: 8 }}>
            <button style={{ background: bT.surface, border: `1px solid ${bT.border}`, color: bT.ink, padding: '10px 16px', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>Edit phase</button>
            <button style={{ background: bT.accent, color: bT.bg, border: 'none', padding: '10px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Add phase</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ B: COACH MEAL PLAN ============
function BCoachMealPlan() {
  const meals = [
    { name: 'Breakfast', tag: 'AM', kcal: 480, items: [['Oats', '80g', 304], ['Whey protein', '30g', 110], ['Banana', '120g', 107]] },
    { name: 'Lunch', tag: '13:00', kcal: 720, items: [['Chicken breast', '200g', 330], ['Basmati rice', '100g', 130], ['Broccoli', '150g', 51], ['Olive oil', '15g', 132]] },
    { name: 'Snack', tag: '16:00', kcal: 220, items: [['Greek yogurt', '200g', 118], ['Blueberries', '100g', 57], ['Almonds', '15g', 87]] },
    { name: 'Dinner', tag: '20:00', kcal: 540, items: [['Salmon', '180g', 374], ['Sweet potato', '200g', 172], ['Cucumber', '100g', 15]] },
  ];
  return (
    <div style={bBase2}>
      <BSidebar active="clients" />
      <div style={{ marginLeft: 240, flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <BTopBar />
        <div style={{ padding: '32px 40px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <div style={bLabel}>MARKO HORVAT · MEAL PLAN</div>
              <h1 style={{ fontSize: 36, fontWeight: 600, margin: '8px 0 0', letterSpacing: '-0.02em' }}>Daily plan</h1>
            </div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'baseline' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={bLabel}>TOTAL</div>
                <div style={{ ...bMono2, fontSize: 24, fontWeight: 600, marginTop: 4 }}>2,400 <span style={{ fontSize: 12, color: bT.ink3 }}>kcal</span></div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[['P', 180, bT.accent], ['C', 240, '#FFB84D'], ['F', 70, bT.warn]].map(([k, v, c]) => (
                  <div key={k} style={{ textAlign: 'center', padding: '8px 14px', background: bT.surface, border: `1px solid ${bT.border}`, borderRadius: 6 }}>
                    <div style={{ ...bMono2, fontSize: 16, fontWeight: 600, color: c }}>{v}g</div>
                    <div style={{ ...bLabel, fontSize: 9 }}>{k}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {meals.map((m, i) => (
              <div key={i} style={{ background: bT.surface, border: `1px solid ${bT.border}`, borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: `1px solid ${bT.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ ...bChip2, background: bT.surface2, border: `1px solid ${bT.border2}`, color: bT.ink2 }}>{m.tag}</span>
                    <span style={{ fontSize: 16, fontWeight: 600 }}>{m.name}</span>
                  </div>
                  <span style={{ ...bMono2, fontSize: 13, color: bT.ink2 }}>{m.kcal} kcal</span>
                </div>
                {m.items.map((it, j) => (
                  <div key={j} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', padding: '10px 20px', borderBottom: j < m.items.length - 1 ? `1px solid ${bT.border}` : 'none', alignItems: 'center', fontSize: 12 }}>
                    <span>{it[0]}</span>
                    <span style={{ ...bMono2, color: bT.ink2 }}>{it[1]}</span>
                    <span style={{ ...bMono2, textAlign: 'right' }}>{it[2]}</span>
                  </div>
                ))}
                <button style={{ width: '100%', padding: '10px', background: 'transparent', color: bT.ink3, border: 'none', borderTop: `1px dashed ${bT.border}`, fontSize: 11, cursor: 'pointer', ...bMono2 }}>+ ADD FOOD</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ B: CLIENT LOGIN ============
function BClientLogin() {
  return (
    <div style={{ ...bBase2, alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 30%, rgba(197,247,59,0.12), transparent 60%)', pointerEvents: 'none' }} />
      <div style={{ textAlign: 'center', maxWidth: 320, position: 'relative' }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: bT.accent, color: bT.bg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 32, marginBottom: 32, boxShadow: `0 8px 30px ${bT.accent}55` }}>K</div>
        <div style={bLabel}>WELCOME TO</div>
        <h1 style={{ fontSize: 56, fontWeight: 700, margin: '8px 0 0', letterSpacing: '-0.04em' }}>koach</h1>
        <div style={{ ...bMono2, fontSize: 11, color: bT.ink3, marginTop: 6, letterSpacing: '0.1em' }}>v2.4 — ATHLETIC OS</div>

        <p style={{ fontSize: 16, color: bT.ink2, marginTop: 32, lineHeight: 1.5 }}>
          Train, log, eat — synced with your coach.
        </p>

        <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button style={{ background: bT.accent, color: bT.bg, border: 'none', padding: '16px', fontSize: 14, fontWeight: 700, cursor: 'pointer', borderRadius: 8, letterSpacing: '0.02em' }}>SIGN IN AS CLIENT →</button>
          <button style={{ background: bT.surface, color: bT.ink, border: `1px solid ${bT.border2}`, padding: '16px', fontSize: 14, fontWeight: 500, cursor: 'pointer', borderRadius: 8 }}>Sign in as coach</button>
        </div>

        <div style={{ marginTop: 32, display: 'flex', gap: 6, justifyContent: 'center' }}>
          <button style={{ ...bChip2, background: bT.surface2, color: bT.ink3, border: `1px solid ${bT.border}`, cursor: 'pointer' }}>HR</button>
          <button style={{ ...bChip2, background: bT.accent, color: bT.bg, border: 'none', cursor: 'pointer' }}>EN</button>
        </div>
      </div>
    </div>
  );
}

// ============ B: CLIENT LOG STATS ============
function BClientLog() {
  const stats = [
    ['Body weight', '82.4', 'kg', bT.accent],
    ['Calories', '1,920', 'kcal', '#FFB84D'],
    ['Protein', '142', 'g', bT.accent],
    ['Carbs', '188', 'g', '#FFB84D'],
    ['Fat', '54', 'g', bT.warn],
    ['Steps', '8,420', '', '#8BD3FF'],
    ['Sleep', '7.5', 'h', '#A688FA'],
  ];
  return (
    <div style={bBase2}>
      <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${bT.border}` }}>
        <div style={bLabel}>THU · 7 MAY · DAY 18 OF CUT</div>
        <h1 style={{ fontSize: 28, fontWeight: 600, margin: '6px 0 0', letterSpacing: '-0.02em' }}>Log today</h1>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
        {stats.map(([l, v, u, c]) => (
          <div key={l} style={{ background: bT.surface, border: `1px solid ${bT.border}`, borderRadius: 10, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 500 }}>{l}</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ ...bMono2, fontSize: 22, fontWeight: 600, color: c }}>{v}</span>
              {u && <span style={{ ...bMono2, fontSize: 11, color: bT.ink3 }}>{u}</span>}
              <span style={{ marginLeft: 10, color: bT.ink3 }}>›</span>
            </div>
          </div>
        ))}
        <div style={{ background: bT.surface, border: `1px solid ${bT.border}`, borderRadius: 10, padding: 16, marginTop: 8 }}>
          <div style={{ ...bLabel, marginBottom: 8 }}>NOTE FOR COACH</div>
          <div style={{ background: bT.surface2, border: `1px solid ${bT.border}`, borderRadius: 6, padding: 12, fontSize: 12, color: bT.ink3, minHeight: 50 }}>Optional…</div>
        </div>
        <button style={{ marginTop: 16, width: '100%', background: bT.accent, color: bT.bg, border: 'none', padding: '14px', fontSize: 14, fontWeight: 700, cursor: 'pointer', borderRadius: 10 }}>SAVE LOG →</button>
      </div>
      <BBottomNav active="log" />
    </div>
  );
}

// ============ B: CLIENT PHOTOS ============
function BClientPhotos() {
  const sessions = [
    ['7 MAY', '82.4 kg', 'WEEK 18', '—'],
    ['30 APR', '83.0 kg', 'WEEK 17', '−0.6'],
    ['23 APR', '83.4 kg', 'WEEK 16', '−0.4'],
    ['16 APR', '84.0 kg', 'WEEK 15', '−0.6'],
  ];
  return (
    <div style={bBase2}>
      <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${bT.border}` }}>
        <div style={bLabel}>PROGRESS · 8 SESSIONS</div>
        <h1 style={{ fontSize: 28, fontWeight: 600, margin: '6px 0 0', letterSpacing: '-0.02em' }}>Photos</h1>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
        <button style={{ width: '100%', padding: '16px', background: bT.surface, border: `1px dashed ${bT.border2}`, fontSize: 13, color: bT.ink2, cursor: 'pointer', borderRadius: 10, marginBottom: 16, ...bMono2 }}>+ ADD TODAY'S PHOTOS</button>

        {sessions.map((s, i) => (
          <div key={i} style={{ marginBottom: 16, background: bT.surface, border: `1px solid ${bT.border}`, borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${bT.border}` }}>
              <div>
                <div style={bLabel}>{s[2]}</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{s[0]}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ ...bMono2, fontSize: 13, fontWeight: 600 }}>{s[1]}</div>
                <div style={{ ...bMono2, fontSize: 10, color: s[3].startsWith('−') ? bT.good : bT.ink3 }}>{s[3]}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: bT.border }}>
              {['FRONT', 'SIDE', 'BACK'].map(p => (
                <div key={p} style={{ aspectRatio: '3/4', background: `linear-gradient(135deg, ${bT.surface2}, ${bT.bg})`, position: 'relative' }}>
                  <span style={{ position: 'absolute', bottom: 6, left: 8, ...bLabel, fontSize: 9 }}>{p}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <BBottomNav active="photos" />
    </div>
  );
}

// ============ B: CLIENT PROFILE ============
function BClientProfile() {
  return (
    <div style={bBase2}>
      <div style={{ padding: '24px 20px 20px', borderBottom: `1px solid ${bT.border}`, textAlign: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 0%, rgba(197,247,59,0.08), transparent 70%)' }} />
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #C5F73B, #3DE8A0)', color: bT.bg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, position: 'relative' }}>MH</div>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: '12px 0 0', letterSpacing: '-0.01em', position: 'relative' }}>Marko Horvat</h1>
        <div style={{ ...bMono2, fontSize: 11, color: bT.ink3, marginTop: 4, position: 'relative' }}>WITH COACH IGOR · SINCE MAR 2026</div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {[['STREAK', '9d', bT.accent], ['WORKOUTS', '24', bT.ink], ['LOGS', '32', bT.ink]].map(([k, v, c]) => (
            <div key={k} style={{ background: bT.surface, border: `1px solid ${bT.border}`, borderRadius: 10, padding: '14px 12px', textAlign: 'center' }}>
              <div style={{ ...bLabel, fontSize: 9 }}>{k}</div>
              <div style={{ ...bMono2, fontSize: 22, fontWeight: 600, color: c, marginTop: 4 }}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{ ...bLabel, marginTop: 24, marginBottom: 8 }}>ACCOUNT</div>
        <div style={{ background: bT.surface, border: `1px solid ${bT.border}`, borderRadius: 10, overflow: 'hidden' }}>
          {['Targets & macros', 'Notifications', 'Connected devices', 'Language', 'Privacy', 'Help'].map((it, i, a) => (
            <a key={it} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: i < a.length - 1 ? `1px solid ${bT.border}` : 'none', cursor: 'pointer' }}>
              <span style={{ fontSize: 14 }}>{it}</span>
              <span style={{ color: bT.ink3 }}>›</span>
            </a>
          ))}
        </div>

        <button style={{ marginTop: 24, width: '100%', background: bT.surface, color: bT.danger, border: `1px solid ${bT.border}`, padding: '14px', fontSize: 13, cursor: 'pointer', borderRadius: 10 }}>Log out</button>
      </div>
      <BBottomNav active="profile" />
    </div>
  );
}

Object.assign(window, { BCoachExercises, BCoachFoods, BCoachMeals, BCoachProgramBuilder, BCoachPhaseManager, BCoachMealPlan, BClientLogin, BClientLog, BClientPhotos, BClientProfile });
