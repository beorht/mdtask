import { PreviewFrame } from '../components/PreviewFrame.js';

const VIEWS = { clean: 'Браузер', boxes: 'Схема' };

/**
 * Левая половина окна практической работы HTML (по образцу заданий на контейнеры EmmetEmulator):
 * сверху — как выглядит код ученика (обновляется при наборе), снизу — как должно выглядеть.
 * Код образца не показывается. «Схема» рисует обе страницы коробками с метками тегов, id и class.
 */
export class TargetPanel {
  constructor(root) {
    this.view = 'clean';
    this.studentFrame = new PreviewFrame({ title: 'Как выглядит ваш код', variant: this.view });
    this.targetFrame = new PreviewFrame({ title: 'Как должно выглядеть', variant: this.view });

    root.innerHTML = `
      <header class="panel-head">
        <div class="panel-heading">
          <p class="eyebrow">Образец</p>
          <h2 class="panel-title" id="target-title">Что должно получиться</h2>
        </div>
        <div class="view-switch" role="group" aria-label="Вид">
          ${Object.entries(VIEWS).map(([id, name]) => `
            <button class="view-tab" type="button" data-view="${id}" aria-pressed="${id === this.view}">${name}</button>`).join('')}
        </div>
      </header>
      <div class="target-body">
        <figure class="target-pane render-student">
          <figcaption><span>Ваш код</span><span class="pane-note">обновляется, пока вы печатаете</span></figcaption>
        </figure>
        <figure class="target-pane render-target">
          <figcaption><span>Как должно выглядеть</span></figcaption>
        </figure>
      </div>
    `;

    this.viewSwitch = root.querySelector('.view-switch');
    root.querySelector('.render-student').append(this.studentFrame.element);
    root.querySelector('.render-target').append(this.targetFrame.element);
    this.viewSwitch.addEventListener('click', (event) => {
      const tab = event.target.closest('[data-view]');
      if (tab) this.setView(tab.dataset.view);
    });
  }

  setView(view) {
    this.view = view;
    for (const tab of this.viewSwitch.querySelectorAll('[data-view]')) {
      tab.setAttribute('aria-pressed', String(tab.dataset.view === view));
    }
    this.studentFrame.setVariant(view);
    this.targetFrame.setVariant(view);
  }

  load(exercise) {
    this.targetFrame.render(exercise.expectedHtml);
    this.showStudent('');
  }

  /** Вид кода ученика — вызывается редактором при каждом изменении. */
  showStudent(code) {
    this.studentFrame.render(code);
  }
}
