(function () {
  const tabButtons = document.querySelectorAll('.tab-btn');
  if (tabButtons.length) {
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
  }

  // Visual-only drag feedback on the upload dropzone (no real upload in this prototype).
  const dropzone = document.querySelector('.dropzone');
  if (dropzone) {
    ['dragenter', 'dragover'].forEach(function (evt) {
      dropzone.addEventListener(evt, function (e) {
        e.preventDefault();
        dropzone.classList.add('drag-over');
      });
    });
    ['dragleave', 'drop'].forEach(function (evt) {
      dropzone.addEventListener(evt, function (e) {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
      });
    });
  }
})();
