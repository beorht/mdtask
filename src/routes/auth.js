const express = require('express');
const { getUsers } = require('../db');

const router = express.Router();

router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

router.post('/login', (req, res) => {
  const { studentId } = req.body;
  const user = getUsers().find((u) => u.id === studentId);

  if (!user) {
    return res.render('login', { error: 'Пользователь с таким ID не найден' });
  }

  req.session.user = user;
  res.redirect(user.role === 'teacher' ? '/teacher' : '/');
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;
