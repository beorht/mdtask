import { escapeHtml, highlightAbbreviation } from '../services/highlight.js';
import { icons } from './icons.js';

/**
 * Условие работы. В обучении — ещё постепенно открываемые подсказки, последняя показывает ответ;
 * каждая открытая подсказка уходит в статистику (onHint). У работ без подсказок условия нет — только образец.
 */
export class ExerciseInstructions {
  constructor(root, { onHint = () => {} } = {}) {
    this.root = root;
    this.onHint = onHint;
  }

  load(exercise) {
    this.exercise = exercise;
    this.revealed = 0;
    this.total = exercise.hints?.length ?? 0;
    this.solutionShown = false;
    const lesson = exercise.section === 'lesson';
    this.root.hidden = !exercise.description;
    this.root.innerHTML = `
      <p class="task-text">${escapeHtml(exercise.description)}</p>
      ${lesson ? `
        <div class="task-tools">
          <button class="btn btn-link hint-btn" type="button">${icons.bulb}<span></span></button>
        </div>
        <ul class="hints" aria-label="Подсказки" aria-live="polite"></ul>` : ''}
    `;
    if (lesson) {
      this.hints = this.root.querySelector('.hints');
      this.hintButton = this.root.querySelector('.hint-btn');
      this.hintButton.addEventListener('click', () => this.revealNext());
      this.updateHintButton();
    }
    this.root.classList.remove('is-entering');
    void this.root.offsetWidth;
    this.root.classList.add('is-entering');
  }

  revealNext() {
    if (this.revealed < this.total) {
      this.addHint(escapeHtml(this.exercise.hints[this.revealed]));
      this.revealed += 1;
      this.onHint({ level: this.revealed });
    } else if (!this.solutionShown) {
      this.solutionShown = true;
      this.addHint(`Решение: <code class="inline-abbr">${highlightAbbreviation(this.exercise.solution)}</code>`, 'is-solution');
      this.onHint({ level: this.total + 1, solution: true });
    }
    this.updateHintButton();
  }

  updateHintButton() {
    const label = this.hintButton.querySelector('span');
    if (this.revealed < this.total) {
      label.textContent = this.revealed ? `Ещё подсказка (${this.revealed}/${this.total})` : 'Подсказка';
    } else {
      label.textContent = 'Показать решение';
      this.hintButton.hidden = this.solutionShown;
    }
  }

  addHint(html, extraClass = '') {
    const item = document.createElement('li');
    item.className = `hint ${extraClass}`.trim();
    item.innerHTML = html;
    this.hints.append(item);
    // Прокручиваем только если подсказки действительно не помещаются.
    if (this.root.scrollHeight > this.root.clientHeight) this.root.scrollTop = this.root.scrollHeight;
  }
}
