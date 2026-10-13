"""
Модель службы SSH учебного сервера (задание №7): чтение и проверка sshd_config, «работающая»
конфигурация службы и решение, пустит ли сервер пользователя.

  - parse(root)          — sshd_config с учётом Include (sshd_config.d подключается в начале!):
                           действует ПЕРВОЕ значение параметра; AllowUsers/AllowGroups/DenyUsers/
                           DenyGroups накапливаются; после Match разбор глобальных параметров заканчивается;
                           ошибки — в формате sshd -t;
  - effective(settings)  — значения с учётом умолчаний OpenSSH (как sshd -T);
  - служба               — /var/lib/seclab/sshd.json: запущена ли и с какими настройками. Настройки
                           попадают туда только при systemctl reload/restart — правка файла сама по себе
                           ничего не меняет, как в настоящей системе;
  - login(...)           — пустит ли сервер user по ключу/паролю (DenyUsers, AllowUsers, DenyGroups,
                           AllowGroups, PermitRootLogin, StrictModes, authorized_keys, PasswordAuthentication).

Ключи учебные: «открытый ключ» выводится из «закрытого» хешем (derive_pub), так что пара всегда
согласована, а настоящей криптографии не нужно.
"""

import base64
import fnmatch
import glob
import hashlib
import json
import os
import posixpath
import re
from pathlib import Path

import accounts

CONFIG = "etc/ssh/sshd_config"
STATE = "var/lib/seclab/sshd.json"

BOOL = "bool"
KEYWORDS = {
    # имя в нижнем регистре: (каноническое имя, тип значения)
    "port": ("Port", "port"),
    "addressfamily": ("AddressFamily", "any"),
    "listenaddress": ("ListenAddress", "any"),
    "hostkey": ("HostKey", "any"),
    "logingracetime": ("LoginGraceTime", "any"),
    "permitrootlogin": ("PermitRootLogin", "prl"),
    "strictmodes": ("StrictModes", BOOL),
    "maxauthtries": ("MaxAuthTries", "int"),
    "maxsessions": ("MaxSessions", "int"),
    "maxstartups": ("MaxStartups", "any"),
    "pubkeyauthentication": ("PubkeyAuthentication", BOOL),
    "authorizedkeysfile": ("AuthorizedKeysFile", "any"),
    "passwordauthentication": ("PasswordAuthentication", BOOL),
    "permitemptypasswords": ("PermitEmptyPasswords", BOOL),
    "kbdinteractiveauthentication": ("KbdInteractiveAuthentication", BOOL),
    "challengeresponseauthentication": ("ChallengeResponseAuthentication", BOOL),
    "hostbasedauthentication": ("HostbasedAuthentication", BOOL),
    "ignorerhosts": ("IgnoreRhosts", BOOL),
    "kerberosauthentication": ("KerberosAuthentication", BOOL),
    "gssapiauthentication": ("GSSAPIAuthentication", BOOL),
    "usepam": ("UsePAM", BOOL),
    "allowagentforwarding": ("AllowAgentForwarding", BOOL),
    "allowtcpforwarding": ("AllowTcpForwarding", "any"),
    "gatewayports": ("GatewayPorts", "any"),
    "x11forwarding": ("X11Forwarding", BOOL),
    "printmotd": ("PrintMotd", BOOL),
    "printlastlog": ("PrintLastLog", BOOL),
    "tcpkeepalive": ("TCPKeepAlive", BOOL),
    "permituserenvironment": ("PermitUserEnvironment", BOOL),
    "compression": ("Compression", "any"),
    "clientaliveinterval": ("ClientAliveInterval", "int"),
    "clientalivecountmax": ("ClientAliveCountMax", "int"),
    "usedns": ("UseDNS", BOOL),
    "pidfile": ("PidFile", "any"),
    "permittunnel": ("PermitTunnel", "any"),
    "chrootdirectory": ("ChrootDirectory", "any"),
    "banner": ("Banner", "any"),
    "acceptenv": ("AcceptEnv", "any"),
    "subsystem": ("Subsystem", "any"),
    "loglevel": ("LogLevel", "any"),
    "syslogfacility": ("SyslogFacility", "any"),
    "ciphers": ("Ciphers", "any"),
    "macs": ("MACs", "any"),
    "kexalgorithms": ("KexAlgorithms", "any"),
    "authenticationmethods": ("AuthenticationMethods", "any"),
    "forcecommand": ("ForceCommand", "any"),
    "allowusers": ("AllowUsers", "list"),
    "allowgroups": ("AllowGroups", "list"),
    "denyusers": ("DenyUsers", "list"),
    "denygroups": ("DenyGroups", "list"),
    "include": ("Include", "any"),
    "match": ("Match", "any"),
}
LISTS = ("allowusers", "allowgroups", "denyusers", "denygroups")
PRL_VALUES = ("yes", "no", "prohibit-password", "without-password", "forced-commands-only")

DEFAULTS = {
    "port": "22",
    "permitrootlogin": "prohibit-password",
    "pubkeyauthentication": "yes",
    "passwordauthentication": "yes",
    "permitemptypasswords": "no",
    "kbdinteractiveauthentication": "yes",
    "maxauthtries": "6",
    "maxsessions": "10",
    "strictmodes": "yes",
    "authorizedkeysfile": ".ssh/authorized_keys .ssh/authorized_keys2",
    "usepam": "no",
    "x11forwarding": "no",
    "printmotd": "yes",
    "logingracetime": "120",
}


def _read(root, rel):
    try:
        return (Path(root) / rel).read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return None


def parse(root):
    """-> (settings, origins, errors).

    settings — {параметр: значение} (первое значение; списки — накопленные слова),
    origins  — {параметр: (файл, номер строки)} откуда взято действующее значение,
    errors   — сообщения как у sshd -t ("/etc/ssh/sshd_config line 7: Bad configuration option: X")."""
    settings, origins, errors = {}, {}, []
    seen = set()
    stop = [False]

    def handle(rel, depth):
        if depth > 8 or rel in seen or stop[0]:
            return
        seen.add(rel)
        text = _read(root, rel)
        shown = "/" + rel
        if text is None:
            if depth == 0:
                errors.append(f"{shown}: No such file or directory")
            return
        for n, raw in enumerate(text.splitlines(), 1):
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            m = re.match(r"([^\s=]+)(?:\s*=\s*|\s+)?(.*)$", line)
            parts = [m.group(1), m.group(2)]
            key = parts[0].lower()
            val = parts[1].strip()
            if key not in KEYWORDS:
                errors.append(f"{shown} line {n}: Bad configuration option: {parts[0]}")
                continue
            if not val:
                errors.append(f"{shown} line {n}: {KEYWORDS[key][0]}: missing argument.")
                continue
            err = _bad_value(key, val)
            if err:
                errors.append(f"{shown} line {n}: {err}")
                continue
            if key == "match":
                stop[0] = True
                return
            if key == "include":
                for pattern in val.split():
                    if not pattern.startswith("/"):
                        pattern = "/etc/ssh/" + pattern
                    for path in sorted(glob.glob(str(Path(root)) + pattern)):
                        handle(os.path.relpath(path, root).replace(os.sep, "/"), depth + 1)
                        if stop[0]:
                            return
                continue
            if key in LISTS:
                settings.setdefault(key, [])
                settings[key] += val.split()
                origins.setdefault(key, (shown, n))
                continue
            if key not in settings:
                settings[key] = val.split()[0] if KEYWORDS[key][1] in (BOOL, "prl", "port", "int") else val
                origins[key] = (shown, n)

    handle(CONFIG, 0)
    return settings, origins, errors


def _bad_value(key, val):
    kind = KEYWORDS[key][1]
    word = val.split()[0]
    if kind == BOOL and word.lower() not in ("yes", "no"):
        return f"Bad yes/no argument: {word}"
    if kind == "prl" and word.lower() not in PRL_VALUES:
        return f"Bad yes/without-password/prohibit-password/forced-commands-only/no argument: {word}"
    if kind == "port" and not (word.isdigit() and 0 < int(word) < 65536):
        return "Badly formatted port number."
    if kind == "int" and not word.isdigit():
        return f"Invalid number: {word}"
    return None


def effective(settings):
    eff = dict(DEFAULTS)
    for k, v in settings.items():
        eff[k] = v if k in LISTS else str(v).lower() if KEYWORDS[k][1] in (BOOL, "prl") else v
    for k in LISTS:
        eff.setdefault(k, [])
    if eff.get("permitrootlogin") == "without-password":
        eff["permitrootlogin"] = "prohibit-password"
    return eff


def dump(eff):
    """Вывод как у sshd -T: «ключ значение» в нижнем регистре, по алфавиту."""
    lines = []
    for k in sorted(eff):
        if k in ("include", "match"):
            continue
        v = eff[k]
        if k in LISTS:
            for item in v:
                lines.append(f"{k} {item}")
        else:
            lines.append(f"{k} {v}")
    return "\n".join(lines) + "\n"


def file_effective(root):
    settings, _, errors = parse(root)
    return effective(settings), errors


# ---------------------------------------------------------------- служба ---

def load_state(root):
    text = _read(root, STATE)
    if text is None:
        return None
    try:
        return json.loads(text)
    except ValueError:
        return None


def save_state(root, state):
    p = Path(root) / STATE
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(state, ensure_ascii=False, indent=1), encoding="utf-8")
    os.chmod(p, 0o600)


def running(root):
    """Действующие настройки запущенной службы или None, если служба остановлена."""
    state = load_state(root)
    if not state or not state.get("active"):
        return None
    return state.get("settings")


# ------------------------------------------------------------------ ключи ---

def _key_body(private_text):
    lines = [x.strip() for x in (private_text or "").splitlines()
             if x.strip() and not x.startswith("-----")]
    return "".join(lines)


def derive_pub(private_text, comment=""):
    body = _key_body(private_text)
    if not body:
        return None
    blob = b"\x00\x00\x00\x0bssh-ed25519\x00\x00\x00 " + hashlib.sha256(body.encode()).digest()
    line = "ssh-ed25519 " + base64.b64encode(blob).decode()
    return line + (f" {comment}" if comment else "")


def pub_blob(line):
    parts = (line or "").split()
    for i, p in enumerate(parts):
        if p.startswith("ssh-") or p.startswith("ecdsa-"):
            return parts[i + 1] if i + 1 < len(parts) else None
    return None


def fingerprint(pub_line):
    blob = pub_blob(pub_line)
    if not blob:
        return None
    try:
        raw = base64.b64decode(blob)
    except ValueError:
        return None
    return "SHA256:" + base64.b64encode(hashlib.sha256(raw).digest()).decode().rstrip("=")


# ------------------------------------------------------------ вход по SSH ---

def _match_pattern(patterns, value, host_values=("127.0.0.1", "localhost", "::1")):
    for pat in patterns:
        user_pat, _, host_pat = pat.partition("@")
        if fnmatch.fnmatchcase(value, user_pat) and (not host_pat or any(
                fnmatch.fnmatchcase(h, host_pat) for h in host_values)):
            return True
    return False


def _vrel(path):
    return posixpath.normpath(path).lstrip("/")


def _mode(root, vrel):
    try:
        return os.stat(Path(root) / vrel).st_mode & 0o7777
    except OSError:
        return None


def login(root, eff, user, client_keys, try_pubkey=True, try_password=True):
    """-> (ok, метод, причина для журнала сервера).

    client_keys — открытые ключи (строки), которые предъявляет клиент."""
    users, groups, shadow = accounts.load(root)
    info = users.get(user)
    if info is None:
        return False, None, f"Invalid user {user}"
    hash_ = shadow.get(user)
    if hash_ is not None and hash_.startswith("!"):
        return False, None, f"User {user} not allowed because account is locked"
    if info["shell"].endswith(("nologin", "/false")):
        return False, None, f"User {user} not allowed because shell {info['shell']} is not executable"
    user_groups = accounts.user_groups(user, users, groups)
    if eff.get("denyusers") and _match_pattern(eff["denyusers"], user):
        return False, None, f"User {user} not allowed because listed in DenyUsers"
    if eff.get("allowusers") and not _match_pattern(eff["allowusers"], user):
        return False, None, f"User {user} not allowed because not listed in AllowUsers"
    if eff.get("denygroups") and any(_match_pattern(eff["denygroups"], g, ()) for g in user_groups):
        return False, None, f"User {user} not allowed because a group is listed in DenyGroups"
    if eff.get("allowgroups") and not any(_match_pattern(eff["allowgroups"], g, ()) for g in user_groups):
        return False, None, f"User {user} not allowed because none of user's groups are listed in AllowGroups"

    prl = eff.get("permitrootlogin", "prohibit-password")
    root_user = info["uid"] == 0
    if root_user and prl in ("no", "forced-commands-only"):
        return False, None, "ROOT LOGIN REFUSED"

    reasons = []
    if try_pubkey and eff.get("pubkeyauthentication") == "yes" and client_keys:
        ok, why = _pubkey_ok(root, eff, user, info, client_keys)
        if ok:
            return True, "publickey", f"Accepted publickey for {user}"
        reasons.append(why)
    password_allowed = eff.get("passwordauthentication") == "yes" and not (root_user and prl != "yes")
    if try_password and password_allowed:
        if accounts.has_password(hash_) or (hash_ == "" and eff.get("permitemptypasswords") == "yes"):
            return True, "password", f"Accepted password for {user}"
        reasons.append("Failed password")
    return False, None, "; ".join(r for r in reasons if r) or f"Connection closed by authenticating user {user}"


def pubkey_refusal(root, eff, user, client_keys):
    """Почему сервер не принял ключи клиента (None — принял или ключей нет)."""
    info = accounts.load(root)[0].get(user)
    if info is None or not client_keys or eff.get("pubkeyauthentication") != "yes":
        return None
    ok, why = _pubkey_ok(root, eff, user, info, client_keys)
    return None if ok else why


def _pubkey_ok(root, eff, user, info, client_keys):
    home = _vrel(info["home"])
    if eff.get("strictmodes", "yes") == "yes":
        for vrel, label in ((home, "home directory"), (posixpath.join(home, ".ssh"), "directory")):
            mode = _mode(root, vrel)
            if mode is not None and mode & 0o022:
                return False, f"Authentication refused: bad ownership or modes for {label} /{vrel}"
    blobs = {pub_blob(k) for k in client_keys if pub_blob(k)}
    for pattern in str(eff.get("authorizedkeysfile", "")).split():
        if pattern.lower() == "none":
            continue
        path = pattern.replace("%h", info["home"]).replace("%u", user).replace("%%", "%")
        vrel = _vrel(path if path.startswith("/") else posixpath.join(info["home"], path))
        text = _read(root, vrel)
        if text is None:
            continue
        if eff.get("strictmodes", "yes") == "yes":
            mode = _mode(root, vrel)
            if mode is not None and mode & 0o022:
                return False, f"Authentication refused: bad ownership or modes for file /{vrel}"
        for line in text.splitlines():
            if line.strip() and not line.startswith("#") and pub_blob(line) in blobs:
                return True, None
    return False, f"Failed publickey for {user}"


def server_methods(eff, user_is_root=False):
    methods = []
    if eff.get("pubkeyauthentication") == "yes":
        methods.append("publickey")
    prl = eff.get("permitrootlogin")
    if eff.get("passwordauthentication") == "yes" and not (user_is_root and prl != "yes"):
        methods.append("password")
    return ",".join(methods) or "none"
