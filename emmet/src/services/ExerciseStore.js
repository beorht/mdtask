/**
 * Хранит план студента, текущий индекс и решённые задания. План — разделы по порядку (section):
 * lesson — обучение с демонстрацией и подсказками, emmet — работы с условием, blind — работы без подсказок.
 * Ожидаемый HTML (expectedHtml) присылает сервер; сокращения-эталоны практических работ в браузер не попадают.
 */
export const SECTION_LABEL = { lesson: 'Обучение', emmet: 'Практическая работа', blind: 'Без подсказок', html: 'Задание' };

export class ExerciseStore {
  constructor(list) {
    this.list = list;
    this.index = 0;
    this.solved = new Set();
    this.listeners = new Set();
  }

  get current() {
    return this.list[this.index];
  }

  get count() {
    return this.list.length;
  }

  /** Номер работы внутри её раздела и размер раздела. */
  positionOf(exercise = this.current) {
    const group = this.list.filter((item) => item.section === exercise.section);
    return { number: group.indexOf(exercise) + 1, total: group.length };
  }

  /** С чего продолжить: первая нерешённая работа. */
  resumeIndex() {
    const first = this.list.findIndex((item) => !this.solved.has(item.id));
    return first === -1 ? 0 : first;
  }

  select(index) {
    const next = Math.max(0, Math.min(this.count - 1, index));
    if (next === this.index) return;
    this.index = next;
    this.emit();
  }

  markSolved(id) {
    if (this.solved.has(id)) return;
    this.solved.add(id);
    this.emit();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit() {
    for (const listener of this.listeners) listener(this);
  }
}
