# Задание №7. Безопасный удалённый доступ по SSH

Администраторы управляют сервером `seclab` удалённо по SSH. Сейчас служба настроена
небезопасно: можно войти под `root`, вход по паролю разрешён, а подключаться может любой
пользователь с паролем. Ваша задача — привести SSH к политике безопасности компании и
**не потерять при этом собственный доступ**.

Задание состоит из **7 этапов**, их проходят **строго по порядку**.

## Как устроено задание

1. Прочитайте этот материал: в нём всё, что нужно знать, и пошаговый план.
2. Откройте «Практику в терминале» и войдите под своим логином и паролем от платформы.
3. Наберите `task`: появится описание **текущего** этапа (цель, команды, что сделать).
   Все этапы сразу есть в файле `~/TASK.md` (`cat TASK.md`).
4. Проверка запускается автоматически после каждой команды. Когда все пункты выполнены,
   терминал сообщит «Этап N пройден» и откроет следующий. Прогресс показывает `check`.

| Вид пункта | Как проверяется |
|---|---|
| **Команда** | по журналу ваших команд: команда выполнена **после открытия этапа** |
| **Файлы** | по состоянию сервера: ключ добавлен, параметр изменён, служба применила настройки |
| **Вопрос** | ответ командой `answer НОМЕР ОТВЕТ`, например `answer 1.1 2222` |
| **Критично** | администратор (вы) должен всегда иметь возможность войти по ключу |

В учебном терминале можно подключаться по SSH только к этому же серверу (`localhost`).
Удалённый сеанс сразу завершается: проверяется сам факт входа, то есть пустил вас сервер или нет.

## Политика безопасности

| Требование | Параметр `sshd_config` |
|---|---|
| по SSH входят только участники группы `sshadmins` | `AllowGroups sshadmins` |
| только по ключу, вход по паролю запрещён | `PasswordAuthentication no`, `PubkeyAuthentication yes` |
| прямой вход `root` запрещён | `PermitRootLogin no` |
| пустые пароли запрещены | `PermitEmptyPasswords no` |
| не больше 3 попыток за одно подключение | `MaxAuthTries 3` |
| перед изменениями — резервная копия, новый способ входа проверяется **до** отключения старого | — |

## Как устроен SSH на сервере

| Что | Где |
|---|---|
| служба | `ssh.service`, программа `sshd` |
| настройки сервера | `/etc/ssh/sshd_config` и файлы `/etc/ssh/sshd_config.d/*.conf` |
| настройки **клиента** (на сервер не влияют!) | `/etc/ssh/ssh_config` — без буквы `d` |
| ключи пользователя | `~/.ssh/id_ed25519` (закрытый), `~/.ssh/id_ed25519.pub` (открытый) |
| разрешённые ключи для входа | `~/.ssh/authorized_keys` на сервере |
| журнал входов | `/var/log/auth.log` (только root) |

### Какое значение действует

В начале `sshd_config` стоит строка:

```
Include /etc/ssh/sshd_config.d/*.conf
```

Файлы из `sshd_config.d` читаются **раньше** остальной части основного файла. При этом
`sshd` использует **первое** найденное значение параметра, а следующие игнорирует.
Поэтому если в `sshd_config.d/50-cloud-init.conf` написано `PasswordAuthentication yes`,
строка `PasswordAuthentication no` в основном файле ничего не изменит.

Правильный способ узнать **действующие** значения — спросить сам сервер:

```bash
sudo sshd -T | grep -i passwordauthentication
grep -rn PasswordAuthentication /etc/ssh/          # где параметр встречается
```

Исключение — `AllowUsers`, `AllowGroups`, `DenyUsers`, `DenyGroups`: их значения из всех строк
складываются.

### Применение настроек

Правка файла сама по себе **ничего не меняет**: служба работает с настройками, прочитанными
при запуске. Чтобы применить изменения:

```bash
sudo sshd -t                     # 1) проверка: если ничего не вывела — ошибок нет
sudo systemctl reload ssh        # 2) применить без разрыва соединений
systemctl status ssh             # 3) служба должна быть active (running)
```

| Команда | Если в конфигурации ошибка |
|---|---|
| `systemctl reload ssh` | служба **продолжает работать** со старыми настройками |
| `systemctl restart ssh` | служба **останавливается**, удалённый доступ потерян |

Поэтому порядок всегда один: `sshd -t`, потом `reload`.

## Вход по ключу

Пара ключей:
- **закрытый** ключ `~/.ssh/id_ed25519` хранится только у вас, его никому не передают и не копируют на серверы;
- **открытый** ключ `~/.ssh/id_ed25519.pub` можно давать кому угодно. Его дописывают в
  `~/.ssh/authorized_keys` на сервере.

```bash
cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys   # >> — ДОПИСАТЬ, > стёр бы другие ключи
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
ssh -p ПОРТ -i ~/.ssh/id_ed25519 ИМЯ@localhost
```

**StrictModes.** Сервер не доверяет `authorized_keys`, если каталог `~/.ssh` или сам файл
доступны на запись группе или всем (например, права `775`). Тогда ключ отвергается, а в
`/var/log/auth.log` появляется запись `Authentication refused: bad ownership or modes`.
Права должны быть `700` для каталога и `600` для файла.

Клиент `ssh` сначала пробует ключи, потом пароль. Чтобы проверить, разрешён ли ещё вход
**по паролю**, отключите ключи у клиента:

```bash
ssh -p ПОРТ -o PubkeyAuthentication=no ИМЯ@localhost
# ИМЯ@localhost: Permission denied (publickey).   ← пароль сервер больше не принимает
```

`Permission denied (publickey)` значит, что сервер предлагает только вход по ключу.
Подробная причина любого отказа — в журнале сервера: `sudo tail -n 5 /var/log/auth.log`.

## Правка конфигурации без редактора

Интерактивных редакторов в терминале нет. Используйте `sed` и `tee` (как в задании №4):

```bash
# заменить значение параметра
sudo sed -i 's/^PermitRootLogin .*/PermitRootLogin no/' /etc/ssh/sshd_config
# раскомментировать и заменить
sudo sed -i 's/^#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
# дописать новую строку в конец (> без sudo не сработает — поэтому tee)
echo 'AllowGroups sshadmins' | sudo tee -a /etc/ssh/sshd_config
# удалить строку
sudo sed -i '/^Опечатка/d' /etc/ssh/sshd_config
# проверить результат
grep -n -E '^(PermitRootLogin|PasswordAuthentication|AllowGroups)' /etc/ssh/sshd_config
```

## Пошаговый план

### Этап 1. Аудит службы SSH

```bash
systemctl status ssh                     # работает ли служба, какой порт (Listen)
sudo sshd -T | grep -i -E '^(port|permitrootlogin|passwordauthentication)'
grep -rn PasswordAuthentication /etc/ssh/
```

Ответьте: порт службы, текущее значение `PermitRootLogin`, файл, в котором задано
**действующее** значение `PasswordAuthentication`.

### Этап 2. Учётные записи и группы

```bash
getent passwd               # кто может войти: последнее поле — оболочка
getent group sshadmins      # кому вход разрешён по политике
id intern                   # группы пользователя
```

Учётная запись с оболочкой `/bin/bash` и паролем может войти по SSH, пока это не запрещено
настройками. Найдите, кто может войти, хотя по политике не должен.

### Этап 3. Резервная копия и план отката

```bash
sudo cp -r /etc/ssh /etc/ssh.bak
ls -l /etc/ssh.bak /etc/ssh.bak/sshd_config.d
```

Откат, если что-то пошло не так:

```bash
sudo cp /etc/ssh.bak/sshd_config /etc/ssh/sshd_config
sudo cp /etc/ssh.bak/sshd_config.d/50-cloud-init.conf /etc/ssh/sshd_config.d/
sudo sshd -t && sudo systemctl reload ssh
```

### Этап 4. Вход по ключу

Добавьте свой открытый ключ в `authorized_keys`, исправьте права и **проверьте вход по ключу**.
Только после этого переходите к отключению паролей.

### Этап 5. Ужесточение конфигурации

Выполните все требования политики (таблица выше). После каждой правки проверяйте действующие
значения: `sudo sshd -T | grep -i ИМЯ_ПАРАМЕТРА`. Не забудьте про `sshd_config.d`.

### Этап 6. Проверка и применение

`sudo sshd -t`, затем `sudo systemctl reload ssh`, затем `systemctl status ssh`.

### Этап 7. Проверка доступа

```bash
ssh -p ПОРТ -i ~/.ssh/id_ed25519 ИМЯ@localhost             # пускает (по ключу)
ssh -p ПОРТ -o PubkeyAuthentication=no ИМЯ@localhost       # отказ: пароли запрещены
ssh -p ПОРТ root@localhost                                 # отказ
ssh -p ПОРТ intern@localhost                               # отказ
sudo tail -n 5 /var/log/auth.log                           # причины отказов
```

## Частые ошибки

| Ошибка | Причина и решение |
|---|---|
| `Connection refused` | неверный порт: смотрите `systemctl status ssh` и указывайте `-p ПОРТ` |
| вход по ключу не работает, пускает только по паролю | права `~/.ssh` или `authorized_keys`: `chmod 700 ~/.ssh`, `chmod 600 ~/.ssh/authorized_keys` |
| `PasswordAuthentication no` написан, а пароль всё ещё принимается | 1) значение из `sshd_config.d` действует раньше; 2) не выполнен `systemctl reload ssh` |
| правили `/etc/ssh/ssh_config` | это файл **клиента**; сервер читает `sshd_config` |
| `echo ... >> /etc/ssh/sshd_config` — «Отказано в доступе» | перенаправление выполняется без прав root: `echo ... \| sudo tee -a файл` |
| `Bad configuration option` | опечатка в имени параметра: исправьте или удалите строку (`sudo sed -i '/^Опечатка/d' файл`) |
| после `restart` служба `failed`, доступа нет | в конфигурации ошибка: исправьте, `sudo sshd -t`, затем `sudo systemctl start ssh` |
| в `authorized_keys` попал закрытый ключ | туда кладут только `.pub`: `cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys` |

## Шпаргалка

| Задача | Команда |
|---|---|
| Состояние службы | `systemctl status ssh` |
| Действующие значения | `sudo sshd -T \| grep -i ПАРАМЕТР` |
| Проверить конфигурацию | `sudo sshd -t` |
| Применить | `sudo systemctl reload ssh` |
| Журнал службы | `journalctl -u ssh` |
| Подключиться по ключу | `ssh -p ПОРТ -i ~/.ssh/id_ed25519 ИМЯ@localhost` |
| Проверить вход по паролю | `ssh -p ПОРТ -o PubkeyAuthentication=no ИМЯ@localhost` |
| Причина отказа | `sudo tail -n 5 /var/log/auth.log` |
| Отпечаток ключа | `ssh-keygen -l -f ~/.ssh/id_ed25519.pub` |
| Участники группы | `getent group sshadmins` |
