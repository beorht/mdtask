// Опциональное временно́е окно задания со сдачей (assignments.opens_at / closes_at, ISO UTC).
// NULL/NULL — окна нет: задание доступно сразу и закрывается по due_date (обычное поведение).
// Оба заданы — жёсткое окно (как на экзамене): до opens_at текст и загрузка скрыты, после
// closes_at приём закрыт. Время в интерфейсе показываем в +05 (Asia/Tashkent).

function fmt(iso) {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

// Состояние окна задания для момента now.
function assignmentWindow(assignment, now = Date.now()) {
  const opensAt = assignment && assignment.opensAt ? assignment.opensAt : null;
  const closesAt = assignment && assignment.closesAt ? assignment.closesAt : null;
  if (!opensAt && !closesAt) {
    return { hasWindow: false, before: false, open: true, after: false, opensAt: null, closesAt: null, opensText: null, closesText: null };
  }
  const o = opensAt ? Date.parse(opensAt) : null;
  const c = closesAt ? Date.parse(closesAt) : null;
  const before = o !== null && now < o;
  const after = c !== null && now > c;
  return {
    hasWindow: true,
    before,
    after,
    open: !before && !after,
    opensAt,
    closesAt,
    opensText: opensAt ? fmt(opensAt) : null,
    closesText: closesAt ? fmt(closesAt) : null,
  };
}

// Удобный конструктор ISO-границ из даты (ГГГГ-ММ-ДД) и часов в поясе +05.
// hoursTashkent — например 9 и 14 → 04:00Z и 09:00Z того же дня.
function windowFromDate(date, openHour, closeHour) {
  const iso = (h) => {
    const utcH = h - 5; // +05 → UTC
    const hh = String(((utcH % 24) + 24) % 24).padStart(2, '0');
    // В наших окнах 9..14 (+05) utcH = 4..9 — переход через полночь не нужен.
    return `${date}T${hh}:00:00.000Z`;
  };
  return { opensAt: iso(openHour), closesAt: iso(closeHour) };
}

module.exports = { assignmentWindow, windowFromDate, fmt };
