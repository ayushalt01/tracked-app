const { StatusBar, BottomMenu, Button } = window.TrackedDesignSystem_62ddee;
const { Icon } = window.TrackedDesignSystem_62ddee;

const sharedNavStyles = {
  wrap: { position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 34, zIndex: 20 },
  pill: { display: 'flex', gap: 8, padding: 6, borderRadius: 100, background: 'rgb(47,47,47)', boxShadow: 'var(--shadow-nav)' },
  slot: (active) => ({ width: 54, height: 54, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: active ? 'var(--primary-100)' : 'rgb(71,71,71)', border: 0, cursor: 'pointer', padding: 0 }),
};

function BottomNav({ active, onNavigate }) {
  const items = [
    { key: 'home', icon: 'home', fill: 'home-fill' },
    { key: 'analysis', icon: 'analysis', fill: 'analysis-fill' },
    { key: 'scan', icon: 'ai', fill: 'ai-fill' },
    { key: 'settings', icon: 'settings', fill: 'settings-fill' },
  ];
  return (
    <div style={sharedNavStyles.wrap}>
      <div style={sharedNavStyles.pill}>
        {items.map((it) => {
          const isActive = active === it.key;
          return (
            <button key={it.key} style={sharedNavStyles.slot(isActive)} onClick={() => onNavigate(it.key)} aria-label={it.key}>
              <BottomMenu property1={isActive ? it.fill : it.icon} style={{ width: 24, height: 24, color: isActive ? '#fff' : 'rgb(41,45,50)' }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PhoneShell({ bg, children }) {
  return (
    <div style={{ minHeight: '100vh', background: '#F2F2F2', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 0', fontFamily: 'var(--font-core)' }}>
      <div style={{ width: 428, height: 926, position: 'relative', overflow: 'hidden', background: bg || 'var(--bg-app)', borderRadius: 44 }}>
        {children}
      </div>
    </div>
  );
}

function Frame({ statusBarVariant, bg, active, onNavigate, children, showNav }) {
  return (
    <PhoneShell bg={bg}>
      <StatusBar statusBar={statusBarVariant || 'status bar white'} />
      <div style={{ position: 'absolute', top: 47, left: 0, right: 0, bottom: 0, overflowY: 'auto' }}>
        {children}
        <div style={{ height: showNav ? 118 : 24 }} />
      </div>
      {showNav && <BottomNav active={active} onNavigate={onNavigate} />}
    </PhoneShell>
  );
}

const macroColors = {
  protein: 'oklch(78% 0.09 25)', carbs: 'oklch(82% 0.12 80)', fat: 'oklch(80% 0.11 95)'
};

function MacroCard({ label, value, unit, color, textColor }) {
  return (
    <div style={{ background: color, borderRadius: 'var(--radius-lg)', padding: 16, color: textColor || 'var(--gray-600)' }}>
      <div style={{ fontSize: 15, lineHeight: '22px', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 20, lineHeight: '30px', fontWeight: 700 }}>{value}{unit}</div>
    </div>
  );
}

function ProgressBar({ pct, color }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div style={{ width: '100%', height: 6, borderRadius: 'var(--radius-pill)', background: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
      <div style={{ width: clamped + '%', height: '100%', background: color || 'var(--primary-100)', borderRadius: 'var(--radius-pill)' }} />
    </div>
  );
}

function SectionTitle({ children, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24 }}>
      <div style={{ fontSize: 18, lineHeight: '27px', fontWeight: 600, color: 'var(--text-primary)' }}>{children}</div>
      {right}
    </div>
  );
}

function BackButton({ onClick, dark }) {
  return (
    <button onClick={onClick} style={{ width: 40, height: 40, borderRadius: '50%', background: dark ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.16)', border: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
      <Icon name="IcArrowLeft" size={20} />
    </button>
  );
}

function ScaledAvatar({ size, initial }) {
  const { Profile } = window.TrackedDesignSystem_62ddee;
  const scale = size / 100;
  return (
    <div style={{ width: size, height: size, overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
      <Profile type="name" text1={initial} style={{ position: 'absolute', top: 0, left: 0, width: 100, height: 100, transform: 'scale(' + scale + ')', transformOrigin: '0 0' }} />
    </div>
  );
}

Object.assign(window, { BottomNav, PhoneShell, Frame, macroColors, MacroCard, ProgressBar, SectionTitle, BackButton, ScaledAvatar });
