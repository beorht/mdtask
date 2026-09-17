const express = require('express');
const path = require('path');
const session = require('express-session');

function createApp() {
  const app = express();

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());
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

  app.use(authRoutes);
  app.use(studentRoutes);
  app.use(teacherRoutes);
  app.use(trainerRoutes);

  app.use((req, res) => res.status(404).render('404'));

  return app;
}

module.exports = { createApp };
