# Tracky-OSINT

**Tracky-OSINT** ist ein modulares Open-Source-Intelligence (OSINT) Tool, das entwickelt wurde, um verschiedene Informationen anhand von Benutzernamen und Telefonnummern automatisiert zu analysieren. 

> **Wichtiger Hinweis:** Dieses Tool darf ausschließlich für legale Zwecke verwendet werden. Die Nutzung ist nur im Rahmen geltender Gesetze zulässig. Der Anwender trägt die volle Verantwortung für die Verwendung dieses Tools.

## Inhaltsverzeichnis

1. [Features](#features)
2. [Funktionsweise](#funktionsweise)
3. [Unterstützte Plattformen](#unterstützte-plattformen)
4. [Technischer Aufbau](#technischer-aufbau)
5. [Cache- & Datenbank-System](#cache--datenbank-system)
6. [Erkennungslogik](#erkennungslogik)
7. [Ablauf einer Abfrage](#ablauf-einer-abfrage)
8. [Installation](#installation)
9. [Benutzung](#benutzung)

---

## 1. Features

- Automatische Suche nach Social-Media-Profilen anhand von Usernamen  
- Analyse von Mobilfunk- und Festnetznummern mit Länder- und Anbieterinformationen  
- Kombination aus Axios und Puppeteer für schnelle und dynamische Anfragen  
- Nutzung von JSON-Datenbanken für Vorwahl- und Anbieterdaten (DE, US, FR)  
- Intelligente Erkennung von „Profil existiert nicht“  
- Fehler- und Timeout-Handling  
- Übersichtliche Konsolenausgabe  

---

## 2. Funktionsweise

1. Benutzer gibt einen **Username** oder eine Telefonnummer ein  
2. Cache oder Datenbank wird geprüft  
3. Für Social-Media: Axios führt schnelle HTTP-Requests aus  
4. Unklare Ergebnisse werden mit Puppeteer geprüft  
5. Für Telefonnummern: `libphonenumber-js` ermittelt Typ, Land und Vorwahl  
6. Festnetznummern werden mit Python-Skript `Festnetz_Analyse.py` analysiert  
7. Ergebnisse werden gespeichert und in der Konsole ausgegeben  

---

## 3. Unterstützte Plattformen

- Instagram  
- Facebook  
- X (Twitter)  
- GitHub  
- Reddit  
- LinkedIn  
- YouTube  
- TikTok  
- Pinterest  

Die URLs für Social-Media werden dynamisch mit dem angegebenen Benutzernamen erzeugt. Telefonnummern werden nach Land, Vorwahl und Anbieter analysiert.

---

## 4. Technischer Aufbau

### Verwendete Libraries (Node.js)

- **axios** → HTTP-Requests  
- **puppeteer** → Headless-Browser für dynamische Seiten  
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
├─ Profile_Check_Socialmedia.js   # Social-Media Modul
├─ Number_Check.js                # Telefonnummern Analyse
├─ Festnetz_Analyse.py            # Python Festnetz-Analyse
├─ Vorwahl_Mobilfunk_DE_US.json   # DE & US Anbieter-Datenbank
├─ Vorwahl_Mobilfunk_FR.json      # FR Anbieter-Datenbank
├─ setup.js                       # Erstellt Projektverzeichnis Tracky-OSINT
├─ package.json                   # Node Projektdefinition
└─ README.md                      # Dokumentation
````

---

## 5. Cache- & Datenbank-System

- Social-Media-Ergebnisse werden 10 Minuten zwischengespeichert (`cache_<username>`)  
- JSON-Datenbanken enthalten Vorwahl- und Anbieterinformationen  
- Reduziert API-Last und erhöht Performance  

---

## 6. Erkennungslogik

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

## 7. Ablauf einer Abfrage

```text
Input → Cache/DB prüfen
   ↓ nicht vorhanden
Axios / Telefonnummernprüfung
   ↓ unklar
Puppeteer / Python-Skript
   ↓ Analyse
Ergebnis speichern
   ↓
Konsolenausgabe
```

---

## 8. Installation

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

## 9. Benutzung

### Hilfe anzeigen

```bash
node Tracky.js --help
```

### Social-Media-Suche

```bash
node Tracky.js --search MaxMustermann
```

Ausgabe:

```text
(+) GEFUNDEN:       https://www.github.com/MaxMustermann
(-) NICHT GEFUNDEN: https://www.instagram.com/MaxMustermann/
(?) UNBEKANNT:      https://www.x.com/MaxMustermann
```

### Telefonnummer analysieren

```bash
node Tracky.js --number +4915112345678
```

Ausgabe:

```text
Nummer:    +49 151 12345678
Type:      MOBILE
Land:      DE
Anbieter:  Telekom
```
