// Админ-раздел веб-контрольной (/admin/web-control): список студентов web-2 с заданием
// «Каталог на XML и DOM», их сдачами и выгрузкой работ (код + схема). Регистрируется на admin-роутере.
const webAdmin = require('../lib/web-mid/admin');
const { createZip } = require('../lib/code-submission');

function register(router, { render, notFound }) {
  router.get('/admin/web-control', (req, res) => {
    render(res, 'web-control', 'webmid', { pageTitle: 'Веб-контрольная', o: webAdmin.overview() });
  });

  // Все сданные работы одним архивом: по папке на студента (код + схема).
  router.get('/admin/web-control/all.zip', (req, res) => {
    const entries = webAdmin.allZipEntries();
    if (!entries.length) return notFound(res, 'Пока нет сданных работ для выгрузки.');
    res.attachment('веб-контрольная-работы.zip');
    res.type('application/zip').send(createZip(entries));
  });
}

module.exports = { register };
