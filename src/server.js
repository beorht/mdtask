const express = require('express');
const path = require('path');
const session = require('express-session');

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
      secret: 'prototype-secret',
      resave: false,
      saveUninitialized: false,
    })
  );

  app.get('/health', (req, res) => res.status(200).send('ok'));

  const authRoutes = require('./routes/auth');
  const studentRoutes = require('./routes/student');
  const teacherRoutes = require('./routes/teacher');
  const trainerRoutes = require('./routes/trainer');
  const adminRoutes = require('./routes/admin');
  const ibRoutes = require('./routes/ib');
  const pythonBasicsRoutes = require('./routes/python-basics');
  const examRoutes = require('./routes/exam');

  app.use(authRoutes);
  // Before studentRoutes: its /subjects/:key would otherwise answer /subjects/ib and
  // /subjects/pybasics with a 404.
  app.use(ibRoutes);
  app.use(pythonBasicsRoutes);
  app.use(examRoutes);
  app.use(studentRoutes);
  app.use(teacherRoutes);
  app.use(trainerRoutes);
  app.use(adminRoutes);

  app.use((req, res) => res.status(404).render('404'));

  return app;
}

module.exports = { createApp };
