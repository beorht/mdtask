### План внедрения цветовой палитры

**Цель:** перенести атмосферу референса — тёмный фон + насыщенный blue/purple/pink/orange gradient — в существующий интерфейс, сохранив читаемость учебной платформы.

#### 1. Базовые цвета

* `Background` — почти чёрный `#0B0C12`
* `Surface` — тёмно-синий/фиолетовый `#121321`
* `Surface Elevated` — `#191A2A`
* `Text Primary` — `#F5F5F7`
* `Text Secondary` — `#A7A8B5`
* `Border` — `rgba(255,255,255,.10)`

#### 2. Градиент как главный акцент

Использовать плавный градиент:

```text
Blue → Purple → Pink → Orange
#315BFF → #6D2BFF → #D20A8A → #FF7800
```

Не применять его ко всем элементам. Основные места:

* Header;
* активный пункт Sidebar;
* Progress;
* CTA-кнопки;
* Hero/Dashboard;
* декоративные фоновые элементы.

#### 3. Фоновое свечение

Добавить несколько больших `radial-gradient`:

```text
top-left     → blue
top-center   → pink/purple
top-right    → orange
center       → dark
```

Снизить opacity примерно до `15–30%`, чтобы интерфейс не выглядел как лендинг.

#### 4. Header

Сделать прозрачный/полупрозрачный:

```text
background: rgba(15, 15, 25, .65)
backdrop-filter: blur(20px)
border: 1px solid rgba(255,255,255,.08)
```

Активный пункт меню — subtle pink/purple glow.

#### 5. Sidebar

Оставить преимущественно тёмным.

Активный раздел:

```text
background: linear-gradient(
  90deg,
  rgba(49,91,255,.20),
  rgba(210,10,138,.12)
);
border-left: 2px solid #7B5CFF;
```

Статусы `✓ / ● / ○` оставить преимущественно нейтральными, чтобы градиент не конкурировал с прогрессом.

#### 6. Кнопки

Главная CTA:

```text
background: linear-gradient(90deg, #315BFF, #8B3DFF);
```

Hover:

```text
box-shadow: 0 0 25px rgba(80,70,255,.35);
```

Вторичные кнопки — glass/dark style.

#### 7. Карточки

Использовать:

```text
background: rgba(255,255,255,.04);
border: 1px solid rgba(255,255,255,.08);
border-radius: 12–16px;
```

При hover — небольшой purple/blue glow.

#### 8. Code Editor

Редактор оставить почти чёрным:

```text
#0A0B10
```

Градиенты использовать только для:

* активной вкладки;
* focus state;
* кнопки запуска;
* небольших accent-элементов.

#### 9. Progress

Сделать одним из основных визуальных акцентов:

```text
████████████░░░
Blue → Purple → Pink
```

Orange можно использовать только на финальной части/достижении 100%.

#### 10. Result / Validation

Сохранить семантические цвета:

```text
✓ Success → #35D399
✕ Error   → #FF5C7A
⚠ Warning → #F5B942
ⓘ Info    → #5EA7FF
```

**Не заменять их градиентом**, поскольку цвет должен быстро передавать смысл состояния.

---

### Итоговая визуальная формула

```text
        BLUE
         ↓
┌─────────────────────────────┐
│      BLUE → PURPLE → PINK   │  ← glow
│                             │
│        DARK UI              │
│                             │
│  Sidebar │ Content │ Editor │
│                             │
│      ↓              ↓       │
│   Purple          Blue      │
│   accent          CTA       │
│                             │
│        PINK → ORANGE        │
└─────────────────────────────┘
```

**Главный принцип:** примерно **80% интерфейса — тёмный нейтральный UI, 15% — blue/purple accents, 5% — pink/orange glow**. Так референс задаст характер платформы, но не ухудшит читаемость документации и SQL-редактора.

