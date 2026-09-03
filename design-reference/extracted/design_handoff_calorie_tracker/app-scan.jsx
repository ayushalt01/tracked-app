const { Icon } = window.TrackedDesignSystem_62ddee;

const SCAN_PROMPT = 'You are a nutrition estimation assistant. Look at this photo of a meal and estimate its nutrition. Respond with ONLY valid JSON (no markdown fences, no commentary) matching exactly this schema:\n{"name": string, "description": string, "calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number, "sugar": number, "sodium": number, "potassium": number, "calcium": number, "iron": number, "vitaminC": number}\nUnits: calories in kcal; protein, carbs, fat, fiber, sugar in grams; sodium, potassium, calcium in milligrams; iron in milligrams; vitaminC in milligrams. Estimate realistic values based on the visible portion size. "name" should be a short (2-5 word) title for the dish.';

function parseAiJson(text) {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start >= 0 && end > start) t = t.slice(start, end + 1);
  return JSON.parse(t);
}

async function analyzeMealPhoto(dataUrl, mediaType) {
  const base64 = dataUrl.split(',')[1];
  const resp = await window.claude.complete({
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: base64 } },
        { type: 'text', text: SCAN_PROMPT }
      ]
    }],
    max_tokens: 1024
  });
  return parseAiJson(resp);
}

function ScanScreen({ onNavigate, onAnalyzed }) {
  const [phase, setPhase] = React.useState('idle');
  const [error, setError] = React.useState(null);
  const [preview, setPreview] = React.useState(null);
  const cameraInput = React.useRef(null);
  const galleryInput = React.useRef(null);

  function handleFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result;
      setPreview(dataUrl);
      setPhase('analyzing');
      setError(null);
      try {
        const analysis = await analyzeMealPhoto(dataUrl, file.type);
        onAnalyzed(analysis, dataUrl);
      } catch (err) {
        setPhase('error');
        setError(err && err.message ? err.message : 'Could not analyze this photo.');
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <Frame statusBarVariant="status bar white" bg="var(--surface-scan)" active="scan" onNavigate={onNavigate} showNav>
      <div style={{ padding: '16px 20px 0 20px', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <BackButton onClick={() => onNavigate('home')} dark />
          <div style={{ fontSize: 20, lineHeight: '30px', fontWeight: 700, color: '#fff' }}>Scan Your Meal</div>
        </div>

        <div style={{ marginTop: 24, width: '100%', aspectRatio: '1 / 1', borderRadius: 'var(--radius-xl)', border: '1px dashed rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
          {preview ? (
            <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: 'var(--text-secondary)' }}>
              <Icon name="IcCamera" size={40} />
              <div style={{ fontSize: 15, lineHeight: '22px' }}>Add a photo of your meal</div>
            </div>
          )}
          {phase === 'analyzing' && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#fff' }}>
              <div className="tracked-spinner" style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.25)', borderTopColor: '#fff', animation: 'tracked-spin 0.8s linear infinite' }} />
              <div style={{ fontSize: 15, lineHeight: '22px' }}>Analyzing your meal…</div>
            </div>
          )}
        </div>

        {phase === 'error' && (
          <div style={{ marginTop: 16, padding: 12, borderRadius: 'var(--radius-md)', background: 'rgba(201,56,56,0.15)', color: '#FF3E3E', fontSize: 13, lineHeight: '19px' }}>
            {error}
          </div>
        )}

        <div style={{ marginTop: 'auto', paddingBottom: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div onClick={() => cameraInput.current && cameraInput.current.click()} style={{ cursor: 'pointer' }}>
            <Button type="primary" size="lg" text1={phase === 'error' ? 'Try Again' : 'Take Photo'} style={{ width: '100%' }} />
          </div>
          <div onClick={() => galleryInput.current && galleryInput.current.click()} style={{ cursor: 'pointer' }}>
            <Button type="outline" size="lg" text1="Choose from Gallery" style={{ width: '100%', boxShadow: 'inset 0 0 0 1px #fff' }} />
          </div>
        </div>
        <input ref={cameraInput} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFile} />
        <input ref={galleryInput} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
      </div>
      <style>{'@keyframes tracked-spin{to{transform:rotate(360deg)}}'}</style>
    </Frame>
  );
}

const MICRO_DEFS = [
  { key: 'fiber', label: 'Fiber', unit: 'g' },
  { key: 'sugar', label: 'Sugar', unit: 'g' },
  { key: 'sodium', label: 'Sodium', unit: 'mg' },
  { key: 'potassium', label: 'Potassium', unit: 'mg' },
  { key: 'calcium', label: 'Calcium', unit: 'mg' },
  { key: 'iron', label: 'Iron', unit: 'mg' },
  { key: 'vitaminC', label: 'Vitamin C', unit: 'mg' },
];

function ResultScreen({ pendingScan, goals, onNavigate, onLog, onRetake }) {
  const [name, setName] = React.useState(pendingScan.analysis.name || 'Meal');
  const [microOpen, setMicroOpen] = React.useState(false);
  const a = pendingScan.analysis;

  function handleLog() {
    onLog({
      id: 'm' + Date.now(),
      ts: Date.now(),
      dateISO: window.TrackedApp.todayISO(),
      name: name,
      photo: pendingScan.photo,
      calories: Math.round(a.calories || 0),
      protein: Math.round(a.protein || 0),
      carbs: Math.round(a.carbs || 0),
      fat: Math.round(a.fat || 0),
      micros: MICRO_DEFS.reduce((acc, d) => { acc[d.key] = Math.round(a[d.key] || 0); return acc; }, {})
    });
  }

  return (
    <Frame active="scan" onNavigate={onNavigate} showNav>
      <div style={{ position: 'relative', width: '100%', height: 320 }}>
        <img src={pendingScan.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.75) 100%)' }} />
        <div style={{ position: 'absolute', top: 16, left: 20 }}>
          <BackButton onClick={onRetake} dark />
        </div>
        <div style={{ position: 'absolute', bottom: 16, left: 20, right: 20 }}>
          <div style={{ fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--accent-200)', fontWeight: 600 }}>AI Estimated</div>
          <input value={name} onChange={(e) => setName(e.target.value)} style={{ background: 'transparent', border: 0, outline: 0, color: '#fff', fontFamily: 'var(--font-core)', fontSize: 24, lineHeight: '36px', fontWeight: 700, width: '100%', padding: 0 }} />
        </div>
      </div>

      <div style={{ padding: '20px 20px 0 20px' }}>
        {a.description && <div style={{ fontSize: 15, lineHeight: '22px', color: 'var(--text-secondary)' }}>{a.description}</div>}

        <div style={{ marginTop: 16, background: 'var(--accent-200)', borderRadius: 'var(--radius-xl)', padding: 24 }}>
          <div style={{ fontSize: 20, lineHeight: '30px', fontWeight: 700, color: 'var(--gray-600)' }}>Calories</div>
          <div style={{ fontSize: 34, lineHeight: '51px', fontWeight: 700, color: 'var(--gray-600)' }}>{Math.round(a.calories || 0).toLocaleString()} <span style={{ fontSize: 17, lineHeight: '24px', fontWeight: 400 }}>kcal</span></div>
        </div>

        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          <MacroCard label="Protein" value={Math.round(a.protein || 0)} unit="g" color={window.macroColors.protein} />
          <MacroCard label="Carbs" value={Math.round(a.carbs || 0)} unit="g" color={window.macroColors.carbs} />
          <MacroCard label="Fat" value={Math.round(a.fat || 0)} unit="g" color={window.macroColors.fat} />
        </div>

        <button onClick={() => setMicroOpen((v) => !v)} style={{ marginTop: 24, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 0, padding: 0, cursor: 'pointer' }}>
          <div style={{ fontSize: 18, lineHeight: '27px', fontWeight: 600, color: 'var(--text-primary)' }}>Micronutrients</div>
          <Icon name="IcArrow" size={16} style={{ color: 'var(--text-secondary)', transform: microOpen ? 'rotate(90deg)' : 'rotate(-90deg)', transition: 'transform var(--duration-base) var(--ease-standard)' }} />
        </button>
        {microOpen && (
          <div style={{ marginTop: 12, background: 'var(--gray-500)', borderRadius: 'var(--radius-lg)', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {MICRO_DEFS.map((d) => {
              const val = Math.round(a[d.key] || 0);
              const goal = goals[d.key] || 1;
              return (
                <div key={d.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, lineHeight: '19px', color: 'var(--text-primary)', marginBottom: 4 }}>
                    <span>{d.label}: {val}{d.unit}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{Math.round((val / goal) * 100)}% DV</span>
                  </div>
                  <ProgressBar pct={(val / goal) * 100} />
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 24, paddingBottom: 8 }}>
          <div onClick={handleLog} style={{ cursor: 'pointer' }}>
            <Button type="primary" size="lg" text1="Log This Meal" style={{ width: '100%' }} />
          </div>
        </div>
      </div>
    </Frame>
  );
}

Object.assign(window, { ScanScreen, ResultScreen, MICRO_DEFS, analyzeMealPhoto });
