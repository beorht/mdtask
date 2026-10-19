// While the final exam of a student's group runs (src/lib/exam examLockFor), the group's IB
// tasks and SQL trainer stay listed but are closed: pages show why, API calls get 423.
const { examLockFor } = require('../lib/exam');

function blockDuringExam(req, res, next) {
  const exam = examLockFor(req.session.user);
  if (!exam) return next();
  if (req.method !== 'GET') return res.status(423).json({ error: 'Закрыто на время итоговой контрольной.' });
  res.status(423).render('exam-locked', { user: req.session.user, exam });
}

module.exports = { blockDuringExam };
