// Web Worker курса JavaScript: выполняет программу студента (public/js/js-runner.js) без доступа к странице.
// Сообщение: { id, code, input: [строки] } → ответ { id, stdout, error }. Остановку по времени делает страница
// (public/js/js-course.js): «зависшую» программу она завершает вместе с воркером.
importScripts('/js/js-runner.js');
self.onmessage = async (event) => {
  const { id, code, input } = event.data || {};
  const result = await self.JsRunner.run(String(code || ''), Array.isArray(input) ? input : []);
  self.postMessage({ id, ...result });
};
