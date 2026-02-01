# Tracky.js

**Tracky.js** ist ein OSINT-Tool (Open Source Intelligence) zur automatisierten Suche nach Social-Media-Profilen anhand eines Benutzernamens.  
Es kombiniert **Axios** für schnelle statische Anfragen und **Puppeteer** für dynamische/geschützte Seiten um zu prüfen, ob Profile existieren.

> **Hinweis**: Dieses Tool ist ausschließlich für legale OSINT-Zwecke gedacht (z. B. eigene Recherchen, Pentesting mit Erlaubnis, Forschung). Die Verantwortung für die Nutzung liegt beim Anwender.


## Inhaltsverzeichnis

1. Features  
2. Funktionsweise (Überblick)  
3. Unterstützte Plattformen  
4. Technischer Aufbau  
5. Cache-System  
6. Erkennungslogik (Profil gefunden / nicht gefunden)  
7. Ablauf einer Abfrage  
8. Installation und Nutzung
9. Einschränkungen & Besonderheiten  



## 1. Features

- Automatische Suche nach Social-Media-Profilen
- Kombination aus Axios und Puppeteer
- Intelligente Erkennung von „Profil existiert nicht“
- Fehler- und Timeout-Handling
- Übersichtliche Konsolenausgabe



## 2. Funktionsweise (Überblick)

1. Benutzer gibt einen **Username** ein  
2. Cache wird geprüft  
3. Axios führt schnelle HTTP-Requests aus  
4. Unklare Ergebnisse werden mit Puppeteer geprüft  
5. HTML wird analysiert  
6. Ergebnis wird gespeichert und ausgegeben  



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

Die URLs werden dynamisch mit dem angegebenen Benutzernamen erzeugt.



## 4. Technischer Aufbau

### Verwendete Libraries

- **axios** → HTTP-Requests  
- **puppeteer** → Headless-Browser für dynamische Seiten   
- **readline** → CLI-Eingabe  

### Logische Struktur

- Hilfsfunktionen (HTML-Parsing)
- Cache-Handling
- Plattform-Liste
- Erkennungslogik
- Axios-Fetcher
- Puppeteer-Fetcher
- Hauptlogik + CLI



## 5. Cache-System

- Cache-Key: `cache_<username>`
- Gültigkeit: **10 Minuten**
- Speicherung: Ergebnis + Zeitstempel

### Vorteile

- Schnellere Folgeabfragen  
- Weniger Requests  
- Schonung von Rate-Limits  



## 6. Erkennungslogik

Tracky analysiert den HTML-Inhalt der Seite und sucht nach typischen Hinweisen für nicht existierende Profile.

### Erkannte Muster (Beispiel)

- `page not found`
- `sorry, this page isn't available`
- `profil existiert nicht`
- `Dieser Account existiert nicht`
- `Dieses Konto wurde gesperrt`

### Plattform-spezifisch

- Instagram → Meta-Tags (og:title)
- Facebook → Titel, Body & Textinhalt
- GitHub / Reddit → `<title>`
- LinkedIn → Login- & Privacy-Texte
- TikTok / YouTube / X → Titel & Body

Fallback: allgemeine Textsuche



## 7. Ablauf einer Abfrage

```text
Username → Cache?
   ↓ nein
Axios Request
   ↓ 200 OK?
   → Puppeteer
   ↓ Analyse
Ergebnis speichern
   ↓
Ausgabe
```
## 8. Installation und Nutzung

### Installation
```bash
npm install axios puppeteer cors
```
### Nutzung

```Bash
node tracky.js
```

### Ein- und Ausgabe

#### Eingabe
```bash
Username: beispielname
```

#### Ausgabe
```bash
(+) GEFUNDEN:       https://www.github.com/beispielname
(-) NICHT GEFUNDEN: https://www.instagram.com/beispielname/
(?) UNBEKANNT:      https://www.x.com/beispielname

ZUSAMMENFASSUNG:
==========================================================
1 Gefunden | 1 Nicht gefunden | 1 Unbekannt | Dauer: 3.2s
==========================================================

```

## 9. Einschränkungen

- Private Profile können als vorhanden erkannt werden
- Captchas & Rate-Limits möglich
- HTML-Änderungen der Plattformen möglich
