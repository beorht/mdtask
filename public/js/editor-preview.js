(function () {
  const source = document.getElementById('editorSource');
  const preview = document.getElementById('editorPreview');
  if (!source || !preview) return;

  let timer = null;

  async function updatePreview() {
    const res = await fetch('/api/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markdown: source.value }),
    });
    const data = await res.json();
    preview.innerHTML = data.html;
  }

  source.addEventListener('input', function () {
    clearTimeout(timer);
    timer = setTimeout(updatePreview, 300);
  });

  updatePreview();
})();
