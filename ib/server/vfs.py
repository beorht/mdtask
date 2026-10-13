"""
Файловая система песочницы студента для эмулятора терминала.

Песочница — настоящий каталог на диске (data/ctf/<задание>/<student_id>/). Внутри
терминала пути показываются так, как их видит студент:

  - задание №3 (caesar): корень песочницы — это домашний каталог /home/<id>;
    абсолютный путь вида /x тоже ведёт внутрь песочницы (как было всегда);
  - задание №4 (configs): корень песочницы — это «/» учебного сервера, домашний
    каталог — /home/<id>, рядом /etc, /var, /usr и т.д.

Права доступа эмулируются: всё внутри домашнего каталога принадлежит студенту,
всё остальное — root. Чтение файла root без бита «чтение для всех» и любая
запись вне домашнего каталога требуют sudo. Режимы (rwx) берутся из настоящих
прав файлов на диске, их выставляет генератор задания.

Все пути проходят через Sandbox.resolve(): лексическая нормализация + проверка,
что реальный путь (после символических ссылок) не выходит за пределы песочницы.
"""

import os
import posixpath
import stat as st
from pathlib import Path

MAX_READ = 5 * 1024 * 1024      # больше не читаем (cat/grep/sed)
MAX_WRITE = 1024 * 1024         # максимальный размер записываемого файла
MAX_NEW_FILES = 500             # новых файлов за сессию


class FsError(Exception):
    """Ошибка файловой операции. Текст — как в сообщениях coreutils (по-русски)."""


ENOENT = "Нет такого файла или каталога"
EACCES = "Отказано в доступе"
EISDIR = "Это каталог"
ENOTDIR = "Это не каталог"
EROFS = "Файловая система доступна только для чтения"
OUTSIDE = "доступ за пределы домашнего каталога запрещён"
EEXIST = "Файл существует"
ENOTEMPTY = "Каталог не пуст"
EPERM = "Операция не позволена"
PROTECTED = "удаление и перемещение домашнего каталога (и каталогов над ним) в учебном терминале запрещено"


class Sandbox:
    def __init__(self, root, user, home_vrel, mapped_home, writable):
        """
        root        — каталог песочницы на диске;
        user        — имя студента (student_id);
        home_vrel   — домашний каталог относительно корня песочницы ('' или 'home/<id>');
        mapped_home — True: корень песочницы показывается как /home/<id> (задание №3);
        writable    — разрешена ли запись (задание №3 — только чтение).
        """
        self.root = Path(root)
        self.real_root = os.path.realpath(self.root)
        self.user = user
        self.home_vrel = home_vrel
        self.mapped_home = mapped_home
        self.writable = writable
        self.new_files = 0

    # ------------------------------------------------------------ пути ---

    @property
    def home_display(self):
        return f"/home/{self.user}"

    def display(self, vrel):
        """Путь для пользователя (pwd, сообщения) по пути внутри песочницы."""
        if self.mapped_home:
            return self.home_display + ("/" + vrel if vrel else "")
        return "/" + vrel

    def prompt_path(self, vrel):
        home = self.home_vrel
        if vrel == home:
            return "~"
        if home == "" or vrel.startswith(home + "/"):
            return "~/" + (vrel[len(home) + 1:] if home else vrel)
        return self.display(vrel)

    def _abs_to_vrel_parts(self, path):
        if self.mapped_home:
            h = self.home_display
            if path == h or path.startswith(h + "/"):
                path = path[len(h):]
        return path.lstrip("/")

    def resolve(self, cwd_vrel, arg):
        """Путь из аргумента команды -> путь внутри песочницы (vrel, '' = корень).

        Тильда раскрывается здесь же (на случай, если путь пришёл не из шелла).
        Выход за корень: в задании №3 — ошибка (как раньше), в №4 — «/..» = «/».
        """
        arg = arg if arg else "."
        if arg == "~":
            arg = self.home_display
        elif arg.startswith("~/"):
            arg = self.home_display + arg[1:]
        if arg.startswith("/"):
            base_parts = []
            rest = self._abs_to_vrel_parts(arg)
        else:
            base_parts = [p for p in cwd_vrel.split("/") if p]
            rest = arg
        parts = list(base_parts)
        for piece in rest.split("/"):
            if piece in ("", "."):
                continue
            if piece == "..":
                if parts:
                    parts.pop()
                elif self.mapped_home:
                    raise FsError(OUTSIDE)
                continue
            parts.append(piece)
        vrel = "/".join(parts)
        real = os.path.realpath(self.root / vrel) if vrel else self.real_root
        if real != self.real_root and not real.startswith(self.real_root + os.sep):
            raise FsError(OUTSIDE)
        return vrel

    def path(self, vrel):
        """Лексический путь на диске (символическая ссылка не раскрывается)."""
        return self.root / vrel if vrel else self.root

    def real(self, vrel):
        return os.path.realpath(self.path(vrel))

    def vrel_of_real(self, real):
        rel = os.path.relpath(real, self.real_root)
        return "" if rel == "." else rel.replace(os.sep, "/")

    # --------------------------------------------------------- метаданные ---

    def lexists(self, vrel):
        return os.path.lexists(self.path(vrel))

    def exists(self, vrel):
        return os.path.exists(self.path(vrel))

    def isdir(self, vrel):
        return os.path.isdir(self.path(vrel))

    def isfile(self, vrel):
        return os.path.isfile(self.path(vrel))

    def islink(self, vrel):
        return os.path.islink(self.path(vrel))

    def lstat(self, vrel):
        return os.lstat(self.path(vrel))

    def stat(self, vrel):
        return os.stat(self.path(vrel))

    def readlink(self, vrel):
        """Цель ссылки так, как её видит студент: абсолютные ссылки, созданные ln -s,
        хранятся на диске как путь внутри песочницы и показываются от её корня."""
        target = os.readlink(self.path(vrel))
        for base in (self.real_root, str(self.root)):
            if target == base or target.startswith(base + os.sep):
                rel = os.path.relpath(target, base).replace(os.sep, "/")
                return self.display("" if rel == "." else rel)
        return target

    def in_home(self, vrel):
        h = self.home_vrel
        return h == "" or vrel == h or vrel.startswith(h + "/")

    def owner(self, vrel):
        return self.user if self.in_home(vrel) else "root"

    def group(self, vrel):
        return self.owner(vrel)

    def uid(self, vrel):
        return 1000 if self.in_home(vrel) else 0

    def _mode(self, vrel, follow=True):
        s = os.stat(self.path(vrel)) if follow else os.lstat(self.path(vrel))
        return s.st_mode

    def can(self, vrel, bit, priv):
        """bit: 4 — чтение, 2 — запись, 1 — выполнение/проход в каталог."""
        if priv:
            return True
        try:
            mode = self._mode(self.real_vrel(vrel))
        except OSError:
            return False
        if self.owner(self.real_vrel(vrel)) == self.user:
            return bool(mode & (bit << 6))
        return bool(mode & bit)

    def real_vrel(self, vrel):
        """vrel цели после раскрытия всех символических ссылок."""
        return self.vrel_of_real(self.real(vrel))

    def check_traverse(self, vrel, priv):
        """Проверяет право прохода по всем каталогам на пути к vrel."""
        parts = [p for p in vrel.split("/") if p][:-1]
        cur = ""
        for p in parts:
            cur = f"{cur}/{p}" if cur else p
            if self.isdir(cur) and not self.can(cur, 1, priv):
                raise FsError(EACCES)

    # ------------------------------------------------------------- чтение ---

    def listdir(self, vrel, priv):
        if not self.exists(vrel):
            raise FsError(ENOENT)
        if not self.isdir(vrel):
            raise FsError(ENOTDIR)
        self.check_traverse(vrel + "/x", priv)
        if not self.can(vrel, 4, priv):
            raise FsError(EACCES)
        return sorted(os.listdir(self.path(vrel)))

    def read_bytes(self, vrel, priv):
        if not self.lexists(vrel) or not self.exists(vrel):
            raise FsError(ENOENT)
        if self.isdir(vrel):
            raise FsError(EISDIR)
        self.check_traverse(vrel, priv)
        if not self.can(vrel, 4, priv):
            raise FsError(EACCES)
        with open(self.path(vrel), "rb") as f:
            return f.read(MAX_READ)

    def read_text(self, vrel, priv):
        """(текст, двоичный_ли)."""
        data = self.read_bytes(vrel, priv)
        if b"\0" in data[:8192]:
            return data.decode("latin-1"), True
        try:
            return data.decode("utf-8"), False
        except UnicodeDecodeError:
            return data.decode("utf-8", errors="replace"), True

    # ------------------------------------------------------------- запись ---

    def check_write(self, vrel, priv):
        if not self.writable:
            raise FsError(EROFS)
        parent = posixpath.dirname(vrel)
        if self.lexists(vrel):
            if self.isdir(vrel):
                raise FsError(EISDIR)
            target = self.real_vrel(vrel)
            if not priv and self.owner(target) != self.user:
                raise FsError(EACCES)
            if not self.can(vrel, 2, priv):
                raise FsError(EACCES)
        else:
            if parent and not self.isdir(parent):
                raise FsError(ENOENT)
            if not priv and self.owner(parent) != self.user:
                raise FsError(EACCES)
            if not self.can(parent, 2, priv):
                raise FsError(EACCES)
        self.check_traverse(vrel, priv)

    def write_text(self, vrel, text, priv, append=False, follow_symlinks=True):
        """Записывает файл. follow_symlinks=False — как sed -i без --follow-symlinks:
        символическая ссылка заменяется обычным файлом."""
        self.write_bytes(vrel, text.encode("utf-8"), priv, append, follow_symlinks)

    def write_bytes(self, vrel, data, priv, append=False, follow_symlinks=True):
        self.check_write(vrel, priv)
        p = self.path(vrel)
        existed = os.path.lexists(p)
        if append and existed:
            size = os.path.getsize(p)
            if size + len(data) > MAX_WRITE:
                raise FsError("превышен лимит размера файла в песочнице (1 МБ)")
        elif len(data) > MAX_WRITE:
            raise FsError("превышен лимит размера файла в песочнице (1 МБ)")
        if not existed:
            if self.new_files >= MAX_NEW_FILES:
                raise FsError("превышен лимит новых файлов в песочнице")
            self.new_files += 1
        if existed and os.path.islink(p) and not follow_symlinks:
            mode = os.stat(p).st_mode
            os.unlink(p)
            with open(p, "wb") as f:
                f.write(data)
            os.chmod(p, st.S_IMODE(mode))
            return
        target = self.real(vrel) if existed else str(p)
        with open(target, "ab" if append else "wb") as f:
            f.write(data)
        if not existed:
            os.chmod(p, 0o644)

    # ------------------------------------------- каталоги, удаление, права ---

    def protected(self, vrel):
        """Корень, домашний каталог и каталоги над ним: их нельзя удалить или переместить."""
        h = self.home_vrel
        return vrel == "" or vrel == h or h.startswith(vrel + "/")

    def check_dir_write(self, dir_vrel, priv):
        """Право создавать и удалять записи в каталоге (как w+x на каталог в Linux)."""
        if not self.writable:
            raise FsError(EROFS)
        if dir_vrel and not self.lexists(dir_vrel):
            raise FsError(ENOENT)
        if dir_vrel and not self.isdir(dir_vrel):
            raise FsError(ENOTDIR)
        self.check_traverse(dir_vrel + "/x", priv)
        if priv:
            return
        real = self.real_vrel(dir_vrel) if dir_vrel else ""
        if self.owner(real) != self.user or not self.can(dir_vrel, 2, False) or not self.can(dir_vrel, 1, False):
            raise FsError(EACCES)

    def _count_new(self):
        if self.new_files >= MAX_NEW_FILES:
            raise FsError("превышен лимит новых файлов в песочнице")
        self.new_files += 1

    def mkdir(self, vrel, priv, mode=0o755):
        self.check_dir_write(posixpath.dirname(vrel), priv)
        if self.lexists(vrel):
            raise FsError(EEXIST)
        self._count_new()
        os.mkdir(self.path(vrel))
        os.chmod(self.path(vrel), mode & 0o777)

    def rmdir(self, vrel, priv):
        if not self.lexists(vrel):
            raise FsError(ENOENT)
        if self.islink(vrel) or not self.isdir(vrel):
            raise FsError(ENOTDIR)
        if self.protected(vrel):
            raise FsError(PROTECTED)
        self.check_dir_write(posixpath.dirname(vrel), priv)
        if os.listdir(self.path(vrel)):
            raise FsError(ENOTEMPTY)
        os.rmdir(self.path(vrel))

    def unlink(self, vrel, priv):
        """Удаляет файл или ссылку (саму ссылку, не цель)."""
        if not self.lexists(vrel):
            raise FsError(ENOENT)
        if self.isdir(vrel) and not self.islink(vrel):
            raise FsError(EISDIR)
        self.check_dir_write(posixpath.dirname(vrel), priv)
        os.unlink(self.path(vrel))

    def rename(self, src, dst, priv):
        if not self.lexists(src):
            raise FsError(ENOENT)
        if self.protected(src):
            raise FsError(PROTECTED)
        if dst == src or dst.startswith(src + "/"):
            raise FsError("невозможно переместить каталог в самого себя")
        self.check_dir_write(posixpath.dirname(src), priv)
        self.check_dir_write(posixpath.dirname(dst), priv)
        if self.lexists(dst):
            src_dir = self.isdir(src) and not self.islink(src)
            dst_dir = self.isdir(dst) and not self.islink(dst)
            if dst_dir and not src_dir:
                raise FsError(EISDIR)
            if src_dir and not dst_dir:
                raise FsError(ENOTDIR)
            if dst_dir and os.listdir(self.path(dst)):
                raise FsError(ENOTEMPTY)
        os.rename(self.path(src), self.path(dst))

    def chmod(self, vrel, mode, priv):
        if not self.writable:
            raise FsError(EROFS)
        if not self.exists(vrel):
            raise FsError(ENOENT)
        self.check_traverse(vrel, priv)
        target = self.real_vrel(vrel)
        if not priv and self.owner(target) != self.user:
            raise FsError(EPERM)
        os.chmod(self.real(vrel), mode & (0o7777 if priv else 0o1777))

    def symlink(self, target, vrel, priv):
        """ln -s: абсолютная цель хранится как путь внутри песочницы (см. readlink)."""
        self.check_dir_write(posixpath.dirname(vrel), priv)
        if self.lexists(vrel):
            raise FsError(EEXIST)
        if target.startswith("/") or target == "~" or target.startswith("~/"):
            tv = self.resolve("", target)
            stored = os.path.join(self.real_root, tv) if tv else self.real_root
        else:
            self.resolve(posixpath.dirname(vrel), target)  # не выходит ли за песочницу
            stored = target
        self._count_new()
        os.symlink(stored, self.path(vrel))

    def hardlink(self, src, vrel, priv):
        if not self.exists(src):
            raise FsError(ENOENT)
        if self.isdir(src):
            raise FsError("жёсткие ссылки на каталоги не допускаются")
        if not priv and not self.in_home(self.real_vrel(src)):
            raise FsError(EPERM)
        self.check_dir_write(posixpath.dirname(vrel), priv)
        if self.lexists(vrel):
            raise FsError(EEXIST)
        self._count_new()
        os.link(self.real(src), self.path(vrel))


def mode_string(mode):
    """drwxr-xr-x по st_mode."""
    kind = "d" if st.S_ISDIR(mode) else "l" if st.S_ISLNK(mode) else "-"
    out = kind
    for shift in (6, 3, 0):
        bits = (mode >> shift) & 7
        out += ("r" if bits & 4 else "-") + ("w" if bits & 2 else "-") + ("x" if bits & 1 else "-")
    return out
