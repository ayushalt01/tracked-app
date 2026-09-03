const { Profile } = window.TrackedDesignSystem_62ddee;

function sumMeals(meals) {
  return meals.reduce((acc, m) => {
    acc.calories += m.calories || 0;
    acc.protein += m.protein || 0;
    acc.carbs += m.carbs || 0;
    acc.fat += m.fat || 0;
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
}

function HomeScreen({ state, onNavigate }) {
  const today = window.TrackedApp.todayISO();
  const todaysMeals = state.meals.filter((m) => m.dateISO === today).sort((a, b) => b.ts - a.ts);
  const totals = sumMeals(todaysMeals);
  const remaining = Math.max(0, state.goals.calories - totals.calories);

  return (
    <Frame active="home" onNavigate={onNavigate} showNav>
      <div style={{ padding: '16px 20px 0 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, lineHeight: '22px', fontWeight: 400, color: 'var(--text-secondary)' }}>{window.TrackedApp.greeting()}</div>
            <div style={{ fontSize: 24, lineHeight: '36px', fontWeight: 700, color: 'var(--text-primary)' }}>{state.profile.dietPlan}</div>
          </div>
          <button onClick={() => onNavigate('settings')} style={{ border: 0, background: 'none', padding: 0, cursor: 'pointer', borderRadius: '50%' }}>
            <window.ScaledAvatar size={48} initial={state.profile.name.charAt(0).toUpperCase()} />
          </button>
        </div>

        <div style={{ marginTop: 24, background: 'var(--accent-200)', borderRadius: 'var(--radius-xl)', padding: 24 }}>
          <div style={{ fontSize: 20, lineHeight: '30px', fontWeight: 700, color: 'var(--gray-600)' }}>Calories</div>
          <div style={{ fontSize: 34, lineHeight: '51px', fontWeight: 700, color: 'var(--gray-600)' }}>
            {remaining.toLocaleString()} <span style={{ fontSize: 17, lineHeight: '24px', fontWeight: 400 }}>kcal left</span>
          </div>
          <div style={{ marginTop: 8, fontSize: 15, lineHeight: '22px', fontWeight: 400, color: '#232220' }}>
            {totals.calories.toLocaleString()} of {state.goals.calories.toLocaleString()} kcal logged today
          </div>
        </div>

        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          <MacroCard label="Protein" value={Math.round(totals.protein)} unit="g" color={window.macroColors.protein} />
          <MacroCard label="Carbs" value={Math.round(totals.carbs)} unit="g" color={window.macroColors.carbs} />
          <MacroCard label="Fat" value={Math.round(totals.fat)} unit="g" color={window.macroColors.fat} />
        </div>

        <SectionTitle right={<button onClick={() => onNavigate('scan')} style={{ border: 0, background: 'none', color: 'var(--primary-100)', fontFamily: 'var(--font-core)', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>+ Add meal</button>}>
          Today's Meals
        </SectionTitle>

        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {todaysMeals.length === 0 && (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 15, background: 'var(--gray-500)', borderRadius: 'var(--radius-lg)' }}>
              No meals logged yet. Scan a photo to add one.
            </div>
          )}
          {todaysMeals.map((m) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--gray-500)', borderRadius: 'var(--radius-lg)', padding: 12 }}>
              {m.photo ? (
                <img src={m.photo} alt="" style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--gray-400)', flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, lineHeight: '22px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
                <div style={{ fontSize: 13, lineHeight: '19px', color: 'var(--text-secondary)' }}>{window.TrackedApp.fmtTime(m.ts)}</div>
              </div>
              <div style={{ fontSize: 15, lineHeight: '22px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{m.calories} kcal</div>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

Object.assign(window, { HomeScreen, sumMeals });
