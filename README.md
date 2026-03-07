# Tracky-OSINT

**Tracky-OSINT** ist ein modulares Open-Source-Intelligence (OSINT) Tool, das entwickelt wurde, um verschiedene Informationen anhand von Benutzernamen, E-Mail-Adressen und Telefonnummern automatisiert zu analysieren. 

> **Wichtiger Hinweis:** Dieses Tool darf ausschließlich für legale Zwecke verwendet werden. Die Nutzung ist nur im Rahmen geltender Gesetze zulässig. Der Anwender trägt die volle Verantwortung für die Verwendung dieses Tools.

## Inhaltsverzeichnis

1. [Features](#features)
2. [Performance & Optimierungen](#performance--optimierungen)
3. [Funktionsweise](#funktionsweise)
4. [Unterstützte Plattformen](#unterstützte-plattformen)
5. [Technischer Aufbau](#technischer-aufbau)
6. [Cache- & Datenbank-System](#cache--datenbank-system)
7. [Erkennungslogik](#erkennungslogik)
8. [Ablauf einer Abfrage](#ablauf-einer-abfrage)
9. [Installation](#installation)
10. [Benutzung](#benutzung)
11. [Konfiguration](#konfiguration)

---

## 1. Features

- Automatische Suche nach Social-Media-Profilen anhand von Usernamen  
- Automatische Suche nach registrierten Accounts anhand von E-Mail-Adressen
- Analyse von Mobilfunk- und Festnetznummern mit Länder- und Anbieterinformationen  
- Kombination aus Axios und Puppeteer für schnelle und dynamische Anfragen  
- Parallele Verarbeitung mit optimierter Concurrency
- Dynamische Header-Generierung pro Request für bessere Anti-Bot-Umgehung
- Login-Redirect-Erkennung verhindert falsche Treffer (false-True)
- Nutzung von JSON-Datenbanken für Vorwahl- und Anbieterdaten (DE, US, FR)  
- Intelligente Erkennung von „Profil existiert nicht"  
- Drei Erkennungsmethoden für E-Mail-Checks: öffentliche APIs, Validierungs-Endpoints, Fehlercode-Analyse
- 10-Minuten-Cache für schnelle Wiederholungen
- Proxy-Unterstützung für anonyme Anfragen
- Fehler- und Timeout-Handling  
- Sortierte Ausgabe: Gefunden, nicht gefunden, Fehler
- Übersichtliche Konsolenausgabe  

---

## 2. Performance & Optimierungen

### Social-Media-Suche

Durchschnittliche Suchzeit für 114 Social-Media-Plattformen: **ca. 60 Sekunden**

| Phase | Methode | URLs | Zeit |
|-------|---------|------|------|
| Axios-Scan | 20 parallel | 114 | 5-8s |
| Puppeteer-Check | 3 Browser parallel | 30-40 | 50-60s |
| **Gesamt** | | **114** | **~60s** |

### E-Mail-Suche

Durchschnittliche Suchzeit für 16 Plattformen: **ca. 8 Sekunden**

| Phase | Methode | Plattformen | Zeit |
|-------|---------|-------------|------|
| API-Checks | 10 parallel | 16 | 5-10s |
| **Gesamt** | | **16** | **~8s** |

Kein Puppeteer nötig — alle Checks laufen über direkte HTTPS-Anfragen an öffentliche Endpoints.

### Technische Optimierungen

#### Axios-Optimierungen (Social-Media)
- Parallele Batch-Verarbeitung: 20 URLs gleichzeitig
- Reduzierter Timeout: 3 Sekunden für schnelle Fehlerkennung
- Effizientes Error-Handling ohne Blockierung
- Dynamische Header pro Request: Anti-Bot-Erkennung wird erschwert, da jede URL einen eigenen zufällig generierten User-Agent erhält (vorher: ein Header für alle ~110 URLs)
- Login-Redirect-Erkennung: verhindert false-True durch Login-Weiterleitungen

#### Puppeteer-Optimierungen (Social-Media)
- Separate Browser-Instanzen: Jeder Browser lädt nur 1 Tab
- Batch-Verarbeitung: 3 Browser parallel
- Keine Ressourcen-Konkurrenz zwischen Tabs
- Jeder Browser erhält volle CPU/RAM/Network-Ressourcen
- Twitch: zusätzliches `waitForSelector` für vollständiges React-Rendering

#### Mail-Checker-Optimierungen
- Eigene `runWithConcurrency()` Funktion: 10 Requests gleichzeitig
- Timeout: 8 Sekunden pro Request
- Kein Puppeteer nötig — alle Endpoints antworten direkt
- In-Memory-Cache: Wiederholte Checks unter 1 Sekunde

#### Warum separate Browser? (Social-Media)

**Problem mit mehreren Tabs im gleichen Browser:**
```
1 Browser mit 3 Tabs:
  - CPU: 33% pro Tab
  - Shared Memory
  - Geteilte Netzwerk-Bandbreite
  → Langsameres Laden
  → Timeouts bei schweren Seiten
```

**Lösung mit separaten Browsern:**
```
3 Browser mit je 1 Tab:
  - CPU: 100% pro Browser
  - Dedizierter Speicher
  - Volle Netzwerk-Bandbreite
  → Schnelleres Laden
  → Keine Timeouts
```

---

## 3. Funktionsweise

### Social-Media-Suche
1. Benutzer gibt einen **Username** ein
2. Cache wird geprüft (instant Antwort wenn vorhanden)
3. Axios führt schnelle HTTP-Requests aus (parallel, mit individuellem Header pro URL)
4. Nach jedem Request: Login-Redirect-Prüfung via `isLoginRedirect()`
5. Unklare Ergebnisse (Status 200) werden mit Puppeteer geprüft
6. Puppeteer prüft HTML auf Login-Walls und plattformspezifische Not-Found-Muster
7. Ergebnisse werden sortiert: Gefunden, nicht gefunden, Fehler
8. Ergebnisse werden gespeichert und in der Konsole ausgegeben

### E-Mail-Suche
1. Benutzer gibt eine **E-Mail-Adresse** ein
2. Format wird validiert
3. Cache wird geprüft (instant Antwort wenn vorhanden)
4. Alle Checker laufen parallel mit Concurrency-Limit
5. Jeder Checker nutzt eine von drei Methoden: öffentliche API, Validierungs-Endpoint oder Fehlercode-Analyse
6. Ergebnisse werden sortiert: Gefunden, nicht gefunden, Fehler
7. Ergebnisse werden gespeichert und in der Konsole ausgegeben

### Telefonnummern-Analyse
1. Benutzer gibt eine **Telefonnummer** ein
2. `libphonenumber-js` ermittelt Typ, Land und Vorwahl
3. Festnetznummern werden mit Python-Skript `Festnetz_Analyse.py` analysiert
4. Ergebnis wird in der Konsole ausgegeben

---

## 4. Unterstützte Plattformen

### Social-Media (114 Plattformen)

- Instagram, Facebook, X (Twitter), GitHub, Reddit
- LinkedIn, YouTube, TikTok, Pinterest, Snapchat
- WhatsApp, Telegram, Discord, Signal, Twitch
- Steam, und 100+ weitere Plattformen

### E-Mail-Checker (16 Plattformen)

| Plattform        | Kategorie        | Methode                           |
|------------------|------------------|-----------------------------------|
| Gravatar         | Profil           | MD5-Hash Lookup via Public API    |
| GitHub           | Entwickler       | User-Search API (`in:email`)      |
| HaveIBeenPwned   | Sicherheit       | Breach-API (API-Key erforderlich) |
| ProtonMail       | E-Mail           | PGP-Keyserver-Lookup              |
| Microsoft        | Tech             | GetCredentialType Endpoint        |
| Spotify          | Musik            | Account-Validierungs-Endpoint     |
| Firefox Accounts | Browser          | Mozilla Account Status API        |
| Duolingo         | Bildung          | Public Users API                  |
| Imgur            | Bilder           | Email-Verfügbarkeits-Check        |
| LastPass         | Passwort-Manager | Iterations-Endpoint               |
| Mailchimp        | Marketing        | Email-Check API                   |
| WordPress.com    | CMS              | Auth-Options Endpoint             |
| Patreon          | Creator          | Login-Fehlercode-Analyse          |
| Adobe            | Design           | IMS CheckToken Endpoint           |
| Snapchat         | Social Media     | Login-Fehlercode-Analyse          |

---

## 5. Technischer Aufbau

### Verwendete Libraries (Node.js)

- **axios** → HTTP-Requests (Social-Media)
- **puppeteer** → Headless-Browser für dynamische Seiten (Social-Media)
- **https-proxy-agent** → Proxy-Unterstützung
- **user-agents** → Zufällige, realistische User-Agent-Generierung pro Request
- **chalk** → Farbige Konsolenausgabe
- **dotenv** → Laden von Umgebungsvariablen aus `.env`
- **cli-progress** → Fortschrittsanzeige
- **readline** → CLI-Eingabe
- **libphonenumber-js** → Telefonnummern-Parsing und Validierung
- **https** *(built-in)* → HTTP-Requests im Mail-Checker (kein externes Paket)
- **crypto** *(built-in)* → MD5-Hash für Gravatar-Lookup

### Python-Abhängigkeit

- **phonenumbers** → Regionale Analyse von Festnetznummern

### Projektstruktur
```text
tracky-osint/
├─ Tracky.js                      # Haupt-CLI
├─ Profile_Check_Socialmedia.js   # Social-Media Modul
├─ Mail_Checker.js                # E-Mail Modul
├─ Number_Check.js                # Telefonnummern Analyse
├─ Festnetz_Analyse.py            # Python Festnetz-Analyse
├─ google_Dorking_phonenumber.py  # Python DuckDuckGo-Scraper für Telefonnummern
├─ Vorwahl_Mobilfunk_DE_US.json   # DE & US Anbieter-Datenbank
├─ Vorwahl_Mobilfunk_FR.json      # FR Anbieter-Datenbank
├─ setup.js                       # Erstellt Projektverzeichnis Tracky-OSINT
├─ .env                           # API-Keys (nicht in Git!)
├─ .gitignore                     # Schützt .env und node_modules
├─ package.json                   # Node Projektdefinition
└─ README.md                      # Dokumentation
```

---

## 6. Cache- & Datenbank-System

### In-Memory Cache
- Social-Media- und E-Mail-Ergebnisse werden 10 Minuten zwischengespeichert
- Format: `cache_<username>` bzw. `cache_<email>` → Ergebnis-Objekt
- Automatische Bereinigung abgelaufener Einträge
- Reduziert Netzwerk-Last und erhöht Performance

### JSON-Datenbanken
- Enthalten Vorwahl- und Anbieterinformationen für DE, US, FR
- Schneller Lookup ohne externe API-Calls
- Reduziert API-Last und erhöht Performance

---

## 7. Erkennungslogik

### Social-Media

HTML-Inhalte werden analysiert und auf typische Fehlerindikatoren geprüft:

- `page not found`
- `sorry, this page isn't available`
- `profil existiert nicht`
- `Dieser Account existiert nicht`
- `Dieses Konto wurde gesperrt`
- `sorry. unless you've got a time machine, that content is unavailable.`

#### Login-Wall-Erkennung (zwei Stufen)

Viele Plattformen leiten nicht eingeloggte Besucher auf Login-Seiten um, anstatt eine klare 404-Antwort zu liefern. Ohne Gegenmassnahmen würde das Tool diese Login-Seiten als „gefunden" werten (false-True). Daher gibt es zwei Erkennungsstufen:

**Stufe 1 — Axios (URL-Prüfung via `isLoginRedirect()`):**
Nach jedem Request prüft die Funktion `isLoginRedirect()` ob die finale URL auf eine Login-Seite zeigt. Erkannt werden URL-Muster wie `/login`, `/signin`, `/auth`, `/accounts/login`, `next=`, `redirect=`, `/checkpoint` und `/challenge`. Zusätzlich wird geprüft ob ein Domain-Wechsel stattgefunden hat (z.B. `instagram.com` → `accounts.instagram.com`). Bei Treffer → `[?] Fehler` statt falschem `[+] GEFUNDEN`.

**Stufe 2 — Puppeteer (HTML-Inhalt):**
`contentIndicatesNotFound()` prüft als allererstes den geladenen HTML-Inhalt auf Login-Muster wie `log in to continue`, `<input type="password">`, `please log in`, `bitte einloggen`, `forgot your password` usw. Bei Treffer → `[?] Fehler`.

**Ausnahmen von der Login-Wall-Prüfung:**
Folgende Plattformen zeigen Login-Formulare auch bei existierenden Profilen im HTML — sie werden von der allgemeinen Login-Prüfung ausgenommen und nutzen stattdessen ihre eigene plattformspezifische Erkennung:

| Plattform | Grund |
|---|---|
| Instagram | Zeigt Profil-Metadaten und Login-Formular gleichzeitig im HTML |
| Facebook | Login-DOM ist immer vorhanden, unabhängig vom Profilstatus |
| LinkedIn | Partial-Content + Login-Wall erscheinen zusammen |
| Threads | Gleiches Verhalten wie Instagram (selbe Infrastruktur) |

#### Plattform-spezifische Analyse

| Plattform | Methode | Besonderheit |
|---|---|---|
| Instagram | Meta-Tag `og:title` | Login-Wall-Prüfung übersprungen |
| Facebook | Titel, Body & Textinhalt (3-stufig) | Login-Wall-Prüfung übersprungen |
| GitHub | `<title>` | — |
| Reddit | `<title>` | — |
| LinkedIn | `<title>` + Platzhalter-Muster | Login-Wall-Prüfung übersprungen |
| TikTok | `<title>` | — |
| YouTube | `<title>` | — |
| X (Twitter) | `<title>` & Body | — |
| Twitch | `<title>` (React-SPA) | Sonderbehandlung, siehe unten |
| Alle anderen | Allgemeine Musterprüfung im gesamten HTML | — |

#### Warum Twitch eine Sonderbehandlung braucht

Twitch ist eine React Single-Page-Application. Der initiale HTML-Quelltext ist bei jedem Aufruf identisch — egal ob der gesuchte User existiert oder nicht. Erst nach vollständigem JavaScript-Rendering unterscheidet sich der `<title>`:

- `shroud - Twitch` → User existiert
- `Twitch` → User existiert nicht

Puppeteer wartet daher mit `waitForSelector` zusätzlich auf das gerenderte Seiten-Element, bevor der Titel ausgewertet wird.

### E-Mail-Checker

Drei Erkennungsmethoden je nach Plattform:

**Öffentliche APIs**
Plattformen wie GitHub und Duolingo bieten öffentliche APIs an, die direkt abgefragt werden können. GitHub nutzt dabei den `in:email` Query-Parameter um im öffentlichen E-Mail-Feld zu suchen. Duolingo gibt bei Treffer Benutzername und Profillink zurück.

**Validierungs-Endpoints**
Viele Dienste prüfen serverseitig ob eine E-Mail bei der Registrierung bereits vergeben ist. Diese Endpoints sind technisch öffentlich zugänglich (Spotify, Imgur, Mailchimp, Firefox Accounts, WordPress.com).

**Fehlercode-Analyse**
Manche Plattformen geben beim Login-Versuch unterschiedliche Fehlermeldungen zurück — „falsche E-Mail" vs. „falsches Passwort". Das verrät ob ein Account existiert, ohne sich einzuloggen (Patreon, Snapchat).

### Telefonnummern

- Typ (Mobile / Festnetz)
- Land
- Vorwahl
- Anbieter
- Region (bei Festnetz via Python)

---

## 8. Ablauf einer Abfrage

### Social-Media
```text
Input (Username) → Cache prüfen
   ↓ nicht vorhanden
Axios Phase (parallel, 20 concurrent)
   ↓ Pro Request: eigener Header + isLoginRedirect() Prüfung
   ↓ 5-8 Sekunden
Status-Sortierung
   ↓ 404/406 → false | Login-Redirect → null | 200 → Puppeteer
Puppeteer Phase (3 Browser parallel)
   ↓ Login-Wall Prüfung → null
   ↓ Plattformspezifische Not-Found Prüfung
   ↓ 50-60 Sekunden
Ergebnisse sortieren (Gefunden → Nicht gefunden → Fehler)
   ↓
Cache speichern
   ↓
Konsolenausgabe
```

### E-Mail
```text
Input (E-Mail) → Validierung → Cache prüfen
   ↓ nicht vorhanden
HTTPS-Requests (parallel, 10 concurrent)
   ↓ 5-10 Sekunden
Ergebnisse sortieren (Gefunden → Nicht gefunden → Fehler)
   ↓
Cache speichern
   ↓
Konsolenausgabe
```

---

## 9. Installation

### Voraussetzungen

- Node.js >= 18.x
- npm >= 9.x
- Python 3.x
- pip

### Projekt klonen
```bash
git clone <repo-url>
cd tracky-osint
```

### Node.js Abhängigkeiten installieren
```bash
npm install
```

### Projektverzeichnis automatisch erstellen
```bash
npm run setup
```

Dieser Befehl erstellt automatisch das benötigte Verzeichnis `Tracky-OSINT`, falls es noch nicht existiert.

### Python-Abhängigkeiten installieren
```bash
pip install phonenumbers
pip install requests beautifulsoup4
```

### API-Keys konfigurieren (optional)

`.env` Datei im Projektordner erstellen:
```
HIBP_API_KEY=dein-key-hier
```

Den HaveIBeenPwned API-Key gibt es unter: https://haveibeenpwned.com/API/Key

`.gitignore` sicherstellen:
```
node_modules/
.env
```

---

## 10. Benutzung

### Hilfe anzeigen
```bash
node Tracky.js --help
```

### Social-Media-Suche
```bash
node Tracky.js --search MaxMustermann
```

Beispiel (sortierte Ausgabe):
```text
--- Ergebnisse der Social-Media Suche ---

[+] GEFUNDEN: https://www.github.com/MaxMustermann
[+] GEFUNDEN: https://www.reddit.com/user/MaxMustermann

[-] NICHTS:   https://www.instagram.com/MaxMustermann/
[-] NICHTS:   https://www.facebook.com/MaxMustermann

[?] Fehler:   https://www.x.com/MaxMustermann
```

### E-Mail-Suche
```bash
node Tracky.js --email max@example.com
```

Beispiel (sortierte Ausgabe):
```text
--- Ergebnisse der E-Mail Suche ---

[+] GEFUNDEN: https://www.gravatar.com/abc123  (@maxmustermann)
[+] GEFUNDEN: https://github.com/maxmustermann  (@maxmustermann)
[+] GEFUNDEN: https://open.spotify.com  (Account registriert)

[-] NICHTS:   Duolingo
[-] NICHTS:   Firefox Accounts
[-] NICHTS:   Mailchimp

[?] Fehler:   Adobe  (Timeout / Fehler)
[?] Fehler:   HaveIBeenPwned  (API-Key fehlt (HIBP_API_KEY))

  Treffer: 3 / 16 Plattformen
```

### Mit Proxy verwenden
```bash
node Tracky.js --search MaxMustermann --proxy http://proxy-server:8080
node Tracky.js --email max@example.com --proxy http://proxy-server:8080
```

### Telefonnummer analysieren
```bash
node Tracky.js --number +4915112345678
```

Beispiel:
```text
Nummer:    +49 151 12345678
Type:      MOBILE
Land:      DE
Anbieter:  Telekom
```

### Module direkt aufrufen
```bash
node Profile_Check_Socialmedia.js MaxMustermann
node Profile_Check_Socialmedia.js MaxMustermann http://proxy-server:8080

node Mail_Checker.js max@example.com
node Mail_Checker.js max@example.com http://proxy-server:8080
```

---

## 11. Konfiguration

### Social-Media Concurrency anpassen

In `Profile_Check_Socialmedia.js`:
```javascript
// Axios Concurrency (Standard: 20)
const axiosResults = await fetchWithAxios(username, Proxy_URL, 20);

// Puppeteer Concurrency (Standard: 3)
const puppeteerResults = await fetchWithPuppeteer(
    username,
    Proxy_URL,
    urlsNeedingPuppeteer,
    3  // Anzahl parallel Browser
);
```

**Empfehlungen:**
- Schneller Rechner: Puppeteer auf 4-5 erhöhen
- Langsamer Rechner: Puppeteer auf 2 reduzieren
- Axios: 20 ist optimal (Rate-Limiting beachten)

### E-Mail Concurrency anpassen

In `Mail_Checker.js`:
```javascript
const CONFIG = {
    timeout:     8000,  // ms pro Request
    concurrency: 10,    // parallele Requests gleichzeitig
};
```

**Empfehlungen:**
- Standard: 10 ist optimal
- Bei Rate-Limiting: auf 5 reduzieren
- Timeout bei langsamer Verbindung: auf 12000ms erhöhen

### Puppeteer Timeout anpassen
```javascript
// Puppeteer Timeout (Standard: 10000ms)
await page.goto(url, { waitUntil: 'networkidle2', timeout: 10000 });
```

Für langsame Verbindungen auf 15000-20000ms erhöhen.

### Cache-Dauer anpassen
```javascript
// Cache-Dauer (Standard: 10 Minuten)
const CACHE_DURATION = 10 * 60 * 1000;
```

---

## Performance-Hinweise

- Wiederholte Suchen nutzen den Cache (unter 1 Sekunde)
- Proxy erhöht Latenz
- Bei Timeouts: Concurrency reduzieren oder Timeout erhöhen
- Schnelle Internetverbindung verbessert Scan-Geschwindigkeit
- GitHub-Check findet nur Accounts mit öffentlich sichtbarer E-Mail
- HaveIBeenPwned benötigt einen kostenpflichtigen API-Key (~3,50$/Monat)
- ProtonMail-Check funktioniert nur für @proton.me und @protonmail.com Adressen
