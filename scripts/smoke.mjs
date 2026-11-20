// Smoke-Test: baut mit vite build, startet vite preview auf Port 5250 als Kindprozess, ruft die Seite und alle
// Dateien ab, auf die index.html und das gebaute JS verweisen, beendet den Kindprozess ueber seine Kennung und
// prueft, dass der Port wieder frei ist. Ausgang 0 nur, wenn jede Pruefung besteht. Keine neue Abhaengigkeit.
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VITE = path.join(WURZEL, 'node_modules', 'vite', 'bin', 'vite.js');
const PORT = 5250;
const BASIS = `http://localhost:${PORT}`;
const TITEL = 'I f***ing QUIT!';
const MIN_BUNDLE_BYTES = 100000;
const WARTE_BEREIT_MS = 5000;

let gesamt = 0;
let fehler = 0;
function pruefe(name, bedingung, detail = '') {
  gesamt++;
  if (!bedingung) fehler++;
  console.log(`${bedingung ? 'OK  ' : 'FAIL'} ${name}${detail === '' ? '' : ': ' + detail}`);
}
const warte = (ms) => new Promise((r) => setTimeout(r, ms));

// Verbindungsversuch: true, wenn jemand auf dem Port antwortet.
function portBelegt(host) {
  return new Promise((resolve) => {
    const s = net.connect({ port: PORT, host });
    s.setTimeout(1000);
    s.on('connect', () => { s.destroy(); resolve(true); });
    s.on('timeout', () => { s.destroy(); resolve(false); });
    s.on('error', () => resolve(false));
  });
}

// 1. Bau
const bau = spawnSync(process.execPath, [VITE, 'build'], { cwd: WURZEL, encoding: 'utf8', timeout: 120000 });
pruefe('vite build endet mit Ausgang 0', bau.status === 0, `Ausgang ${bau.status}`);
if (bau.status !== 0) {
  console.log(bau.stdout + bau.stderr);
  process.exit(1);
}

// 2. Vorschau-Server als Kindprozess
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

  if (bereit) {
    // 3. Startseite
    const r = await fetch(`${BASIS}/`, { signal: AbortSignal.timeout(5000) });
    const html = await r.text();
    pruefe('GET / liefert Status 200', r.status === 200, String(r.status));
    pruefe('GET / hat content-type html', (r.headers.get('content-type') ?? '').includes('text/html'), r.headers.get('content-type') ?? '');
    pruefe('GET / enthaelt den Titel "I f***ing QUIT!"', html.includes(`<title>${TITEL}</title>`));

    // 4. Verweise aus index.html und aus dem gebauten JS
    const verweise = new Set();
    for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) if (!m[1].startsWith('http')) verweise.add(m[1]);
    const skripte = [...verweise].filter((v) => v.endsWith('.js'));
    pruefe('index.html verweist auf mindestens ein JS-Bundle', skripte.length >= 1, skripte.join(', '));
    const bilder = new Set();
    for (const s of skripte) {
      const js = await (await fetch(`${BASIS}${s}`, { signal: AbortSignal.timeout(5000) })).text();
      for (const m of js.matchAll(/["'`/]([\w-]+\.(?:png|jpg|jpeg|svg|ico|webp))["'`]/g)) bilder.add(m[1]);
    }
    for (const b of bilder) verweise.add(b.startsWith('/') ? b : `/${b}`);
    const liste = [...verweise].map((v) => (v.startsWith('/') ? v : `/${v}`));
    console.log(`Abzurufende Dateien (${liste.length}): ${liste.join(', ')}`);
    for (const u of liste) {
      const a = await fetch(`${BASIS}${u}`, { signal: AbortSignal.timeout(5000) });
      const bytes = (await a.arrayBuffer()).byteLength;
      pruefe(`GET ${u} liefert Status 200`, a.status === 200, `${a.status}, ${bytes} Bytes`);
      // Der Vorschau-Server beantwortet unbekannte Pfade mit index.html (Status 200): die Art der Datei muss stimmen.
      const art = a.headers.get('content-type') ?? '';
      if (/\.(png|jpg|jpeg|svg|ico|webp)$/.test(u)) pruefe(`GET ${u} ist ein Bild (content-type image/...)`, art.startsWith('image/'), art);
      if (u.endsWith('.js')) pruefe(`GET ${u} ist JavaScript`, art.includes('javascript'), art);
      if (u.endsWith('.js')) pruefe(`JS-Bundle ${u} ist groesser als ${MIN_BUNDLE_BYTES} Bytes`, bytes > MIN_BUNDLE_BYTES, String(bytes));
    }
    pruefe('Logo (im JS) und Icons (in index.html) sind eingebunden', bilder.has('logo.png') && liste.some((u) => u.includes('icon')), [...bilder].join(', '));
  }
} finally {
  // 5. Kindprozess ueber die Kennung beenden
  kind.kill();
}
await warte(500);
let lebt = true;
try { process.kill(pid, 0); } catch { lebt = false; }
pruefe('Kindprozess ist beendet (Prozesskennung nicht mehr vorhanden)', !lebt, `Kennung ${pid}`);
const belegt = (await portBelegt('127.0.0.1')) || (await portBelegt('::1'));
pruefe('Port 5250 ist wieder frei', !belegt);
console.log(`Smoke-Test: ${gesamt - fehler} von ${gesamt} Pruefungen bestanden`);
process.exit(fehler === 0 ? 0 : 1);
