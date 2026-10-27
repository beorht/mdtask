# Функции высшего порядка и декораторы

В Python функция — такое же значение, как число или строка: её можно положить в переменную, передать в другую функцию
и вернуть из функции.

```python run
def shout(text):
    return text.upper() + "!"

action = shout
print(action("привет"))
```

## Функции высшего порядка

**Функция высшего порядка** принимает функцию как аргумент или возвращает её. Встроенные примеры:

| Функция | Что делает | Пример |
| --- | --- | --- |
| `map(f, seq)` | применяет `f` к каждому элементу | `list(map(int, ["1", "2"]))` |
| `filter(f, seq)` | оставляет элементы, где `f` даёт `True` | `list(filter(str.isdigit, ["a", "1"]))` |
| `sorted(seq, key=f)` | сортирует по значению `f(x)` | `sorted(words, key=len)` |

## lambda

`lambda x: x * 2` — короткая функция без имени, для случаев «один раз и сразу»:

```python run
nums = [3, -7, 1, -2]
print(sorted(nums, key=lambda x: abs(x)))
print(list(filter(lambda x: x > 0, nums)))
```

## Функция, возвращающая функцию (замыкание)

```python run
def make_multiplier(k):
    def multiply(x):
        return x * k
    return multiply

triple = make_multiplier(3)
print(triple(5), triple(10))
```

Внутренняя функция «помнит» `k` из внешней — это называется **замыканием**.

## Декораторы

**Декоратор** — функция, которая принимает функцию и возвращает её «улучшенную» версию: с логированием, проверками,
подсчётом вызовов. Запись `@decor` над `def` — то же самое, что `f = decor(f)`.

```python run
def logged(func):
    def wrapper(*args):
        print("вызов", func.__name__, args)
        result = func(*args)
        print("результат", result)
        return result
    return wrapper

@logged
def add(a, b):
    return a + b

add(2, 3)
```

`wrapper(*args, **kwargs)` принимает любые аргументы и передаёт их исходной функции — так декоратор подходит к любой
функции. Готовые декораторы стандартной библиотеки: `functools.lru_cache` (запоминание результатов), `@property`,
`@staticmethod` (о них — в уроках про классы).
