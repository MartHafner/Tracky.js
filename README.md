# Tracky-OSINT

**Tracky-OSINT** ist ein modulares Open-Source-Intelligence (OSINT) Tool, das entwickelt wurde, um verschiedene Informationen anhand von Benutzernamen und Telefonnummern automatisiert zu analysieren. 

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
- Analyse von Mobilfunk- und Festnetznummern mit Länder- und Anbieterinformationen  
- Kombination aus Axios und Puppeteer für schnelle und dynamische Anfragen  
- Parallele Verarbeitung mit optimierter Concurrency
- Nutzung von JSON-Datenbanken für Vorwahl- und Anbieterdaten (DE, US, FR)  
- Intelligente Erkennung von „Profil existiert nicht"  
- 10-Minuten-Cache für schnelle Wiederholungen
- Proxy-Unterstützung für anonyme Anfragen
- Fehler- und Timeout-Handling  
- Sortierte Ausgabe: Gefunden, nicht gefunden, Fehler
- Übersichtliche Konsolenausgabe  

---

## 2. Performance & Optimierungen

### Geschwindigkeit

Durchschnittliche Suchzeit für 114 Social-Media-Plattformen: **ca. 60 Sekunden**

| Phase | Methode | URLs | Zeit |
|-------|---------|------|------|
| Axios-Scan | 20 parallel | 114 | 5-8s |
| Puppeteer-Check | 3 Browser parallel | 30-40 | 50-60s |
| **Gesamt** | | **114** | **~60s** |

**Vergleich:**
- Sequentielle Version: ~210 Sekunden (3.5 Minuten)
- Optimierte Version: ~60 Sekunden (1 Minute)
- **Speedup: 3-3.5x schneller**

### Technische Optimierungen

#### Axios-Optimierungen
- Parallele Batch-Verarbeitung: 20 URLs gleichzeitig
- Reduzierter Timeout: 3 Sekunden für schnelle Fehlerkennung
- Effizientes Error-Handling ohne Blockierung

#### Puppeteer-Optimierungen
- Separate Browser-Instanzen: Jeder Browser lädt nur 1 Tab
- Batch-Verarbeitung: 3 Browser parallel
- Keine Ressourcen-Konkurrenz zwischen Tabs
- Jeder Browser erhält volle CPU/RAM/Network-Ressourcen

#### Warum separate Browser?

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

1. Benutzer gibt einen **Username** oder eine Telefonnummer ein  
2. Cache wird geprüft (instant Antwort wenn vorhanden)
3. Für Social-Media: Axios führt schnelle HTTP-Requests aus (parallel)
4. Unklare Ergebnisse (Status 200) werden mit Puppeteer geprüft  
5. Für Telefonnummern: `libphonenumber-js` ermittelt Typ, Land und Vorwahl  
6. Festnetznummern werden mit Python-Skript `Festnetz_Analyse.py` analysiert  
7. Ergebnisse werden sortiert: Gefunden, nicht gefunden, Fehler
8. Ergebnisse werden gespeichert und in der Konsole ausgegeben  

---

## 4. Unterstützte Plattformen

- Instagram  
- Facebook  
- X (Twitter)  
- GitHub  
- Reddit  
- LinkedIn  
- YouTube  
- TikTok  
- Pinterest  
- Snapchat
- WhatsApp
- Telegram
- Discord
- Signal
- Twitch
- Steam
- und 100+ weitere Plattformen

Die URLs für Social-Media werden dynamisch mit dem angegebenen Benutzernamen erzeugt. Telefonnummern werden nach Land, Vorwahl und Anbieter analysiert.

---

## 5. Technischer Aufbau

### Verwendete Libraries (Node.js)

- **axios** → HTTP-Requests  
- **puppeteer** → Headless-Browser für dynamische Seiten  
- **https-proxy-agent** → Proxy-Unterstützung
- **chalk** → Farbige Konsolenausgabe  
- **cli-progress** → Fortschrittsanzeige  
- **readline** → CLI-Eingabe  
- **libphonenumber-js** → Telefonnummern-Parsing und Validierung  

### Python-Abhängigkeit

- **phonenumbers** → Regionale Analyse von Festnetznummern  

### Projektstruktur
```text
tracky-osint/
├─ Tracky.js                      # Haupt-CLI
├─ Profile_Check_Socialmedia.js   # Social-Media Modul (optimiert)
├─ Number_Check.js                # Telefonnummern Analyse
├─ Festnetz_Analyse.py            # Python Festnetz-Analyse
├─ Vorwahl_Mobilfunk_DE_US.json   # DE & US Anbieter-Datenbank
├─ Vorwahl_Mobilfunk_FR.json      # FR Anbieter-Datenbank
├─ setup.js                       # Erstellt Projektverzeichnis Tracky-OSINT
├─ package.json                   # Node Projektdefinition
└─ README.md                      # Dokumentation
```

---

## 6. Cache- & Datenbank-System

### In-Memory Cache
- Social-Media-Ergebnisse werden 10 Minuten zwischengespeichert
- Format: `cache_<username>` → Ergebnis-Objekt
- Automatische Bereinigung abgelaufener Einträge
- Reduziert Netzwerk-Last und erhöht Performance

### JSON-Datenbanken
- Enthalten Vorwahl- und Anbieterinformationen für DE, US, FR
- Schneller Lookup ohne externe API-Calls
- Reduziert API-Last und erhöht Performance  

---

## 7. Erkennungslogik

HTML-Inhalte werden analysiert und auf typische Fehlerindikatoren geprüft:

- `page not found`  
- `sorry, this page isn't available`  
- `profil existiert nicht`  
- `Dieser Account existiert nicht`  
- `Dieses Konto wurde gesperrt`  

Plattform-spezifische Analyse:

- Instagram → Meta-Tags (og:title)  
- Facebook → Titel & Body  
- GitHub / Reddit → `<title>`  
- LinkedIn → Login-Texte  
- TikTok / YouTube / X → Titel & Body  

Telefonnummern:

- Typ (Mobile/Festnetz)  
- Land  
- Vorwahl  
- Anbieter  
- Region (bei Festnetz via Python)

---

## 8. Ablauf einer Abfrage
```text
Input → Cache prüfen
   ↓ nicht vorhanden
Axios Phase (parallel, 20 concurrent)
   ↓ 5-8 Sekunden
Status-Sortierung
   ↓ 404/406 → false, 200 → Puppeteer
Puppeteer Phase (3 Browser parallel)
   ↓ 50-60 Sekunden
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

### Python-Abhängigkeit installieren
```bash
pip install phonenumbers
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

[?] FEHLER:   https://www.x.com/MaxMustermann
```

### Mit Proxy verwenden
```bash
node Tracky.js --search MaxMustermann --proxy http://proxy-server:8080
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

---

## 11. Konfiguration

### Concurrency anpassen

In `Profile_Check_Socialmedia.js`:
```javascript
// Zeile 572: Axios Concurrency (Standard: 20)
const axiosResults = await fetchWithAxios(username, Proxy_URL, 20);

// Zeile 585: Puppeteer Concurrency (Standard: 3)
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

### Timeout anpassen
```javascript
// Zeile 545: Puppeteer Timeout (Standard: 10000ms)
await page.goto(url, { waitUntil: 'networkidle2', timeout: 10000 });
```

Für langsame Verbindungen auf 15000-20000ms erhöhen.

### Cache-Dauer anpassen
```javascript
// Zeile 8: Cache-Dauer (Standard: 10 Minuten)
const CACHE_DURATION = 10 * 60 * 1000;
```

---

## Performance-Hinweise

- Wiederholte Suchen nutzen den Cache (unter 1 Sekunde)
- Proxy erhöht Latenz
- Bei Timeouts: Concurrency reduzieren oder Timeout erhöhen
- Schnelle Internetverbindung verbessert Scan-Geschwindigkeit
