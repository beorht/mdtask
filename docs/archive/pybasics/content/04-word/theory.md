## Satr — belgilar ketma-ketligi

Satr belgilardan iborat: harflar, raqamlar, bo‘sh joylar, tinish belgilari. Har bir belgining **raqami — indeksi** bor. Raqamlash **noldan** boshlanadi.

`"daraxt"` satri uchun:

| Belgi | d | a | r | a | x | t |
|---|---|---|---|---|---|---|
| Indeks | 0 | 1 | 2 | 3 | 4 | 5 |
| Oxiridan indeks | −6 | −5 | −4 | −3 | −2 | −1 |

Belgi indeks bo‘yicha satr yoki o‘zgaruvchi nomidan keyin kvadrat qavslar bilan olinadi: agar `s = "daraxt"` bo‘lsa, `s[1]` — bu `"a"`. Manfiy indeks oxiridan sanaydi: `s[-1]` — oxirgi belgi, `s[-2]` — oxiridan ikkinchisi. Shu tarzda satr uzunligini bilmasdan oxirgi belgilarni olish qulay.

Indeks belgilar sonidan katta bo‘lsa, `IndexError: string index out of range` xatosi chiqadi.

## Satr uzunligi

`len()` funksiyasi satrning **uzunligini** — undagi belgilar sonini qaytaradi. Bo‘sh joy va belgilar ham hisoblanadi: `"ha, yo‘q"` satrining uzunligi 8 ga teng. `len()` natijasi — butun son (`int`).

Raqamlash noldan boshlangani uchun uzunligi 6 bo‘lgan satrning oxirgi indeksi — 5.

## Satr metodlari

**Metod** — satrning o‘zi bajara oladigan amal. Metod satr yoki o‘zgaruvchi nomidan keyin nuqta orqali, oxirida qavslar bilan chaqiriladi.

| Metod | Nima qaytaradi | `"Daraxt"` uchun |
|---|---|---|
| `.upper()` | barcha harflar katta | `"DARAXT"` |
| `.lower()` | barcha harflar kichik | `"daraxt"` |
| `.capitalize()` | birinchi harf katta, qolganlari kichik | `"Daraxt"` |
| `.count("a")` | qism satr necha marta uchraydi | `2` |

Metodlar lotin va kirill harflari bilan ham ishlaydi.

Muhim: satrlar **o‘zgarmaydi**. Metod asl satrni o‘zgartirmaydi, balki yangi satr qaytaradi. Natija keyin kerak bo‘lsa, uni darhol chiqaring yoki o‘zgaruvchiga saqlang.
