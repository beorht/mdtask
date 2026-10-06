const express = require('express');
const {
  verifyUserCredentials,
  setUserPassword,
  getUserById,
  verifyCaesarSecret,
  markCaesarSecretSolved,
} = require('../db');
const { MIN_PASSWORD_LENGTH } = require('../lib/password');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

router.post('/login', (req, res) => {
  const { studentId, password } = req.body;
  let user = verifyUserCredentials(studentId, password || '');

  // Fallback: второй пароль из практики по шифру Цезаря (тот же логин, другой
  // пароль, найденный студентом в зашифрованном виде) — независимо от основного.
  if (!user) {
    const secret = verifyCaesarSecret(studentId, password || '');
    if (secret) {
      user = getUserById(studentId);
      if (user) markCaesarSecretSolved(studentId);
    }
  }

  if (!user) {
    return res.render('login', { error: 'Неверный ID или пароль' });
  }

  req.session.user = user;
  if (user.mustChangePassword) return res.redirect('/change-password');
  res.redirect(user.role === 'teacher' ? '/admin' : '/');
});

router.get('/change-password', requireAuth, (req, res) => {
  res.render('change-password', { error: null, forced: req.session.user.mustChangePassword });
});

router.post('/change-password', requireAuth, (req, res) => {
  const { newPassword, confirmPassword } = req.body;
  const forced = req.session.user.mustChangePassword;

  if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).render('change-password', {
      error: `Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов.`,
      forced,
    });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).render('change-password', { error: 'Пароли не совпадают.', forced });
  }

  const updated = setUserPassword(req.session.user.id, newPassword);
  req.session.user = updated;
  res.redirect(updated.role === 'teacher' ? '/admin' : '/');
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;
