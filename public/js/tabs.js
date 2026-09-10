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

  // Real upload: click/drop -> populate the hidden file input -> submit the form.
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const uploadForm = document.getElementById('uploadForm');

  if (dropzone && fileInput && uploadForm) {
    dropzone.addEventListener('click', function () {
      fileInput.click();
    });
    dropzone.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput.click();
      }
    });
    fileInput.addEventListener('change', function () {
      if (fileInput.files.length > 0) uploadForm.submit();
    });

    ['dragenter', 'dragover'].forEach(function (evt) {
      dropzone.addEventListener(evt, function (e) {
        e.preventDefault();
        dropzone.classList.add('drag-over');
      });
    });
    ['dragleave'].forEach(function (evt) {
      dropzone.addEventListener(evt, function (e) {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
      });
    });
    dropzone.addEventListener('drop', function (e) {
      e.preventDefault();
      dropzone.classList.remove('drag-over');
      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        fileInput.files = e.dataTransfer.files;
        uploadForm.submit();
      }
    });
  }
})();
