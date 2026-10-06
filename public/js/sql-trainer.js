// SQL trainer exercise page: reference tabs, editor hotkeys and Tab-indent.
(function () {
  // ---------- reference tabs (DB structure / data / history) ----------
  var tabs = document.querySelectorAll('.sql-ref-tab');
  var panes = document.querySelectorAll('[data-ref-panel]');
  var STORAGE_KEY = 'sqlTrainer.refTab';

  function showTab(name) {
    var found = false;
    tabs.forEach(function (tab) {
      var active = tab.dataset.ref === name;
      if (active) found = true;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    if (!found) return showTab('schema');
    panes.forEach(function (pane) {
      pane.hidden = pane.dataset.refPanel !== name;
    });
    try { localStorage.setItem(STORAGE_KEY, name); } catch (e) { /* storage unavailable */ }
  }

  if (tabs.length) {
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () { showTab(tab.dataset.ref); });
    });
    var saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) { /* storage unavailable */ }
    showTab(saved || 'schema');
  }

  // ---------- editor ----------
  var editor = document.getElementById('sqlEditor');
  var runBtn = document.getElementById('runBtn');
  var submitBtn = document.getElementById('submitBtn');
  if (!editor) return;

  editor.addEventListener('keydown', function (e) {
    // Ctrl/Cmd + Enter → run, Ctrl/Cmd + Shift + Enter → submit for checking.
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      (e.shiftKey ? submitBtn : runBtn).click();
      return;
    }
    // Tab inserts two spaces instead of leaving the editor.
    if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      var start = editor.selectionStart;
      var end = editor.selectionEnd;
      editor.value = editor.value.slice(0, start) + '  ' + editor.value.slice(end);
      editor.selectionStart = editor.selectionEnd = start + 2;
    }
  });

  // After a run/submit the page reloads at #workspace: put the cursor back at the end.
  if (location.hash === '#workspace') {
    editor.focus({ preventScroll: true });
    editor.selectionStart = editor.selectionEnd = editor.value.length;
  }
})();
