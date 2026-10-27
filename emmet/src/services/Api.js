/**
 * Обращения к серверу тренажёра (mdtask, src/routes/emmet.js; практика HTML — src/routes/html-course.js задаёт
 * свой адрес через setApiBase). Вход — общий вход сайта: cookie сессии уходит с каждым запросом.
 */

let API_BASE = '/subjects/emmet/api';

export function setApiBase(base) {
  API_BASE = base;
}

export class ApiError extends Error {
  constructor(status, message, closed = false) {
    super(message);
    this.status = status;
    this.closed = closed;
  }
}

async function request(path, { body } = {}) {
  let response;
  try {
    response = await fetch(API_BASE + path, {
      method: body ? 'POST' : 'GET',
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Нет связи с сервером. Проверьте подключение.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, data.error ?? 'Ошибка сервера.', Boolean(data.closed));
  return data;
}

export const api = {
  me: () => request('/me'),
  sendEvent: (event) => request('/events', { body: event }),
  session: () => request('/session'),
};

const RETRY_DELAY = 5000;

/**
 * Отправляет события студента по порядку. Если связи нет — держит их в очереди
 * и повторяет, поэтому короткий обрыв сети не теряет попытки.
 */
export class EventReporter {
  constructor({ onConnection, onExpired, onClosed }) {
    this.queue = [];
    this.sending = false;
    this.onConnection = onConnection;
    this.onExpired = onExpired;
    this.onClosed = onClosed;
  }

  send(event) {
    this.queue.push(event);
    this.flush();
  }

  async flush() {
    if (this.sending) return;
    this.sending = true;
    while (this.queue.length) {
      try {
        await api.sendEvent(this.queue[0]);
        this.queue.shift();
        this.onConnection(true);
      } catch (error) {
        if (error.closed) {
          this.queue = [];
          this.onClosed();
          break;
        }
        if (error.status === 401) {
          this.queue = [];
          this.onExpired();
          break;
        }
        if (error.status >= 400) {
          this.queue.shift(); // сервер отверг событие — повтор не поможет
          continue;
        }
        this.onConnection(false);
        this.sending = false;
        setTimeout(() => this.flush(), RETRY_DELAY);
        return;
      }
    }
    this.sending = false;
  }
}
