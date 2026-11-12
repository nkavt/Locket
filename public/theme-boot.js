// Runs before the app bundle so the first frame already has the right theme (no white flash).
// Mirrors readOverride() in src/state/ThemeModeProvider.tsx; the colours live in index.html.
// A separate file rather than an inline script so the production CSP ('self') allows it.
(function () {
  var mode = null;
  try {
    var v = localStorage.getItem('locket-theme-v2');
    if (v === 'dark' || v === 'light') mode = v;
    // v1 only stored a real choice when it was 'dark'; the provider migrates it on mount.
    else if (localStorage.getItem('locket-theme-v1') === 'dark') mode = 'dark';
  } catch (e) {
    // Storage unavailable: follow the system.
  }
  if (mode) document.documentElement.setAttribute('data-theme', mode);
})();
