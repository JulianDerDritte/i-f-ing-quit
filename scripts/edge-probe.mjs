// Edge-Probelauf (A-012): startet die gebaute Seite aus einer Kopie (Ordner mit index.html) auf einem eigenen Port, oeffnet sie
// in Edge ohne Fenster (--headless, eigenes --user-data-dir) ueber das DevTools-Protokoll (Node 24, eingebautes WebSocket, kein
// neues Paket) und belegt: Zoom im Spielfenster, Oberflaeche ohne Zoom, Knoepfe reagieren, vier Kartenraender per Tasten,
// NPC-Name und Maschinenbeschriftung im Zoom, Konsole ohne Fehler, Zuordnungspruefung (auch das absichtlich nicht zugeordnete
// Objekt wirft). Ergebnis: PNG-Standbilder und probe.json im Ausgabeordner.
// Aufruf: node scripts/edge-probe.mjs <Ordner mit index.html> <Ausgabeordner> <user-data-dir> [Seitenport] [DevTools-Port]
// Beendet wird nur der selbst gestartete Edge-Prozess, ueber seine Kennung (PID). Ports 5173 und 5174 werden nie benutzt.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const [seitenOrdner, ausgabe, userDaten, seitenPortArg, dtPortArg] = process.argv.slice(2);
if (seitenOrdner === undefined || ausgabe === undefined || userDaten === undefined) throw new Error('Aufruf: node scripts/edge-probe.mjs <Ordner> <Ausgabeordner> <user-data-dir> [Seitenport] [DevTools-Port]');
const SEITENPORT = Number(seitenPortArg ?? 5281);
const DTPORT = Number(dtPortArg ?? 9331);
if ([5173, 5174].includes(SEITENPORT) || [5173, 5174].includes(DTPORT)) throw new Error('Port 5173/5174 gehoert Julians Programm');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
if (!existsSync(EDGE)) throw new Error('Edge nicht gefunden: ' + EDGE);
mkdirSync(ausgabe, { recursive: true });
mkdirSync(userDaten, { recursive: true });

const ARTEN = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.css': 'text/css' };
const server = createServer((req, res) => {
  const pfad = new URL(req.url ?? '/', 'http://x').pathname;
  const datei = path.join(seitenOrdner, pfad === '/' ? 'index.html' : pfad);
  if (!datei.startsWith(path.resolve(seitenOrdner)) || !existsSync(datei)) {
    res.writeHead(404);
    res.end('nicht gefunden');
    return;
  }
  res.writeHead(200, { 'content-type': ARTEN[path.extname(datei)] ?? 'application/octet-stream' });
  res.end(readFileSync(datei));
});
await new Promise((ok) => server.listen(SEITENPORT, '127.0.0.1', ok));

const warte = (ms) => new Promise((r) => setTimeout(r, ms));
const bericht = { schritte: [], konsolenFehler: [], netzwerkFehler: [], ausnahmen: [] };
const merke = (name, wert) => {
  bericht.schritte.push({ name, ...wert });
  console.log(name, JSON.stringify(wert));
};

const edge = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${DTPORT}`, `--user-data-dir=${userDaten}`, '--window-size=800,700', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', '--mute-audio', 'about:blank'], { stdio: 'ignore' });
const edgePid = edge.pid;
console.log('Edge PID', edgePid);
let ws = null;
let browserWs = null;
let edgePids = [edgePid]; // Kennungen aller Prozesse dieses Edge (Browser, Renderer, GPU ...), vom Browser selbst gemeldet
try {
  // DevTools-Seite abwarten
  let ziel = null;
  for (let i = 0; i < 50 && ziel === null; i++) {
    try {
      const liste = await (await fetch(`http://127.0.0.1:${DTPORT}/json/list`)).json();
      ziel = liste.find((t) => t.type === 'page') ?? null;
    } catch {
      /* Edge startet noch */
    }
    if (ziel === null) await warte(200);
  }
  if (ziel === null) throw new Error('Edge-DevTools nicht erreichbar');
  // Browser-Verbindung: die Kennungen aller Prozesse dieses Edge einsammeln und am Ende den Browser ordentlich schliessen
  const version = await (await fetch(`http://127.0.0.1:${DTPORT}/json/version`)).json();
  browserWs = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((ok, fehl) => {
    browserWs.addEventListener('open', ok);
    browserWs.addEventListener('error', () => fehl(new Error('Browser-WebSocket-Fehler')));
  });
  const browserSende = (id, methode) =>
    new Promise((ok) => {
      const h = (m) => {
        const d = JSON.parse(m.data);
        if (d.id === id) {
          browserWs.removeEventListener('message', h);
          ok(d.result ?? d.error);
        }
      };
      browserWs.addEventListener('message', h);
      browserWs.send(JSON.stringify({ id, method: methode }));
    });
  const info = await browserSende(1, 'SystemInfo.getProcessInfo');
  edgePids = [...new Set([edgePid, ...(info.processInfo ?? []).map((q) => q.id)])];
  console.log('Edge-Prozesse (Kennungen):', edgePids.join(','));
  ws = new WebSocket(ziel.webSocketDebuggerUrl);
  await new Promise((ok, fehl) => {
    ws.addEventListener('open', ok);
    ws.addEventListener('error', () => fehl(new Error('WebSocket-Fehler')));
  });
  let zaehler = 0;
  const offen = new Map();
  ws.addEventListener('message', (m) => {
    const d = JSON.parse(m.data);
    if (d.id !== undefined && offen.has(d.id)) {
      const { ok, fehl } = offen.get(d.id);
      offen.delete(d.id);
      if (d.error) fehl(new Error(JSON.stringify(d.error)));
      else ok(d.result);
    } else if (d.method === 'Runtime.consoleAPICalled' && (d.params.type === 'error' || d.params.type === 'assert')) {
      bericht.konsolenFehler.push(d.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
    } else if (d.method === 'Runtime.exceptionThrown') {
      bericht.ausnahmen.push(d.params.exceptionDetails.exception?.description ?? d.params.exceptionDetails.text);
    } else if (d.method === 'Network.loadingFailed') {
      bericht.netzwerkFehler.push(d.params.errorText);
    } else if (d.method === 'Network.responseReceived' && d.params.response.status >= 400) {
      bericht.netzwerkFehler.push(`${d.params.response.status} ${d.params.response.url}`);
    }
  });
  const sende = (methode, params = {}) =>
    new Promise((ok, fehl) => {
      const id = ++zaehler;
      offen.set(id, { ok, fehl });
      ws.send(JSON.stringify({ id, method: methode, params }));
      setTimeout(() => {
        if (offen.has(id)) {
          offen.delete(id);
          fehl(new Error('Zeitueberschreitung ' + methode));
        }
      }, 20000);
    });
  const auswerten = async (ausdruck) => {
    const r = await sende('Runtime.evaluate', { expression: ausdruck, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error('Auswertung: ' + JSON.stringify(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text));
    return r.result.value;
  };
  await sende('Runtime.enable');
  await sende('Network.enable');
  await sende('Page.enable');
  await sende('Emulation.setDeviceMetricsOverride', { width: 800, height: 640, deviceScaleFactor: 1, mobile: false });
  await sende('Emulation.setFocusEmulationEnabled', { enabled: true });
  await sende('Page.bringToFront');

  const bild = async (name) => {
    const r = await sende('Page.captureScreenshot', { format: 'png' });
    writeFileSync(path.join(ausgabe, name), Buffer.from(r.data, 'base64'));
  };
  const klick = async (x, y) => {
    await sende('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await sende('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await sende('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  };
  const TASTEN = { a: 65, d: 68, w: 87, s: 83, e: 69, i: 73, Escape: 27 };
  const gedrueckt = new Set();
  const taste = async (name, an) => {
    if (an === gedrueckt.has(name)) return;
    if (an) gedrueckt.add(name);
    else gedrueckt.delete(name);
    const code = TASTEN[name];
    await sende('Input.dispatchKeyEvent', { type: an ? 'keyDown' : 'keyUp', key: name, code: name.length === 1 ? 'Key' + name.toUpperCase() : name, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code });
  };
  const alleLoslassen = async () => {
    for (const n of [...gedrueckt]) await taste(n, false);
  };
  const zustand = () =>
    auswerten(`(() => { const p = window.__probe; const s = p.szene; const w = p.haupt.worldView; return { pos: s.pos, phase: s.zustand.phase, rest: s.zustand.rest, zoom: p.haupt.zoom, uiZoom: p.ui.zoom, sicht: { x: w.x, y: w.y, b: w.width, h: w.height }, grenzen: { x: p.haupt.getBounds().x, y: p.haupt.getBounds().y, b: p.haupt.getBounds().width, h: p.haupt.getBounds().height }, bereich: s.bereich }; })()`);

  const seite = (suche) => `http://127.0.0.1:${SEITENPORT}/index.html${suche}`;
  const startspiel = async (suche) => {
    await sende('Page.navigate', { url: seite(suche) });
    await warte(2500);
    await klick(400, 370); // Stufe "Leicht"
    await warte(2500);
  };

  // 1. Zuordnungsprobe zuerst: ein absichtlich nicht zugeordnetes Objekt muss werfen
  await startspiel('?zeit=3600&probe=zuordnung');
  const wurf = bericht.ausnahmen.concat(bericht.konsolenFehler).find((t) => String(t).includes('Kamerazuordnung fehlerhaft'));
  merke('zuordnung-nicht-zugeordnetes-objekt-wirft', { ok: wurf !== undefined, meldung: wurf === undefined ? null : String(wurf).split('\n')[0] });
  bericht.ausnahmen = [];
  bericht.konsolenFehler = [];

  // 2. normaler Lauf
  await startspiel('?zeit=3600&probe=1');
  const z0 = await zustand();
  const gross = await auswerten('(() => { const c = document.querySelector("canvas"); const s = window.__probe.szene; return { canvas: [c.width, c.height], figurAnzeige: s.figurBild.displayHeight, kinder: s.children.list.length }; })()');
  merke('spielfenster-und-zoom', { canvas: gross.canvas, zoomHaupt: z0.zoom, zoomOberflaeche: z0.uiZoom, figurHoeheWelt: gross.figurAnzeige, figurHoeheBildschirm: gross.figurAnzeige * z0.zoom, objekte: gross.kinder, ok: gross.canvas[0] === 800 && gross.canvas[1] === 640 && z0.zoom === 2 && z0.uiZoom === 1 && gross.figurAnzeige * z0.zoom === 70 });
  await bild('edge-start-zoom.png');

  // 3. Knoepfe reagieren (Oberflaechenkamera): Inventar oeffnen und schliessen
  await klick(705, 70);
  await warte(400);
  const inv = await zustand();
  await bild('edge-inventar.png');
  await taste('Escape', true);
  await warte(150); // die Taste muss ueber ein Bild gehalten werden, sonst sieht die Szene den Druck nicht
  await taste('Escape', false);
  await warte(400);
  const inv2 = await zustand();
  merke('knoepfe-reagieren-inventar', { phaseNachKlick: inv.phase, phaseNachEscape: inv2.phase, ok: inv.phase === 'inventar' && inv2.phase === 'laeuft' });

  // 4. fahren: Regler mit Tasten, Ziel in Zellen (Mitte der Zelle), bricht bei Gespraechen ab und schliesst sie
  const gespraechSchliessen = async () => {
    for (let i = 0; i < 12; i++) {
      const z = await zustand();
      if (z.phase !== 'dialog') return i;
      for (const y of [520, 562, 604]) {
        await klick(400, y);
        await warte(60);
      }
      await warte(150);
    }
    return -1;
  };
  let gespraeche = 0;
  const fahreZu = async (zx, zy, tol = 0.35, maxMs = 25000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < maxMs) {
      let z = await zustand();
      if (z.phase === 'dialog') {
        await alleLoslassen();
        gespraeche++;
        await gespraechSchliessen();
        continue;
      }
      if (z.phase !== 'laeuft') throw new Error('Phase ' + z.phase);
      const dx = zx - z.pos.x;
      const dy = zy - z.pos.y;
      if (Math.hypot(dx, dy) < tol) {
        await alleLoslassen();
        return z;
      }
      const sx = (dx - dy) * 32;
      const sy = (dx + dy) * 16;
      await taste('d', sx > 6);
      await taste('a', sx < -6);
      await taste('s', sy > 3);
      await taste('w', sy < -3);
      await warte(40);
    }
    await alleLoslassen();
    return await zustand();
  };
  // Ersatz, wenn die Fahrt per Tasten nicht bis zum Rand kommt (Gespraeche mit NPCs unterwegs): die Position der Figur wird im
  // Probelauf gesetzt (nur Zustand der Szene im Browser, kein Code geaendert); der Beleg ist dann als "ersatz" gekennzeichnet.
  const setzePos = (x, y) => auswerten(`(() => { window.__probe.szene.pos = { x: ${x}, y: ${y} }; return true; })()`);
  const rand = async (name, wege, ersatzPos) => {
    let z = null;
    let ersatz = false;
    for (const [x, y] of wege) z = await fahreZu(x, y, 0.35, 12000);
    await warte(300);
    z = await zustand();
    const pruefe = (q) => {
      const g = q.grenzen;
      const s = q.sicht;
      const eps = 0.01;
      return {
        innen: s.x >= g.x - eps && s.y >= g.y - eps && s.x + s.b <= g.x + g.b + eps && s.y + s.h <= g.y + g.h + eps,
        beruehrt: { links: Math.abs(s.x - g.x) < eps, rechts: Math.abs(s.x + s.b - (g.x + g.b)) < eps, oben: Math.abs(s.y - g.y) < eps, unten: Math.abs(s.y + s.h - (g.y + g.h)) < eps },
      };
    };
    if (ersatzPos !== undefined && pruefe(z).beruehrt[name] !== true) {
      ersatz = true;
      await setzePos(ersatzPos[0], ersatzPos[1]);
      await warte(600);
      z = await zustand();
    }
    // das sichtbare Weltbild liegt in den Kartengrenzen und beruehrt am Rand die Grenze
    const p = pruefe(z);
    merke('rand-' + name, { pos: z.pos, sicht: z.sicht, innenDerGrenzen: p.innen, beruehrt: p.beruehrt, ersatzPositionGesetzt: ersatz, ok: p.innen && p.beruehrt[name] === true });
    await bild(`edge-rand-${name}.png`);
  };
  try {
    await rand('links', [[1.5, 15.5]]);
    await rand('oben', [[1.5, 1.5]]);
    await fahreZu(8.5, 7.5, 0.4);
    await fahreZu(25.5, 7.5, 0.4);
    await rand('unten', [[25.5, 15.5], [30.5, 16.5]], [30.5, 16.5]);
    await rand('rechts', [[30.5, 9.5], [30.5, 1.5]], [30.5, 1.5]);
  } catch (e) {
    merke('raender-fahrt-abgebrochen', { grund: String(e.message), ok: false });
  }
  merke('gespraeche-unterwegs-geschlossen', { anzahl: gespraeche });

  // 5. Maschinenbeschriftung und NPC-Name im Zoom
  try {
    await fahreZu(25.5, 7.5, 0.4);
    await fahreZu(12.5, 7.5, 0.4);
    await fahreZu(12.5, 14.5, 0.4);
    await alleLoslassen();
    await warte(300);
    await bild('edge-maschine-zoom.png');
    const text = await auswerten('(() => { const s = window.__probe.szene; return { namen: s.npcNamen.length, chef: !!s.chefName }; })()');
    merke('maschine-und-npc-namen-im-zoom', { ...text, hinweis: 'Aussehen im Standbild edge-maschine-zoom.png (Maschinenbeschriftung); NPC-Namen im Standbild, wenn ein NPC im Bild ist' });
  } catch (e) {
    merke('maschine-fahrt-abgebrochen', { grund: String(e.message), ok: false });
  }

  // 6. Neustart-Probe: Menue und wieder Spiel (frische Kameras)
  await alleLoslassen();
  await klick(705, 28); // Zurueck zum Menue
  await warte(1200);
  await klick(400, 370);
  await warte(1800);
  const z2 = await zustand();
  merke('menue-spiel-frisch', { zoomHaupt: z2.zoom, zoomOberflaeche: z2.uiZoom, phase: z2.phase, ok: z2.zoom === 2 && z2.uiZoom === 1 && z2.phase === 'laeuft' });
  await bild('edge-nach-menuewechsel.png');
} catch (e) {
  merke('probe-abgebrochen', { grund: String(e.message), ok: false });
} finally {
  try {
    ws?.close();
  } catch {
    /* schon zu */
  }
  try {
    if (browserWs !== null) browserWs.send(JSON.stringify({ id: 99, method: 'Browser.close' }));
  } catch {
    /* schon zu */
  }
  await warte(2500);
  // Was danach noch lebt (nur Kennungen dieses Edge), wird ueber die Kennung beendet
  for (const pid of edgePids) {
    try {
      process.kill(pid, 0);
      process.kill(pid);
      console.log('Edge-Prozess noch aktiv, ueber Kennung beendet:', pid);
    } catch {
      /* beendet */
    }
  }
  await warte(1000);
  server.close();
  bericht.konsolenFehlerZahl = bericht.konsolenFehler.length;
  writeFileSync(path.join(ausgabe, 'probe.json'), JSON.stringify(bericht, null, 2));
  console.log('Konsolenfehler:', bericht.konsolenFehler.length, 'Ausnahmen:', bericht.ausnahmen.length, 'Netzwerk:', bericht.netzwerkFehler.length);
}
