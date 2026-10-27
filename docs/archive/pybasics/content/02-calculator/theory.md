## Sonlar: int va float

Python’da sonlarning ikki asosiy turi bor:

| Tur | Nimani saqlaydi | Qiymat misollari |
|---|---|---|
| `int` | butun son | `0`, `42`, `-15` |
| `float` | kasr son (nuqta bilan) | `3.14`, `-0.5`, `2.0` |

Kasr qismi vergul bilan emas, **nuqta** bilan yoziladi. `2.0` soni ma’nosi bo‘yicha butun bo‘lsa ham, `float` turiga kiradi.

Istalgan qiymatning turini `type()` funksiyasi bilan bilish mumkin.

## Satrdan songa

`input()` satr qaytaradi. `"12"` satrini son bilan qo‘shib bo‘lmaydi: Python uchun bu ikki belgidan iborat matn. Avval uni **o‘zgartirish** kerak:

| Funksiya | Nima qiladi | Misol |
|---|---|---|
| `int(...)` | raqamlardan iborat satr → butun son | `int("12")` natijasi `12` |
| `float(...)` | satr → kasr son | `float("2.5")` natijasi `2.5` |
| `str(...)` | son → satr | `str(12)` natijasi `"12"` |

Ikki satr qo‘shilsa, ular ulanadi: `"12" + "3"` natijasi `15` emas, `"123"`. Bu ko‘p uchraydigan xato — kiritilgan ma’lumotni o‘zgartirishni unutmang.

## Arifmetika

| Belgi | Amal | Misol | Natija |
|---|---|---|---|
| `+` | qo‘shish | `9 + 4` | `13` |
| `-` | ayirish | `9 - 4` | `5` |
| `*` | ko‘paytirish | `9 * 4` | `36` |
| `/` | bo‘lish | `9 / 4` | `2.25` |
| `//` | butun bo‘lish | `9 // 4` | `2` |
| `%` | bo‘lishdagi qoldiq | `9 % 4` | `1` |
| `**` | darajaga ko‘tarish | `9 ** 2` | `81` |

E’tibor bering:

- `/` **doim** `float` beradi, hatto qoldiqsiz bo‘linsa ham: `8 / 4` — bu `2.0`.
- `//` kasr qismini tashlab yuboradi va **pastga**, kichik son tomonga yaxlitlaydi. Manfiy sonlarda bu sezilarli: `-9 // 4` natijasi `-3`, chunki −3 soni −2,25 dan kichik.
- Nolga bo‘lish mumkin emas: `ZeroDivisionError` xatosi chiqadi.

## Bitta print() da bir nechta qiymat

`print()` ga vergul orqali bir nechta qiymat berish mumkin: satrlar, sonlar, ifodalar. Ular bitta qatorda **bo‘sh joy bilan ajratib** chiqariladi. Bunda sonlarni satrga o‘zgartirish shart emas.
