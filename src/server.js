const express = require('express');
const path = require('path');
const session = require('express-session');
const { sharedStore, sessionSecret, SESSION_MAX_AGE } = require('./lib/session-store');

function createApp() {
  const app = express();

  app.set('view engine', 'ejs');
  // Behind a reverse proxy, TRUST_PROXY (e.g. 1 or loopback) makes req.ip the client's address,
  // which the final exam's classroom-PC check needs (src/lib/exam/devices.js).
  if (process.env.TRUST_PROXY) {
    const hops = Number(process.env.TRUST_PROXY);
    app.set('trust proxy', Number.isInteger(hops) ? hops : process.env.TRUST_PROXY);
  }
  app.set('views', path.join(__dirname, 'views'));
  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json({ limit: '1mb' })); // editor assignments send whole source files
  app.use(
    session({
      store: sharedStore(),
      secret: sessionSecret(),
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: { maxAge: SESSION_MAX_AGE, httpOnly: true, sameSite: 'lax' },
    })
  );

  app.get('/health', (req, res) => res.status(200).send('ok'));

  // Группа и имя студента — из базы на каждый запрос: после переноса в другую группу (scripts/fixes/…-regroup.js)
  // уже вошедшим не нужно входить заново. Удалённый аккаунт — выход.
  app.use((req, res, next) => {
    const cached = req.session && req.session.user;
    if (!cached || cached.role !== 'student') return next();
    const fresh = require('./db').getUserById(cached.id);
    if (!fresh) return req.session.destroy(() => res.redirect('/login'));
    if (fresh.group !== cached.group || fresh.name !== cached.name) {
      req.session.user = { ...cached, group: fresh.group, name: fresh.name };
    }
    next();
  });

  const authRoutes = require('./routes/auth');
  const studentRoutes = require('./routes/student');
  const teacherRoutes = require('./routes/teacher');
  const trainerRoutes = require('./routes/trainer');
  const adminRoutes = require('./routes/admin');
  const ibRoutes = require('./routes/ib');
  const emmetRoutes = require('./routes/emmet');
  const htmlCourseRoutes = require('./routes/html-course');
  const cssCourseRoutes = require('./routes/css-course');
  const pythonCourseRoutes = require('./routes/python-course');
  const jsCourseRoutes = require('./routes/js-course');
  const examRoutes = require('./routes/exam');
  const webExamRoutes = require('./routes/web-exam');

  app.use(authRoutes);
  // Before studentRoutes: its /subjects/:key would otherwise answer /subjects/ib, /subjects/emmet and
  // /subjects/html with a 404.
  app.use(require('./lib/test-access').subjectGuard); // группы с ограниченным набором предметов (GROUP_SUBJECTS)
  app.use(ibRoutes);
  app.use(emmetRoutes);
  app.use(htmlCourseRoutes);
  app.use(cssCourseRoutes);
  app.use(pythonCourseRoutes);
  app.use(jsCourseRoutes);
  // The WEB group's exam answers its own /exam/<id> and passes every other id on to examRoutes.
  app.use(webExamRoutes);
  app.use(examRoutes);
  app.use(studentRoutes);
  app.use(teacherRoutes);
  app.use(trainerRoutes);
  app.use(adminRoutes);

  app.use((req, res) => res.status(404).render('404'));

  return app;
}

module.exports = { createApp };
