function App() {
  const [state, setState] = React.useState(() => window.TrackedApp.loadState());
  const [route, setRoute] = React.useState('home');
  const [pendingScan, setPendingScan] = React.useState(null);

  React.useEffect(() => { window.TrackedApp.saveState(state); }, [state]);

  function updateState(patch) {
    setState((s) => Object.assign({}, s, patch));
  }

  function handleNavigate(key) {
    if (key === 'scan') { setPendingScan(null); setRoute('scan'); return; }
    setRoute(key);
  }

  function handleAnalyzed(analysis, photo) {
    setPendingScan({ analysis, photo });
    setRoute('result');
  }

  function handleLog(meal) {
    setState((s) => Object.assign({}, s, { meals: s.meals.concat([meal]) }));
    setPendingScan(null);
    setRoute('home');
  }

  function handleResetData() {
    setState((s) => Object.assign({}, s, { meals: [] }));
  }

  if (route === 'scan') return <ScanScreen onNavigate={handleNavigate} onAnalyzed={handleAnalyzed} />;
  if (route === 'result' && pendingScan) return <ResultScreen pendingScan={pendingScan} goals={state.goals} onNavigate={handleNavigate} onLog={handleLog} onRetake={() => setRoute('scan')} />;
  if (route === 'analysis') return <AnalysisScreen state={state} onNavigate={handleNavigate} />;
  if (route === 'settings') return <SettingsScreen state={state} onUpdate={updateState} onNavigate={handleNavigate} onResetData={handleResetData} />;
  return <HomeScreen state={state} onNavigate={handleNavigate} />;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
