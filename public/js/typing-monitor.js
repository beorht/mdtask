// Учёт того, как набирается код в практических работах (HTML, CSS, тренажёр Emmet): по одному символу с клавиатуры,
// развёртыванием Emmet, автоматически редактором (закрывающая скобка, отступ) или крупными готовыми кусками.
// Сводка уходит на сервер вместе с попыткой; признаки «не руками» считает сервер (src/lib/typing-check.js).
// Используется страницей CSS (public/js/css-course.js, window.TypingMonitor) и клиентом Emmet/HTML (emmet/src, import).
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TypingMonitor = api.TypingMonitor;
})(typeof window !== 'undefined' ? window : null, () => {
  const BIG_INSERT = 12; // столько символов за одно изменение руками не напечатать
  const PAUSE = 2000; // интервалы длиннее — паузы, в темп набора не входят
  const ACTIVE_GAP = 5000;

  class TypingMonitor {
    constructor(now = () => Date.now()) {
      this.now = now;
      this.reset(0);
    }

    /** Новое задание; restored — сколько символов уже было в редакторе (черновик). */
    reset(restored = 0) {
      this.restored = restored;
      this.typed = 0;
      this.emmet = 0;
      this.auto = 0;
      this.other = 0;
      this.deletes = 0;
      this.undos = 0;
      this.bigInserts = 0;
      this.biggest = 0;
      this.intervals = [];
      this.activeMs = 0;
      this.last = null;
    }

    /** kind: type | emmet | auto | delete | undo | other; inserted — сколько символов добавлено. */
    record(kind, inserted = 0) {
      const at = this.now();
      if (this.last !== null) {
        const gap = at - this.last;
        if (gap < ACTIVE_GAP) this.activeMs += gap;
        if (kind === 'type' && this.lastKind === 'type' && gap < PAUSE) this.intervals.push(gap);
      }
      this.last = at;
      this.lastKind = kind;
      if (kind === 'type') this.typed += inserted;
      else if (kind === 'emmet') this.emmet += inserted;
      else if (kind === 'auto') this.auto += inserted;
      else if (kind === 'delete') this.deletes += 1;
      else if (kind === 'undo') this.undos += 1;
      else {
        this.other += inserted;
        if (inserted > BIG_INSERT) {
          this.bigInserts += 1;
          this.biggest = Math.max(this.biggest, inserted);
        }
      }
    }

    /** Сводка для сервера. */
    summary(finalLength) {
      const n = this.intervals.length;
      const mean = n ? this.intervals.reduce((a, b) => a + b, 0) / n : 0;
      const sd = n ? Math.sqrt(this.intervals.reduce((a, b) => a + (b - mean) ** 2, 0) / n) : 0;
      // Медиана и разброс относительно неё: редкие длинные паузы (обновление предпросмотра, раздумье) на них почти
      // не влияют, поэтому ровный темп программы-«автонабора» виден и в «дрожащем» редакторе.
      const sorted = [...this.intervals].sort((a, b) => a - b);
      const median = n ? sorted[Math.floor(n / 2)] : 0;
      const dev = n ? [...sorted.map((x) => Math.abs(x - median))].sort((a, b) => a - b)[Math.floor(n / 2)] : 0;
      return {
        final: finalLength,
        restored: this.restored,
        typed: this.typed,
        emmet: this.emmet,
        auto: this.auto,
        other: this.other,
        deletes: this.deletes,
        undos: this.undos,
        bigInserts: this.bigInserts,
        biggest: this.biggest,
        keys: n,
        meanMs: Math.round(mean),
        cv: n ? Math.round((sd / mean) * 1000) / 1000 : null,
        medianMs: median,
        rcv: n && median ? Math.round((dev / median) * 1000) / 1000 : null,
        activeMs: this.activeMs,
      };
    }
  }

  return { TypingMonitor, BIG_INSERT };
});
