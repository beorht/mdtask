"""
Учебный requests курса «Начальный Python»: те же функции и объекты, что у настоящей библиотеки requests, но ответы
даёт учебный API сайта прямо здесь, без интернета (в классе его нет), — одинаково при каждом запуске, поэтому
программу можно проверить тестами. Адрес API: http://api.edu

  GET  /cities                         список городов
  GET  /weather?city=<город>           погода (400 — нет параметра, 404 — нет города)
  GET  /rates?base=<валюта>            курсы валют — только с заголовком X-API-Key (401 — нет ключа или он неверный)
  GET  /students/<id>                  студент по номеру (404 — нет такого)
  POST /notes      json={"text": …}    создать заметку: 201 и {"id", "text"} (400 — нет текста)
  GET  /notes                          заметки, созданные в этом запуске программы
"""

import json as _json

API_HOST = 'http://api.edu'
API_KEYS = {'edu-key-2026', 'demo-key-123'}

CITIES = {
    'Ташкент': {'temp': 18, 'condition': 'солнечно', 'humidity': 35},
    'Самарканд': {'temp': 15, 'condition': 'облачно', 'humidity': 48},
    'Бухара': {'temp': 21, 'condition': 'солнечно', 'humidity': 22},
    'Нукус': {'temp': 9, 'condition': 'ветрено', 'humidity': 40},
    'Фергана': {'temp': 16, 'condition': 'дождь', 'humidity': 81},
    'Андижан': {'temp': 14, 'condition': 'облачно', 'humidity': 60},
}
RATES = {
    'USD': {'UZS': 12750.0, 'EUR': 0.92, 'RUB': 81.5, 'KZT': 485.0},
    'EUR': {'UZS': 13860.0, 'USD': 1.087, 'RUB': 88.6, 'KZT': 527.2},
    'RUB': {'UZS': 156.4, 'USD': 0.0123, 'EUR': 0.0113, 'KZT': 5.95},
}
STUDENTS = {
    1: {'id': 1, 'name': 'Азиз', 'group': 'IB', 'grades': [5, 4, 5]},
    2: {'id': 2, 'name': 'Нигора', 'group': 'WEB', 'grades': [5, 5, 4, 5]},
    3: {'id': 3, 'name': 'Тимур', 'group': 'IB', 'grades': [3, 4, 4]},
    4: {'id': 4, 'name': 'Мадина', 'group': 'WEB', 'grades': [4]},
}
_notes = []


class RequestException(Exception):
    pass


class HTTPError(RequestException):
    def __init__(self, message, response=None):
        super().__init__(message)
        self.response = response


class ConnectionError(RequestException):  # noqa: A001 — так называется и в настоящем requests
    pass


class Timeout(RequestException):
    pass


class _Exceptions:
    RequestException = RequestException
    HTTPError = HTTPError
    ConnectionError = ConnectionError
    Timeout = Timeout


exceptions = _Exceptions()

REASONS = {200: 'OK', 201: 'Created', 400: 'Bad Request', 401: 'Unauthorized', 404: 'Not Found', 405: 'Method Not Allowed'}


class Response:
    def __init__(self, status_code, data, url):
        self.status_code = status_code
        self.url = url
        self.reason = REASONS.get(status_code, '')
        self.text = _json.dumps(data, ensure_ascii=False)
        self.content = self.text.encode('utf-8')
        self.headers = {'Content-Type': 'application/json'}
        self.ok = status_code < 400

    def json(self):
        return _json.loads(self.text)

    def raise_for_status(self):
        if not self.ok:
            raise HTTPError(f'{self.status_code} Client Error: {self.reason} for url: {self.url}', response=self)

    def __repr__(self):
        return f'<Response [{self.status_code}]>'


def _split(url, params):
    if not url.startswith(API_HOST):
        raise ConnectionError(f'Нет связи с {url}: в учебной сети доступен только {API_HOST}')
    rest = url[len(API_HOST):] or '/'
    path, _, query = rest.partition('?')
    args = {}
    for pair in filter(None, query.split('&')):
        key, _, value = pair.partition('=')
        args[key] = value
    for key, value in (params or {}).items():
        args[key] = str(value)
    shown = url if not params else url + ('&' if '?' in url else '?') + '&'.join(f'{k}={v}' for k, v in params.items())
    return path.rstrip('/') or '/', args, shown


def _key_ok(headers):
    for name, value in (headers or {}).items():
        if name.lower() == 'x-api-key' and value in API_KEYS:
            return True
    return False


def request(method, url, params=None, json=None, headers=None, timeout=None, data=None):
    method = method.upper()
    path, args, shown = _split(url, params)
    if path == '/cities' and method == 'GET':
        return Response(200, sorted(CITIES), shown)
    if path == '/weather' and method == 'GET':
        city = args.get('city')
        if not city:
            return Response(400, {'error': 'нужен параметр city'}, shown)
        if city not in CITIES:
            return Response(404, {'error': f'город {city} не найден'}, shown)
        return Response(200, {'city': city, **CITIES[city]}, shown)
    if path == '/rates' and method == 'GET':
        if not _key_ok(headers):
            return Response(401, {'error': 'нужен ключ API в заголовке X-API-Key'}, shown)
        base = args.get('base', 'USD').upper()
        if base not in RATES:
            return Response(404, {'error': f'валюта {base} не найдена'}, shown)
        return Response(200, {'base': base, 'rates': RATES[base]}, shown)
    if path.startswith('/students/') and method == 'GET':
        try:
            sid = int(path.split('/')[2])
        except ValueError:
            return Response(400, {'error': 'номер студента — целое число'}, shown)
        if sid not in STUDENTS:
            return Response(404, {'error': f'студент {sid} не найден'}, shown)
        return Response(200, STUDENTS[sid], shown)
    if path == '/notes':
        if method == 'GET':
            return Response(200, list(_notes), shown)
        if method == 'POST':
            if not isinstance(json, dict) or not str(json.get('text', '')).strip():
                return Response(400, {'error': 'нужно поле text'}, shown)
            note = {'id': len(_notes) + 1, 'text': json['text']}
            _notes.append(note)
            return Response(201, note, shown)
        return Response(405, {'error': 'метод не поддерживается'}, shown)
    return Response(404, {'error': f'нет такого адреса: {path}'}, shown)


def get(url, params=None, **kwargs):
    return request('GET', url, params=params, **kwargs)


def post(url, json=None, **kwargs):
    return request('POST', url, json=json, **kwargs)
