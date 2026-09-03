// Plain data + storage helpers (no JSX). Exposed on window.TrackedApp.
(function () {
  var STORAGE_KEY = 'tracked_app_state_v1';

  var DEFAULT_GOALS = {
    calories: 2000, protein: 150, carbs: 220, fat: 65,
    fiber: 30, sugar: 50, sodium: 2300, potassium: 3500, calcium: 1000, iron: 18, vitaminC: 90
  };

  function todayISO() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function defaultState() {
    return {
      profile: { name: 'Alex', dietPlan: 'Vegan Vitality' },
      goals: DEFAULT_GOALS,
      notifications: true,
      meals: []
    };
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      var parsed = JSON.parse(raw);
      return Object.assign(defaultState(), parsed, {
        goals: Object.assign({}, DEFAULT_GOALS, parsed.goals || {}),
        profile: Object.assign({}, defaultState().profile, parsed.profile || {}),
        meals: Array.isArray(parsed.meals) ? parsed.meals : []
      });
    } catch (e) {
      return defaultState();
    }
  }

  function saveState(state) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  function greeting() {
    var h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  function fmtTime(ts) {
    var d = new Date(ts);
    var h = d.getHours(), m = d.getMinutes();
    var ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12; if (h === 0) h = 12;
    return h + ':' + String(m).padStart(2, '0') + ' ' + ampm;
  }

  function dayLabel(iso) {
    var d = new Date(iso + 'T00:00:00');
    return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
  }

  function last7Days() {
    var out = [];
    for (var i = 6; i >= 0; i--) {
      var d = new Date();
      d.setDate(d.getDate() - i);
      out.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'));
    }
    return out;
  }

  window.TrackedApp = {
    STORAGE_KEY: STORAGE_KEY,
    DEFAULT_GOALS: DEFAULT_GOALS,
    todayISO: todayISO,
    defaultState: defaultState,
    loadState: loadState,
    saveState: saveState,
    greeting: greeting,
    fmtTime: fmtTime,
    dayLabel: dayLabel,
    last7Days: last7Days
  };
})();
