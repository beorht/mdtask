(function () {
  const tabButtons = document.querySelectorAll('.tab-btn');
  if (!tabButtons.length) return;

  function showTab(tab) {
    tabButtons.forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    document.querySelectorAll('.submission-card').forEach(function (card) {
      card.hidden = card.dataset.submissionType !== tab;
    });
  }

  tabButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      showTab(btn.dataset.tab);
    });
  });

  const initial = document.querySelector('.tab-btn.active');
  showTab(initial ? initial.dataset.tab : 'main');
})();
