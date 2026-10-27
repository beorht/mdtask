// Практическая работа предмета «Web-разработка: HTML» (mdtask src/routes/html-course.js, страница
// src/views/html-course/practice.ejs). Окно по образцу заданий на контейнеры EmmetEmulator: слева сверху — вид кода
// ученика, снизу — ожидаемый результат, справа — редактор HTML (руками или Emmet). Шрифты подключает страница.
import '../styles/main.css';
import '../styles/boxes.css';
import './html.css';

import { ExerciseStore } from '../services/ExerciseStore.js';
import { validate, Status } from '../services/ValidationService.js';
import { api, setApiBase, EventReporter } from '../services/Api.js';
import { escapeHtml } from '../services/highlight.js';
import { FocusMonitor, formatAway } from '../services/FocusMonitor.js';
import { CodeEditorPanel } from '../components/CodeEditorPanel.js';
import { LessonNav } from '../components/LessonNav.js';
import { TargetPanel } from './TargetPanel.js';

const TOAST_TIME = 6000;
const root = document.getElementById('app');
setApiBase(`${root.dataset.base}/api/${root.dataset.topic}`);

function showToast(text) {
  const toast = document.getElementById('toast');
  toast.textContent = text;
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.hidden = true;
  }, TOAST_TIME);
}

// Образец и код со страницы не копируются: их не отнести в чат-бот одним движением.
function blockCopying() {
  for (const type of ['copy', 'cut', 'dragstart']) {
    document.addEventListener(type, (event) => event.preventDefault());
  }
}

function App({ student, exercises, progress }) {
  const store = new ExerciseStore(exercises);
  store.solved = new Set(progress.solved);
  store.index = store.resumeIndex();

  const userChip = document.getElementById('user-chip');
  userChip.innerHTML = `
    <span class="user-status" title="Результаты сохраняются"></span>
    <span class="user-name">${escapeHtml(student.name)}</span>
  `;
  const status = userChip.querySelector('.user-status');
  const reporter = new EventReporter({
    onConnection: (online) => {
      status.classList.toggle('is-offline', !online);
      status.title = online ? 'Результаты сохраняются' : 'Нет связи с сервером — результаты отправятся позже';
    },
    onExpired: () => window.location.assign('/login'),
    onClosed: () => window.location.reload(),
  });

  const nav = new LessonNav(document.getElementById('lesson-nav'), { store });
  const target = new TargetPanel(document.getElementById('target'));
  const editor = new CodeEditorPanel(document.getElementById('practice'), {
    store,
    onPreview: (code) => target.showStudent(code),
    validate: (code, context) => validate(code, store.current, context),
    onBlocked: (kind) => reporter.send({ type: 'paste', exerciseId: store.current.id, kind }),
    onResult: (result, code) => {
      if (result.status === Status.success) store.markSolved(store.current.id);
      if (!code.trim()) return;
      reporter.send({ type: 'attempt', exerciseId: store.current.id, status: result.status, code });
    },
  });

  let shownId = null;
  store.subscribe(() => {
    nav.render();
    if (store.current.id !== shownId) showExercise();
  });

  function showExercise() {
    shownId = store.current.id;
    target.load(store.current);
    editor.load(store.current);
    reporter.send({ type: 'open', exerciseId: shownId });
  }

  new FocusMonitor({
    onReturn: (ms) => {
      reporter.send({ type: 'away', exerciseId: store.current.id, ms });
      showToast(`Вы были вне страницы ${formatAway(ms)}. Преподаватель видит, когда и надолго ли вы уходили.`);
    },
  });
  blockCopying();

  nav.render();
  showExercise();
  root.hidden = false;
  document.documentElement.classList.add('is-ready');
}

async function boot() {
  try {
    App(await api.me());
  } catch (error) {
    if (error.status === 401) return window.location.assign('/login');
    const box = document.getElementById('login');
    box.innerHTML = `<div class="login-card" role="alert"><h1 class="login-title">Практическая работа не открылась</h1>
      <p class="login-text">${escapeHtml(error.message)}</p></div>`;
    box.hidden = false;
  }
}

boot();
