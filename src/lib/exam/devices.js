// Итоговая контрольная: only from the computers of the classroom. A request is recognised as a
// classroom PC by its IP address (table exam_pcs). Browsers never tell a site the MAC address;
// when the server is in the same network segment as the PCs, the MAC is read from the server's
// ARP table (/proc/net/arp) for that IP and compared with the list — a laptop that took a PC's
// address is then caught too. Through a router the ARP table only knows the router, so the check
// is by IP only. Applies to the exam pages and API alone; TEST and students the teacher allowed
// pass anywhere. Mode per exam: off | warn (let in, mark) | block.
const fs = require('fs');
const Database = require('better-sqlite3');
const db = require('../../db');
const { hasFullAccess } = require('../test-access');

const DEVICE_MODES = {
  block: 'Запрещать: только с ПК аудитории',
  warn: 'Отмечать: пускать, но предупреждать в админке',
  off: 'Не проверять',
};
const ARP_FILE = process.env.EXAM_ARP_FILE || '/proc/net/arp';
const ARP_TTL_MS = 30 * 1000;
const IPV4 = /^(\d{1,3}\.){3}\d{1,3}$/;
const MAC = /^([0-9a-f]{2}:){5}[0-9a-f]{2}$/;

function normalizeIp(ip) {
  return String(ip || '').trim().replace(/^::ffff:/i, '');
}

function normalizeMac(mac) {
  const m = String(mac || '').trim().toLowerCase().replace(/-/g, ':');
  return MAC.test(m) ? m : null;
}

let arpCache = { at: 0, table: new Map() };

// IP -> MAC from the server's ARP table (empty where there is none, e.g. not Linux).
function arpTable() {
  if (Date.now() - arpCache.at < ARP_TTL_MS) return arpCache.table;
  const table = new Map();
  try {
    fs.readFileSync(ARP_FILE, 'utf-8')
      .split('\n')
      .slice(1)
      .forEach((line) => {
        const [ip, , flags, mac] = line.trim().split(/\s+/);
        if (ip && mac && flags !== '0x0' && mac !== '00:00:00:00:00:00') table.set(ip, mac.toLowerCase());
      });
  } catch (err) {
    // no ARP table here
  }
  arpCache = { at: Date.now(), table };
  return table;
}

function __resetArpForTests() {
  arpCache = { at: 0, table: new Map() };
}

// -> { ip, pc, mac, macMismatch, allowed, reason }
//    reason: test | any_device | pc | off | warn | unknown | mac_mismatch
function checkDevice(win, variant, user, rawIp) {
  const ip = normalizeIp(rawIp);
  const pcs = db.getExamPcs();
  const pc = pcs.find((p) => p.ip === ip) || null;
  const mac = arpTable().get(ip) || null;
  const macMismatch = !!(pc && pc.mac && mac && normalizeMac(pc.mac) !== mac);
  const base = { ip, pc: pc ? pc.name : null, mac, macMismatch };
  if (hasFullAccess(user)) return { ...base, allowed: true, reason: 'test' };
  if (variant && variant.anyDevice) return { ...base, allowed: true, reason: 'any_device' };
  const mode = win.deviceMode || 'block';
  if (mode === 'off') return { ...base, allowed: true, reason: 'off' };
  const recognised = pc && !macMismatch;
  if (recognised) return { ...base, allowed: true, reason: 'pc' };
  if (mode === 'warn') return { ...base, allowed: true, reason: macMismatch ? 'mac_mismatch' : 'warn' };
  return { ...base, allowed: false, reason: macMismatch ? 'mac_mismatch' : 'unknown' };
}

// Rows of the given SQLite file's table ib_pc (mac_address, pc_name, ip_address) into exam_pcs.
// Only that table is read; the file is opened read-only.
function importPcs(file, room = null) {
  const src = new Database(file, { readonly: true, fileMustExist: true });
  try {
    const rows = src.prepare('SELECT mac_address, pc_name, ip_address FROM ib_pc ORDER BY id').all();
    let saved = 0;
    const skipped = [];
    for (const r of rows) {
      const name = String(r.pc_name || '').trim();
      const ip = normalizeIp(r.ip_address);
      if (!name || !IPV4.test(ip)) {
        skipped.push(name || `(строка без имени, IP ${ip || '—'})`);
        continue;
      }
      db.saveExamPc({ name, ip, mac: normalizeMac(r.mac_address), room: room || (name.match(/pc-(\d+)-/) || [])[1] || null });
      saved += 1;
    }
    return { saved, skipped, total: rows.length };
  } finally {
    src.close();
  }
}

function validPc({ name, ip, mac }) {
  if (!String(name || '').trim()) return 'Укажите имя компьютера.';
  if (!IPV4.test(normalizeIp(ip))) return 'IP-адрес — четыре числа через точку, например 192.168.100.15.';
  if (mac && !normalizeMac(mac)) return 'MAC-адрес — шесть пар шестнадцатеричных цифр через двоеточие.';
  return null;
}

module.exports = { DEVICE_MODES, checkDevice, importPcs, validPc, normalizeIp, normalizeMac, __resetArpForTests };
