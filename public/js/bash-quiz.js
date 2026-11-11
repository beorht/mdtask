// Тест темы предмета «Bash: скрипты в Linux» (src/views/bash-course/test.ejs): выбор варианта в каждом вопросе,
// ответ отправляется на сервер, сервер сверяет с хранимым правильным ответом и возвращает верно/неверно + пояснение.
// Правильный ответ в браузер до ответа не передаётся.
(function () {
  var list = document.querySelector('.bash-quiz');
  if (!list) return;
  var base = list.dataset.answerBase;
  var scoreEl = document.querySelector('[data-quiz-score]');

  list.querySelectorAll('.bash-quiz-item').forEach(function (item) {
    var qid = item.dataset.qid;
    var feedback = item.querySelector('.bash-quiz-feedback');
    item.querySelectorAll('.bash-quiz-opt').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (item.classList.contains('is-solved')) return;
        var choice = parseInt(btn.dataset.choice, 10);
        btn.disabled = true;
        fetch(base + '/' + qid + '/answer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ choice: choice }), credentials: 'same-origin' })
          .then(function (res) { return res.json().then(function (j) { return { ok: res.ok, j: j }; }); })
          .then(function (r) {
            if (!r.ok) { btn.disabled = false; feedback.hidden = false; feedback.textContent = (r.j && r.j.error) || 'Ошибка.'; return; }
            if (r.j.correct) {
              btn.classList.add('is-correct');
              item.classList.add('is-solved');
              item.querySelectorAll('.bash-quiz-opt').forEach(function (b) { b.disabled = true; });
              feedback.hidden = false;
              feedback.textContent = '✓ Верно. ' + (r.j.explain || '');
              if (scoreEl) scoreEl.textContent = String(parseInt(scoreEl.textContent, 10) + 1);
            } else {
              btn.classList.add('is-wrong');
              btn.disabled = true;
              feedback.hidden = false;
              feedback.textContent = '✗ Неверно, попробуйте другой вариант.';
            }
          })
          .catch(function () { btn.disabled = false; feedback.hidden = false; feedback.textContent = 'Не удалось связаться с сервером.'; });
      });
    });
  });
})();
