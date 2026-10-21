// While the final exam of a student's group runs, or while the teacher keeps the group's
// practical work closed (src/lib/exam examLockFor), it stays listed but is closed: pages show
// why, API calls get 423.
const { examLockFor } = require('../lib/exam');

function blockDuringExam(req, res, next) {
  const exam = examLockFor(req.session.user);
  if (!exam) return next();
  if (req.method !== 'GET') return res.status(423).json({ error: exam.during ? 'Закрыто на время итоговой контрольной.' : 'Закрыто преподавателем.' });
  res.status(423).render('exam-locked', { user: req.session.user, exam });
}

module.exports = { blockDuringExam };
