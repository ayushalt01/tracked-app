const { Profile, Toggle } = window.TrackedDesignSystem_62ddee;

function GoalField({ label, value, onChange }) {
  return (
    <div>
      <div style={{ fontSize: 13, lineHeight: '19px', color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</div>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        style={{ width: '100%', boxSizing: 'border-box', background: 'var(--gray-500)', border: '1px solid var(--gray-400)', borderRadius: 'var(--radius-md)', padding: '12px 16px', color: '#fff', fontFamily: 'var(--font-core)', fontSize: 17 }}
      />
    </div>
  );
}

function SettingsScreen({ state, onUpdate, onNavigate, onResetData }) {
  const [goals, setGoals] = React.useState(state.goals);
  const [name, setName] = React.useState(state.profile.name);
  const [saved, setSaved] = React.useState(false);

  function saveGoals() {
    onUpdate({ goals: goals, profile: Object.assign({}, state.profile, { name: name }) });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function toggleNotifications() {
    onUpdate({ notifications: !state.notifications });
  }

  return (
    <Frame active="settings" onNavigate={onNavigate} showNav>
      <div style={{ padding: '16px 20px 0 20px' }}>
        <div style={{ fontSize: 24, lineHeight: '36px', fontWeight: 700, color: 'var(--text-primary)' }}>Settings</div>

        <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 16, background: 'var(--gray-500)', borderRadius: 'var(--radius-xl)', padding: 20 }}>
          <window.ScaledAvatar size={56} initial={name.charAt(0).toUpperCase() || 'A'} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>Name</div>
            <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', background: 'transparent', border: 0, borderBottom: '1px solid var(--gray-400)', color: '#fff', fontFamily: 'var(--font-core)', fontSize: 17, fontWeight: 600, padding: '4px 0' }} />
          </div>
        </div>

        <SectionTitle>Daily Goals</SectionTitle>
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 14, background: 'var(--gray-500)', borderRadius: 'var(--radius-xl)', padding: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <GoalField label="Calories (kcal)" value={goals.calories} onChange={(v) => setGoals({ ...goals, calories: v })} />
            <GoalField label="Protein (g)" value={goals.protein} onChange={(v) => setGoals({ ...goals, protein: v })} />
            <GoalField label="Carbs (g)" value={goals.carbs} onChange={(v) => setGoals({ ...goals, carbs: v })} />
            <GoalField label="Fat (g)" value={goals.fat} onChange={(v) => setGoals({ ...goals, fat: v })} />
          </div>
          <div onClick={saveGoals} style={{ cursor: 'pointer', marginTop: 4 }}>
            <Button type="primary" size="md" text1={saved ? 'Saved' : 'Save Changes'} style={{ width: '100%' }} />
          </div>
        </div>

        <SectionTitle>Preferences</SectionTitle>
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--gray-500)', borderRadius: 'var(--radius-lg)', padding: '16px 20px' }}>
          <div style={{ fontSize: 15, lineHeight: '22px', color: 'var(--text-primary)', fontWeight: 500 }}>Meal Reminders</div>
          <div onClick={toggleNotifications} style={{ cursor: 'pointer' }}>
            <Toggle switch={state.notifications ? 'on' : 'off'} />
          </div>
        </div>

        <SectionTitle>Data</SectionTitle>
        <div style={{ marginTop: 12, marginBottom: 8 }}>
          <div onClick={onResetData} style={{ cursor: 'pointer' }}>
            <Button type="outline" size="md" text1="Clear Logged Meals" style={{ width: '100%' }} />
          </div>
        </div>
      </div>
    </Frame>
  );
}

Object.assign(window, { SettingsScreen });
