#!/usr/bin/env python3
"""
№7. Генератор задания «Безопасный удалённый доступ по SSH».

Для каждого студента — учебный сервер в data/ctf/ssh/<id>/ с небезопасным OpenSSH:
  - /etc/ssh/sshd_config: личный порт, PermitRootLogin yes, PermitEmptyPasswords yes, MaxAuthTries 10,
    нет AllowGroups; Include /etc/ssh/sshd_config.d/*.conf в начале, а в 50-cloud-init.conf —
    PasswordAuthentication yes (ловушка: действует первое значение); /etc/ssh/ssh_config — клиентский
    (ловушка: на сервер не влияет);
  - учётные записи: студент (sudo, sshadmins), deploy (sshadmins, вход только по своему ключу),
    стажёр intern (с паролем, но без права на удалённый вход), root с паролем;
  - ~/.ssh студента: пара ключей id_ed25519 и каталог с правами 775 (StrictModes откажет, пока
    не исправить), authorized_keys ещё нет;
  - /var/lib/seclab/sshd.json — «работающая» служба с исходной конфигурацией.
Значения (порт, SHA-256 исходных файлов для проверки резервной копии) — в ib_lab_tasks.params.
Проверка — server/ssh_task.py, модель службы — server/sshd_sim.py.

Использование:
    ./generate_ssh.py --group IB
    ./generate_ssh.py --student st-test-001
    ./generate_ssh.py --group IB --force          # выдать заново (прогресс обнуляется)
    ./generate_ssh.py --group IB --refresh-task   # только переписать ~/TASK.md
"""

import hashlib
import secrets
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import lab_gen  # noqa: E402
from lab_gen import Tree, base_system, fake_hash  # noqa: E402
import ssh_task  # noqa: E402
import sshd_sim  # noqa: E402

LAB = ssh_task.LAB
PORTS = [2222, 2022, 2200, 2244, 4422, 8022, 22022, 2223]

SSHD_CONFIG = """\
# This is the sshd server system-wide configuration file.  See
# sshd_config(5) for more information.

# The strategy used for options in the default sshd_config shipped with
# OpenSSH is to specify options with their default value where
# possible, but leave them commented.  Uncommented options override the
# default value.

Include /etc/ssh/sshd_config.d/*.conf

Port {port}
#AddressFamily any
#ListenAddress 0.0.0.0
#ListenAddress ::

#HostKey /etc/ssh/ssh_host_rsa_key
#HostKey /etc/ssh/ssh_host_ecdsa_key
#HostKey /etc/ssh/ssh_host_ed25519_key

# Logging
#SyslogFacility AUTH
#LogLevel INFO

# Authentication:

#LoginGraceTime 2m
PermitRootLogin yes
#StrictModes yes
MaxAuthTries 10
#MaxSessions 10

PubkeyAuthentication yes

# Expect .ssh/authorized_keys2 to be disregarded by default in future.
#AuthorizedKeysFile	.ssh/authorized_keys .ssh/authorized_keys2

# To disable tunneled clear text passwords, change to no here!
#PasswordAuthentication yes
PermitEmptyPasswords yes

# Change to yes to enable challenge-response passwords (beware issues with
# some PAM modules and threads)
KbdInteractiveAuthentication no

UsePAM yes

#AllowAgentForwarding yes
#AllowTcpForwarding yes
X11Forwarding yes
PrintMotd no

# Allow client to pass locale environment variables
AcceptEnv LANG LC_*

# override default of no subsystems
Subsystem	sftp	/usr/lib/openssh/sftp-server
"""

DROPIN = "PasswordAuthentication yes\n"

SSH_CONFIG = """\
# This is the ssh client system-wide configuration file.  See
# ssh_config(5) for more information.  This file provides defaults for
# users, and the values can be changed in per-user configuration files
# or on the command line.

Include /etc/ssh/ssh_config.d/*.conf

Host *
#   ForwardAgent no
#   ForwardX11 no
    PasswordAuthentication yes
#   IdentityFile ~/.ssh/id_ed25519
#   Port 22
    SendEnv LANG LC_*
    HashKnownHosts yes
    GSSAPIAuthentication yes
"""


def private_key():
    body = secrets.token_urlsafe(54)
    lines = [body[i:i + 70] for i in range(0, len(body), 70)]
    return "-----BEGIN OPENSSH PRIVATE KEY-----\n" + "\n".join(lines) + "\n-----END OPENSSH PRIVATE KEY-----\n"


def make_params(rng, student_id):
    return {"port": rng.choice(PORTS)}


def build(root, student_id, params, rng):
    t = Tree(root)
    home = base_system(t, student_id)
    port = params["port"]

    passwd = ["root:x:0:0:root:/root:/bin/bash", "daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin",
              "www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin",
              "backup:x:34:34:backup:/var/backups:/usr/sbin/nologin",
              "sshd:x:110:65534::/run/sshd:/usr/sbin/nologin",
              f"{student_id}:x:1000:1000:Администратор удалённого доступа,,,:/home/{student_id}:/bin/bash",
              "deploy:x:1001:1001:Служебная учётная запись выкладки,,,:/home/deploy:/bin/bash",
              "intern:x:1002:1002:Стажёр,,,:/home/intern:/bin/bash"]
    shadow = [f"root:{fake_hash(rng)}:19800:0:99999:7:::", "daemon:*:19600:0:99999:7:::",
              "www-data:*:19600:0:99999:7:::", "backup:*:19600:0:99999:7:::", "sshd:*:19600:0:99999:7:::",
              f"{student_id}:{fake_hash(rng)}:19800:0:99999:7:::",
              "deploy:*:19800:0:99999:7:::",
              f"intern:{fake_hash(rng)}:19800:0:99999:7:::"]
    groups = ["root:x:0:", "adm:x:4:", f"sudo:x:27:{student_id}", "www-data:x:33:", "backup:x:34:",
              f"{student_id}:x:1000:", "deploy:x:1001:", "intern:x:1002:",
              f"sshadmins:x:1500:{student_id},deploy"]
    t.f("etc/passwd", "\n".join(passwd) + "\n")
    t.f("etc/shadow", "\n".join(shadow) + "\n", 0o640)
    t.f("etc/group", "\n".join(groups) + "\n")

    # --- OpenSSH ---
    config = SSHD_CONFIG.format(port=port)
    t.d("etc/ssh")
    t.d("etc/ssh/sshd_config.d")
    t.d("etc/ssh/ssh_config.d")
    t.f("etc/ssh/sshd_config", config)
    t.f("etc/ssh/sshd_config.d/50-cloud-init.conf", DROPIN)
    t.f("etc/ssh/ssh_config", SSH_CONFIG)
    host_key = private_key()
    t.f("etc/ssh/ssh_host_ed25519_key", host_key, 0o600)
    t.f("etc/ssh/ssh_host_ed25519_key.pub", sshd_sim.derive_pub(host_key, "root@seclab") + "\n")
    t.f("etc/ssh/moduli", "# Time Type Tests Tries Size Generator Modulus\n")

    # --- ключи ---
    key = private_key()
    t.d(f"{home}/.ssh", 0o775)
    t.f(f"{home}/.ssh/id_ed25519", key, 0o600)
    t.f(f"{home}/.ssh/id_ed25519.pub", sshd_sim.derive_pub(key, f"{student_id}@laptop") + "\n")
    t.f(f"{home}/.ssh/known_hosts", f"|1|{secrets.token_urlsafe(20)}= ssh-ed25519 "
                                    f"{sshd_sim.pub_blob(sshd_sim.derive_pub(host_key))}\n")
    deploy_key = private_key()
    for name in ("deploy", "intern"):
        t.d(f"home/{name}", 0o750)
        t.f(f"home/{name}/.bashrc", lab_gen.BASHRC)
    t.d("home/deploy/.ssh", 0o700)
    t.f("home/deploy/.ssh/authorized_keys", sshd_sim.derive_pub(deploy_key, "ci@build-server") + "\n", 0o600)

    # --- журналы и служба ---
    stamp = time.mktime(time.strptime("2026-10-12 09:00:00", "%Y-%m-%d %H:%M:%S"))
    auth = []
    for k, (user, ip, method) in enumerate([("root", "10.0.5.12", "password"), ("intern", "10.0.5.77", "password"),
                                            ("root", "10.0.5.12", "password"), ("deploy", "10.0.7.3", "publickey")]):
        ts = time.strftime("%b %d %H:%M:%S", time.localtime(stamp + k * 3700 + rng.randint(0, 600)))
        auth.append(f"{ts} seclab sshd[{1200 + k * 17}]: Accepted {method} for {user} from {ip} port "
                    f"{rng.randint(40000, 65000)} ssh2")
    t.f("var/log/auth.log", "\n".join(auth) + "\n", 0o640)
    t.d("var/lib/seclab", 0o700)
    t.finish()

    eff, errors = sshd_sim.file_effective(root)
    assert not errors, errors
    since = time.time()
    sshd_sim.save_state(root, {
        "active": True, "failed": False, "pid": 612, "since": since, "loaded_at": since, "settings": eff,
        "journal": [f"{time.strftime('%b %d %H:%M:%S', time.localtime(since))} seclab sshd[612]: "
                    f"Server listening on 0.0.0.0 port {port}.",
                    f"{time.strftime('%b %d %H:%M:%S', time.localtime(since))} seclab systemd[1]: "
                    "Started ssh.service - OpenBSD Secure Shell server."],
    })
    params["hashes"] = {"sshd_config": hashlib.sha256(config.encode()).hexdigest(),
                        "dropin": hashlib.sha256(DROPIN.encode()).hexdigest()}
    return params


if __name__ == "__main__":
    lab_gen.main(LAB, make_params, build, "Задание №7: безопасный удалённый доступ по SSH", keep_keys=("port",))
