// Smoke-Test. Zwei Modi:
//   npm run smoke               baut mit vite build, startet vite preview auf Port 5250 als Kindprozess, ruft die Seite und
//                               alle Dateien ab, auf die index.html und das gebaute JS verweisen, ruft die Seite danach aus
//                               einem Unterpfad ab (einfacher Dateiserver auf Port 5270 ueber dist), beendet den Kindprozess
//                               ueber seine Prozesskennung und prueft, dass die Ports wieder frei sind.
//   npm run smoke -- <Adresse>  ohne Server und ohne Bau: ruft die Adresse (z. B. die veroeffentlichte Seite) ab und prueft
//                               Seite, Titel, alle Dateien, Dateiart und Bundle-Groesse.
// Ausgang 0 nur, wenn jede Pruefung besteht. Keine neue Abhaengigkeit.
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VITE = path.join(WURZEL, 'node_modules', 'vite', 'bin', 'vite.js');
const PORT = 5250;
const PORT_UNTERPFAD = 5270;
const UNTERPFAD = '/unterordner/';
const BASIS = `http://localhost:${PORT}`;
const TITEL = 'I f***ing QUIT!';
const MIN_BUNDLE_BYTES = 100000;
const WARTE_BEREIT_MS = 5000;
const ARTEN = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', svg: 'image/svg+xml', ico: 'image/', webp: 'image/webp', js: 'javascript', html: 'text/html' };

let gesamt = 0;
let fehler = 0;
function pruefe(name, bedingung, detail = '') {
  gesamt++;
  if (!bedingung) fehler++;
  console.log(`${bedingung ? 'OK  ' : 'FAIL'} ${name}${detail === '' ? '' : ': ' + detail}`);
}
const warte = (ms) => new Promise((r) => setTimeout(r, ms));
const holen = (url, opt = {}) => fetch(url, { signal: AbortSignal.timeout(8000), ...opt });

// Verbindungsversuch: true, wenn jemand auf dem Port antwortet.
function portBelegt(port, host) {
  return new Promise((resolve) => {
    const s = net.connect({ port, host });
    s.setTimeout(1000);
    s.on('connect', () => { s.destroy(); resolve(true); });
    s.on('timeout', () => { s.destroy(); resolve(false); });
    s.on('error', () => resolve(false));
  });
}

// Seite und alle Dateien, auf die sie und das gebaute JS verweisen. `basis` endet mit "/".
// extra: zusaetzliche Pruefungen fuer Unterpfad und veroeffentlichte Seite (relative Verweise, keine Weiterleitung).
async function pruefeSeite(basis, { praefix = '', extra = false, https = false } = {}) {
  const p = praefix;
  const r = await holen(basis, { redirect: 'manual' });
  const html = await r.text();
  pruefe(`${p}GET / liefert Status 200`, r.status === 200, String(r.status));
  pruefe(`${p}GET / hat content-type html`, (r.headers.get('content-type') ?? '').includes('text/html'), r.headers.get('content-type') ?? '');
  pruefe(`${p}GET / enthaelt den Titel "I f***ing QUIT!"`, html.includes(`<title>${TITEL}</title>`));
  if (extra) {
    pruefe(`${p}GET / ohne Weiterleitung und ohne Anmeldeseite (Status 200, kein Location-Kopf)`, r.status === 200 && r.headers.get('location') === null);
    pruefe(`${p}GET / enthaelt den Spielcontainer <div id="spiel">`, html.includes('<div id="spiel">'));
    if (https) pruefe(`${p}Adresse beginnt mit https://`, basis.startsWith('https://'), basis);
  }
  const verweise = new Set();
  for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) if (!m[1].startsWith('http')) verweise.add(m[1]);
  if (extra) {
    const absolut = [...verweise].filter((v) => v.startsWith('/'));
    pruefe(`${p}alle Verweise der Seite sind relativ (keine fuehrenden /)`, absolut.length === 0, absolut.join(', '));
  }
  const skripte = [...verweise].filter((v) => v.endsWith('.js'));
  pruefe(`${p}index.html verweist auf mindestens ein JS-Bundle`, skripte.length >= 1, skripte.join(', '));
  const bilder = new Set();
  for (const s of skripte) {
    const js = await (await holen(new URL(s, basis))).text();
    for (const m of js.matchAll(/["'`/]([\w-]+\.(?:png|jpg|jpeg|svg|ico|webp))["'`]/g)) bilder.add(m[1]);
  }
  for (const b of bilder) verweise.add(b);
  const liste = [...verweise];
  console.log(`${p}Abzurufende Dateien (${liste.length}): ${liste.map((v) => new URL(v, basis).pathname).join(', ')}`);
  for (const v of liste) {
    const url = new URL(v, basis);
    const u = url.pathname;
    const a = await holen(url);
    const bytes = (await a.arrayBuffer()).byteLength;
    pruefe(`${p}GET ${u} liefert Status 200`, a.status === 200, `${a.status}, ${bytes} Bytes`);
    // Ein Server kann unbekannte Pfade mit index.html (Status 200) beantworten: die Art der Datei muss stimmen.
    const art = a.headers.get('content-type') ?? '';
    const ende = u.split('.').pop();
    if (['png', 'jpg', 'jpeg', 'svg', 'ico', 'webp'].includes(ende)) pruefe(`${p}GET ${u} ist ein Bild (content-type image/...)`, art.startsWith('image/'), art);
    if (u.endsWith('.js')) pruefe(`${p}GET ${u} ist JavaScript`, art.includes('javascript'), art);
    if (u.endsWith('.js')) pruefe(`${p}JS-Bundle ${u} ist groesser als ${MIN_BUNDLE_BYTES} Bytes`, bytes > MIN_BUNDLE_BYTES, String(bytes));
  }
  pruefe(`${p}Logo (im JS) und Icons (in index.html) sind eingebunden`, bilder.has('logo.png') && liste.some((u) => u.includes('icon')), [...bilder].join(', '));
}

// ---------------------------------------------------------------- Modus 2: veroeffentlichte Adresse
// Rotproben des Live-Modus gegen die veroeffentlichte Seite (je vier Zustaende, Lauf vom 20.11.2026):
//   (a) rot am 20.11.2026 gegen falschen erwarteten Titel (scripts/smoke.mjs:22), gruen gegen 3097bb1, rot mit Titelmuster mit Zusatzzeichen (scripts/smoke.mjs:56), wieder gruen
//   (b) rot am 20.11.2026 gegen Adresse mit nicht vorhandenem Pfad nichtda/, gruen gegen 3097bb1, rot mit nicht vorhandenem Pfad img/seite2/, wieder gruen
//   (c) rot am 20.11.2026 gegen verlaengerten Bildnamen (scripts/smoke.mjs:75), gruen gegen 3097bb1, rot mit Bildname mit Vorsatz x- (scripts/smoke.mjs:75), wieder gruen
const adresse = process.argv[2];
if (adresse !== undefined) {
  const basis = adresse.endsWith('/') ? adresse : `${adresse}/`;
  console.log(`Live-Modus: ${basis} (ohne Server, ohne Bau)`);
  await pruefeSeite(basis, { extra: true, https: true });
  console.log(`Smoke-Test (Live): ${gesamt - fehler} von ${gesamt} Pruefungen bestanden`);
  process.exit(fehler === 0 ? 0 : 1);
}

// ---------------------------------------------------------------- Modus 1: Bau, Vorschau, Unterpfad
const bau = spawnSync(process.execPath, [VITE, 'build'], { cwd: WURZEL, encoding: 'utf8', timeout: 120000 });
pruefe('vite build endet mit Ausgang 0', bau.status === 0, `Ausgang ${bau.status}`);
if (bau.status !== 0) {
  console.log(bau.stdout + bau.stderr);
  process.exit(1);
}

// Vorschau-Server als Kindprozess
const kind = spawn(process.execPath, [VITE, 'preview', '--port', String(PORT), '--strictPort'], { cwd: WURZEL, stdio: ['ignore', 'pipe', 'pipe'] });
const pid = kind.pid;
console.log(`Kindprozess vite preview, Prozesskennung ${pid}, Port ${PORT}`);
let protokoll = '';
kind.stdout.on('data', (d) => { protokoll += d; });
kind.stderr.on('data', (d) => { protokoll += d; });
let beendetVorzeitig = false;
kind.on('exit', () => { beendetVorzeitig = true; });

try {
  let bereit = false;
  for (let t = 0; t < WARTE_BEREIT_MS && !bereit && !beendetVorzeitig; t += 100) {
    await warte(100);
    bereit = protokoll.replace(/\u001b\[[0-9;]*m/g, '').includes(`:${PORT}`);
  }
  pruefe('vite preview ist auf Port 5250 bereit', bereit, bereit ? '' : protokoll.trim());
  if (bereit) await pruefeSeite(`${BASIS}/`);
} finally {
  // Kindprozess ueber die Kennung beenden
  kind.kill();
}
await warte(500);
let lebt = true;
try { process.kill(pid, 0); } catch { lebt = false; }
pruefe('Kindprozess ist beendet (Prozesskennung nicht mehr vorhanden)', !lebt, `Kennung ${pid}`);
const belegt = (await portBelegt(PORT, '127.0.0.1')) || (await portBelegt(PORT, '::1'));
pruefe('Port 5250 ist wieder frei', !belegt);

// Unterpfad: einfacher Dateiserver ueber dist, nur unter /unterordner/ erreichbar (alles andere 404)
const dist = path.join(WURZEL, 'dist');
const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  if (!url.pathname.startsWith(UNTERPFAD)) { res.writeHead(404).end('nicht gefunden'); return; }
  let rel = decodeURIComponent(url.pathname.slice(UNTERPFAD.length));
  if (rel === '') rel = 'index.html';
  const datei = path.normalize(path.join(dist, rel));
  if (!datei.startsWith(dist)) { res.writeHead(403).end('verboten'); return; }
  try {
    const inhalt = readFileSync(datei);
    const ende = datei.split('.').pop() ?? '';
    res.writeHead(200, { 'content-type': ende === 'js' ? 'text/javascript' : (ARTEN[ende] ?? 'application/octet-stream').replace(/^image\/$/, 'image/x-icon').replace(/^javascript$/, 'text/javascript') });
    res.end(inhalt);
  } catch {
    res.writeHead(404).end('nicht gefunden');
  }
});
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(PORT_UNTERPFAD, '127.0.0.1', resolve); });
console.log(`Dateiserver fuer den Unterpfad ${UNTERPFAD} auf Port ${PORT_UNTERPFAD} (in diesem Prozess)`);
try {
  await pruefeSeite(`http://127.0.0.1:${PORT_UNTERPFAD}${UNTERPFAD}`, { praefix: 'Unterpfad: ', extra: true });
} finally {
  await new Promise((r) => server.close(r));
}
const belegt2 = (await portBelegt(PORT_UNTERPFAD, '127.0.0.1')) || (await portBelegt(PORT_UNTERPFAD, '::1'));
pruefe('Port 5270 ist wieder frei', !belegt2);
console.log(`Smoke-Test: ${gesamt - fehler} von ${gesamt} Pruefungen bestanden`);
process.exit(fehler === 0 ? 0 : 1);
