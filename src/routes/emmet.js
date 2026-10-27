// Тренажёр «Emmet · Тетрадь» (src/lib/emmet/): страница с клиентом из public/vendor/emmet/ и его API.
// Видят группа WEB и TEST; на время итоговой контрольной группы (examLockFor) закрыт, как остальная практика.
// Mounted before `student` so /subjects/emmet isn't taken by /subjects/:key.
const express = require('express');
const { requireRole } = require('../middleware/auth');
const { blockDuringExam } = require('../middleware/exam-lock');
const { examLockFor } = require('../lib/exam');
const emmet = require('../lib/emmet');

const router = express.Router();
const BASE = `/subjects/${emmet.EMMET_KEY}`;
const FINISHED = 'Занятие окончено. Ваши результаты сохранены.';

function requireVisible(req, res, next) {
  if (!emmet.canSeeEmmet(req.session.user)) return res.status(404).render('404');
  next();
}

router.get(BASE, requireRole('student'), requireVisible, blockDuringExam, (req, res) => {
  res.render('emmet/index', { user: req.session.user, pageTitle: emmet.EMMET_TITLE });
});

// API: JSON вместо перенаправлений; закрытое занятие — 401 с closed: true (клиент показывает «Занятие окончено»).
function api(handler) {
  return (req, res) => {
    const user = req.session.user;
    res.set('Cache-Control', 'no-store');
    if (!user) return res.status(401).json({ error: 'Войдите на сайт заново.' });
    if (user.mustChangePassword) return res.status(401).json({ error: 'Сначала смените пароль.' });
    if (!emmet.canSeeEmmet(user)) return res.status(404).json({ error: 'Тренажёр недоступен.' });
    const lock = examLockFor(user);
    if (lock) return res.status(423).json({ error: lock.during ? 'Закрыто на время итоговой контрольной.' : 'Закрыто преподавателем.' });
    if (emmet.sessionClosed(user)) return res.status(401).json({ error: FINISHED, closed: true });
    try {
      res.json(handler(req, user));
    } catch (err) {
      if (!(err instanceof emmet.EmmetError)) throw err;
      res.status(err.status).json({ error: err.message, ...err.extra });
    }
  };
}

router.get(`${BASE}/api/me`, api((req, user) => emmet.me(user)));
router.post(`${BASE}/api/events`, api((req, user) => emmet.recordEvent(user, req.body)));
router.get(`${BASE}/api/session`, (req, res) => {
  res.set('Cache-Control', 'no-store');
  const user = req.session.user;
  res.json({ closed: Boolean(user && emmet.canSeeEmmet(user) && emmet.sessionClosed(user)) });
});

module.exports = router;
