function AnalysisScreen({ state, onNavigate }) {
  const days = window.TrackedApp.last7Days();
  const byDay = days.map((iso) => {
    const meals = state.meals.filter((m) => m.dateISO === iso);
    const totals = window.sumMeals(meals);
    return { iso, meals, totals };
  });

  const weekTotals = byDay.reduce((acc, d) => {
    acc.calories += d.totals.calories; acc.protein += d.totals.protein; acc.carbs += d.totals.carbs; acc.fat += d.totals.fat;
    acc.days += d.meals.length > 0 ? 1 : 0;
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0, days: 0 });
  const activeDays = Math.max(1, weekTotals.days);

  const maxCal = Math.max(state.goals.calories, ...byDay.map((d) => d.totals.calories), 1);

  const today = window.TrackedApp.todayISO();
  const allMealsDesc = state.meals.slice().sort((a, b) => b.ts - a.ts);

  function dateHeading(iso) {
    if (iso === today) return 'Today';
    const y = new Date(); y.setDate(y.getDate() - 1);
    const yIso = y.getFullYear() + '-' + String(y.getMonth() + 1).padStart(2, '0') + '-' + String(y.getDate()).padStart(2, '0');
    if (iso === yIso) return 'Yesterday';
    return window.TrackedApp.dayLabel(iso);
  }

  const grouped = [];
  allMealsDesc.forEach((m) => {
    let g = grouped.find((x) => x.iso === m.dateISO);
    if (!g) { g = { iso: m.dateISO, meals: [] }; grouped.push(g); }
    g.meals.push(m);
  });

  return (
    <Frame active="analysis" onNavigate={onNavigate} showNav>
      <div style={{ padding: '16px 20px 0 20px' }}>
        <div style={{ fontSize: 24, lineHeight: '36px', fontWeight: 700, color: 'var(--text-primary)' }}>Analysis</div>

        <div style={{ marginTop: 20, background: 'var(--gray-500)', borderRadius: 'var(--radius-xl)', padding: 20 }}>
          <div style={{ fontSize: 15, lineHeight: '22px', color: 'var(--text-secondary)', marginBottom: 16 }}>Calories, last 7 days</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 140 }}>
            {byDay.map((d) => {
              const h = Math.max(4, (d.totals.calories / maxCal) * 140);
              const overGoal = d.totals.calories > state.goals.calories;
              return (
                <div key={d.iso} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: '100%', height: 140, display: 'flex', alignItems: 'flex-end' }}>
                    <div style={{ width: '100%', height: h, borderRadius: 6, background: overGoal ? 'var(--message-error)' : 'var(--primary-100)' }} />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{window.TrackedApp.dayLabel(d.iso)}</div>
                </div>
              );
            })}
          </div>
        </div>

        <SectionTitle>Daily Average</SectionTitle>
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          <MacroCard label="Protein" value={Math.round(weekTotals.protein / activeDays)} unit="g" color={window.macroColors.protein} />
          <MacroCard label="Carbs" value={Math.round(weekTotals.carbs / activeDays)} unit="g" color={window.macroColors.carbs} />
          <MacroCard label="Fat" value={Math.round(weekTotals.fat / activeDays)} unit="g" color={window.macroColors.fat} />
        </div>

        <SectionTitle>Meal History</SectionTitle>
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {grouped.length === 0 && (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 15, background: 'var(--gray-500)', borderRadius: 'var(--radius-lg)' }}>
              No meals logged yet.
            </div>
          )}
          {grouped.map((g) => (
            <div key={g.iso}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>{dateHeading(g.iso)}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {g.meals.map((m) => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--gray-500)', borderRadius: 'var(--radius-lg)', padding: 12 }}>
                    {m.photo ? (
                      <img src={m.photo} alt="" style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--gray-400)', flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, lineHeight: '22px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
                      <div style={{ fontSize: 13, lineHeight: '19px', color: 'var(--text-secondary)' }}>{window.TrackedApp.fmtTime(m.ts)} · P:{m.protein}g C:{m.carbs}g F:{m.fat}g</div>
                    </div>
                    <div style={{ fontSize: 15, lineHeight: '22px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{m.calories} kcal</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

Object.assign(window, { AnalysisScreen });
