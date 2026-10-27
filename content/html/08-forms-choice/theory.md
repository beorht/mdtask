# Формы: выбор и группы

Не всё вводят с клавиатуры: часто нужно выбрать один вариант, отметить несколько, выбрать из списка или написать
длинный текст.

## Переключатели radio — один из нескольких

`<input type="radio">` — круглый переключатель. Переключатели одной группы получают **одинаковый** `name`: тогда
выбрать можно только один. `value` — что уйдёт на сервер. `checked` — выбран заранее.

```example
<p>Размер:</p>
<input type="radio" id="s" name="size" value="s"><label for="s">S</label>
<input type="radio" id="m" name="size" value="m" checked><label for="m">M</label>
```

Подпись можно не связывать через `for`, а **обернуть** ею переключатель — так тоже работает:

```example
<label><input type="radio" name="pay" value="card"> Картой</label>
<label><input type="radio" name="pay" value="cash"> Наличными</label>
```

## Флажки checkbox — несколько сразу

`<input type="checkbox">` — квадратный флажок «да / нет». Можно отметить сколько угодно. `checked` — отмечен
заранее.

```example
<label><input type="checkbox" name="news" checked> Присылать новости</label>
```

## Список выбора select

`<select>` — выпадающий список, пункты — `<option>`. У каждого пункта `value` и текст. `selected` — выбран заранее.

```example
<label for="lang">Язык</label>
<select id="lang" name="lang">
  <option value="uz">Узбекский</option>
  <option value="ru" selected>Русский</option>
</select>
```

Пункты можно разбить на группы `<optgroup label="Название группы">`.

```example
<select name="car">
  <optgroup label="Седаны">
    <option value="cobalt">Cobalt</option>
  </optgroup>
  <optgroup label="Кроссоверы">
    <option value="tracker">Tracker</option>
  </optgroup>
</select>
```

## Многострочный текст textarea

`<textarea>` — поле для длинного текста: отзыв, комментарий. Это парный тег, текст между тегами — значение по
умолчанию. Размер — `rows` (строк) и `cols` (символов в строке).

```example
<textarea name="bio" rows="3" cols="30">Расскажите о себе</textarea>
```

## Группа полей: fieldset и legend

`<fieldset>` объединяет связанные поля в рамку, `<legend>` — её заголовок. Особенно нужен для переключателей:
программа для незрячих зачитает вопрос перед вариантами.

```example
<fieldset>
  <legend>Доставка</legend>
  <label><input type="radio" name="ship" value="home"> Курьером</label>
  <label><input type="radio" name="ship" value="self"> Самовывоз</label>
</fieldset>
```

## Коротко

- Один вариант — `radio` с общим `name`; несколько — `checkbox`; выбор заранее — `checked`.
- Список — `<select>` + `<option value>`, выбран заранее — `selected`, группы — `<optgroup label>`.
- Длинный текст — `<textarea rows cols>`; группа полей — `<fieldset>` + `<legend>`.
