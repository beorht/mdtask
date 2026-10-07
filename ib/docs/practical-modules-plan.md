# План практических модулей для веб-эмулятора терминала (ИБ)

Черновой список направлений практических работ, которые может предложить платформа-эмулятор терминала для студентов направления "Информационная безопасность". Формат: онлайн веб-терминал (xterm.js + WebSocket + изолированный backend на контейнерах/microVM).

## 1. Сетевая безопасность
- Сканирование сети (nmap, netcat) в изолированной виртуальной сети
- Анализ трафика (tcpdump, tshark)
- Настройка firewall (iptables/nftables) — атака vs защита
- MITM-атаки в песочнице (ARP spoofing, Scapy)

## 2. Linux/системная безопасность
- Права доступа, SUID/SGID, privilege escalation (классические CTF-задачи)
- Аудит логов (journalctl, auth.log)
- Hardening системы (SELinux/AppArmor, sysctl)
- Управление пользователями и sudoers

## 3. Криптография
- Практика с OpenSSL (шифрование, хеши, сертификаты, PKI)
- Взлом простых шифров (частотный анализ, brute-force хешей — hashcat/john, учебные цели)
- Генерация и проверка цифровых подписей

## 4. Web-безопасность
- OWASP Top 10 в контролируемой среде (SQLi, XSS, CSRF) через curl/CLI-инструменты
- Работа с HTTP через curl/httpie — анализ заголовков, cookies, токенов

## 5. Reverse Engineering / Malware Analysis (учебное)
- Анализ бинарников (objdump, gdb, strings, file)
- Разбор простых "вредоносных" скриптов в песочнице
- Статический анализ безопасных учебных образцов

## 6. Форензика (Digital Forensics)
- Анализ образов дисков (autopsy CLI, sleuthkit)
- Восстановление удалённых файлов
- Анализ памяти (volatility)
- Timeline-анализ инцидентов

## 7. CTF-подобные задания
- Jail escape / restricted shell breakout
- Steganography (steghide, exiftool)
- Log analysis для расследования инцидента (Blue Team)

## 8. Пентест-методология
- Recon → Scanning → Exploitation → Post-exploitation (пошаговые лаборатории, Metasploit CLI в изолированном контейнере)
- Password cracking практика (john, hashcat) на учебных хешах

## Технические заметки
- Каждая работа = изолированный контейнер/VM на пользователя (Docker с seccomp/namespaces или Firecracker microVM)
- Таймауты и лимиты ресурсов на сессию
- Веб-терминал: xterm.js + WebSocket + backend (ttyd/gotty или собственный оркестратор)
- Возможный MVP: один модуль (например, Linux privilege escalation lab) как прототип
