# Задание №4. Поиск и правка конфигурационных файлов

Ты — новый администратор учебного сервера `seclab` (Debian 12). На нём работают SSH, веб-сервер
Apache с PHP и база данных MariaDB. Прошлый администратор оставил настройки небезопасными и не
записал, где лежат конфиги.

Твоя задача — **найти** нужные конфигурационные файлы (`find`, `grep`) и **изменить** в них
параметры, **не открывая файлы в редакторе** (`sed -i`, `tee`). Редакторов в терминале нет.

## Что нужно настроить

Значения у каждого студента свои — используй именно эти:

1. **SSH:** сервер должен принимать подключения на порту **{ssh_port}** (параметр `Port`).
2. **SSH:** запретить вход пользователю root (`PermitRootLogin no`).
3. **SSH:** отключить вход по паролю (`PasswordAuthentication no`).
   Подсказка: проверь, не задаётся ли этот параметр ещё где-нибудь, — `sshd` берёт **первое**
   встреченное значение.
4. **Apache:** веб-сервер должен слушать порт **{apache_port}** (директива `Listen`; порт 443 для HTTPS не трогай).
5. **Apache:** сайт по умолчанию должен работать на том же порту **{apache_port}** (`<VirtualHost *:порт>`).
6. **Apache:** не раскрывать версию и ОС сервера: `ServerTokens Prod` и `ServerSignature Off`.
7. **MariaDB:** принимать подключения только локально: `bind-address = 127.0.0.1`.
8. **PHP:** максимальный размер загружаемого через сайт файла — **{upload_max}**
   (`upload_max_filesize`). Важно: PHP для веб-сервера и PHP для командной строки настраиваются
   в **разных** файлах.

## Правила

- Конфиги принадлежат root: читать большинство можно и так, а менять — через `sudo`.
- Меняй только рабочие конфиги сервисов. Резервные копии, шаблоны, примеры и конфиг
  SSH-**клиента** трогать не нужно — это тоже проверяется.
- Перед правкой посмотри результат без `-i` (`sed 's/было/стало/' файл`), после правки — проверь
  `grep`.

## Подсказки: как искать файлы через find

Общая форма: `find ГДЕ УСЛОВИЯ ДЕЙСТВИЕ`. Конфиги почти всегда лежат в `/etc`, поэтому начинай
поиск оттуда, а не с `/`.

| Что нужно | Команда |
|---|---|
| файл по точному имени | `find /etc -name sshd_config` |
| по маске (кавычки обязательны!) | `find /etc -name "*.conf"` |
| без учёта регистра | `find /etc -iname "*SSH*"` |
| только файлы / только каталоги / только ссылки | `-type f` / `-type d` / `-type l` |
| по части пути | `find /etc -path "*apache2*" -name "*.conf"` |
| не глубже N уровней | `find /etc -maxdepth 2 -name "*.conf"` |
| исключить лишнее (`!` — «НЕ») | `find / -name "*.conf" ! -path "/usr/*"` |
| несколько имён сразу (`-o` — «ИЛИ») | `find /etc \( -name "*.cnf" -o -name "*.ini" \)` |
| спрятать «Отказано в доступе» | `find / -name php.ini 2>/dev/null` |
| искать и в закрытых каталогах | `sudo find / -name "*.cnf"` |
| файлы, внутри которых есть слово | `find /etc -type f -exec grep -l "bind-address" {} +` |
| показать, куда ведёт ссылка | `find /etc/apache2/sites-enabled -type l -printf "%p -> %l\n"` |
| изменённые позже другого файла | `find /etc -type f -newer /etc/hostname` |
| подробно, как `ls -l` | `find /etc/ssh -type f -ls` |

Подсказки по пунктам:

- **1–3 (SSH).** `find /etc -name "ssh*config*"` найдёт **два** файла: `sshd_config` — сервер
  (**d** — daemon), `ssh_config` — клиент, его не трогай. Есть ещё каталог с дополнительными
  настройками: `find /etc/ssh -type f -name "*.conf"`. А `grep -rn PasswordAuthentication /etc/ssh`
  покажет все места, где задан параметр.
- **4–5 (Apache).** Порты задаются в отдельном файле: `find /etc/apache2 -name "ports*"`. Включённые
  сайты — это ссылки в `sites-enabled`, а настоящие файлы — в `sites-available` (смотри `-type l`
  и `-printf "%l"` в таблице выше).
- **6 (Apache).** Ищи файл по смыслу: `find /etc/apache2 -iname "*secur*"`.
- **7 (MariaDB).** Файлы MariaDB/MySQL заканчиваются на `.cnf`: `find /etc/mysql -name "*.cnf"`.
  Найди, где упоминается `bind-address`, через `-exec grep -l ... {} +`, а затем `grep -n` покажет,
  в каком файле строка рабочая, а в каком закомментирована (`#`).
- **8 (PHP).** `find / -name php.ini 2>/dev/null` найдёт несколько файлов — посмотри на путь:
  нужен тот, что для веб-сервера (`apache2`), а не для командной строки (`cli`).
- **Ловушки.** Сначала найди то, что менять не надо:
  `find / \( -name "*.bak" -o -name "*.old" -o -name "*-production" -o -name "*-development" \) 2>/dev/null`.

## Полезное

- `help` — список команд, `man find`, `man grep`, `man sed` — краткие справки.
- `check` — проверить, какие пункты уже выполнены. Задание засчитывается автоматически, как
  только выполнены все 8 пунктов.

---

## Для преподавателя

Раздел не копируется студентам (генератор отрезает всё начиная с этого заголовка).

```bash
python3 ib/ctf/configs/generate_configs.py --group IB          # выдать задание группе
python3 ib/checks/task4_check.py --group IB --update-db         # проверить всех и записать прогресс
```

Эталонное решение (значения студента — в `/admin/ib` или в `ib_config_tasks.params`):

```bash
sudo sed -i 's/^#Port 22$/Port {ssh_port}/' /etc/ssh/sshd_config
sudo sed -i 's/^PermitRootLogin .*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/^PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config.d/50-cloud-init.conf
sudo sed -i 's/^Listen 80$/Listen {apache_port}/' /etc/apache2/ports.conf
sudo sed -i 's/<VirtualHost \*:80>/<VirtualHost *:{apache_port}>/' /etc/apache2/sites-available/000-default.conf
sudo sed -i -e 's/^ServerTokens OS/ServerTokens Prod/' -e 's/^ServerSignature On/ServerSignature Off/' /etc/apache2/conf-available/security.conf
sudo sed -i -E 's/^(bind-address\s*=\s*).*/\1127.0.0.1/' /etc/mysql/mariadb.conf.d/50-server.cnf
sudo sed -i 's/^upload_max_filesize = .*/upload_max_filesize = {upload_max}/' /etc/php/8.2/apache2/php.ini
```
