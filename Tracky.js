// Tracky.js ist die Zweite Version dieses OSINT-Tools.
// Es dient um Social-Media-Profile zu finden.
// Mehr dazu in der README.md Datei.
const axios = require('axios'); // Für HTTP-Anfragen
const cache = new Map(); // Einfacher In-Memory-Cache
const CACHE_DURATION = 10 * 60 * 1000; // 10 Minuten in Millisekunden
const puppeteer = require('puppeteer'); // Für dynamische Webseiten
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

//========================================================================================
// Hilfsfunktionen
//========================================================================================
function Textonly(html) {
    // Entfernt alle HTML-Tags und gibt nur den Textinhalt zurück
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

//========================================================================================
// Cache Handling Funktionen
//========================================================================================
function getCACHEkey(username){ // Generiert einen eindeutigen Cache-Schlüssel basierend auf dem Benutzernamen
    return`cache_${username.toLowerCase()}`; // Einfacher Schlüssel mit Präfix
}

function getCachedResult(username){ // Überprüft, ob ein Ergebnis im Cache vorhanden und noch gültig ist
    const key=getCACHEkey(username); // Generiert den Cache-Schlüssel
    const cached=cache.get(key); // Ruft den zwischengespeicherten Wert ab

    if(cached && (Date.now()-cached.timestamp)<CACHE_DURATION){ // Überprüft, ob der Cache-Eintrag noch gültig ist
        return cached.data; // Gibt die zwischengespeicherten Daten zurück
    }

    if (cached) {
        cache.delete(key); // Entfernt abgelaufene Cache-Einträge
    }

    return null; // Gibt null zurück, wenn kein gültiger Cache-Eintrag vorhanden ist
}

function setCachedResult(username,data){ // Speichert ein Ergebnis im Cache
    const key=getCACHEkey(username);
    // Speichert die Daten zusammen mit dem aktuellen Zeitstempel
    cache.set(key,
        {
            data:data, // Zu speichernde Daten (Username)
            timestamp:Date.now() // Aktueller Zeitstempel
        });

}

//========================================================================================
// Liste der zu überprüfenden Websites
// ========================================================================================
const websites = [
    "https://www.instagram.com/{username}/", // Zuverlässige anfragen mit puppeteer
    "https://www.facebook.com/{username}", // Zuverlässige anfragen mit puppeteer
    "https://www.x.com/{username}", // Blockiert popperteer Anfragen und axios somit eher nutzlos
    "https://www.github.com/{username}", // Zuverlässige anfragen mit puppeteer
    "https://www.reddit.com/user/{username}", // Zuverlässige anfragen mit puppeteer
    "https://www.linkedin.com/in/{username}", //
    "https://www.youtube.com/@{username}",//
    "https://www.tiktok.com/@{username}",//
    "https://de.pinterest.com/{username}/"
];


// ========================================================================================
// Funktion zur Prüfung von Profilen auf verschiedenen Websites
// ========================================================================================
function contentIndicatesNotFound(html,url,username) {
    // Muster für "Nicht gefunden" in verschiedenen Sprachen
  const notFoundPatterns = [
    "page not found",
    "not found",
    "seite nicht gefunden",
    "seite konnte nicht gefunden werden",
    "sorry, this page isn't available",
    "doesn't exist",
    "profil existiert nicht",
    "hmm... diese seite gibt es nicht. probiere es mit einer anderen suche.",
    "dieser inhalt ist momentan nicht verfügbar",
    "profile ist nicht verfügbar",
    "Sorry, es gibt keine Nutzer*innen mit diesem Namen.",
    "Dieses Konto wurde möglicherweise gebannt oder der Nutzername ist inkorrekt.",
    "Dieses Konto wurde gesperrt",
    "Dieses Profil ist möglicherweise privat oder existiert nicht. Loggen Sie sich ein, um auf dieses und mehr als 1 Milliarde Mitgliederprofile auf LinkedIn zuzugreifen.",
    'Das Profil „{username}" ist möglicherweise privat.',
    "Dieser Account existiert nicht",
    "Versuche, nach einem anderen Account zu suchen.",
];

  const lowerHtml = html.toLowerCase(); // macht HTML-Inhalt kleingeschrieben für einfacheren Vergleich

    // Instagram nimmt nur Puppeteer Anfragen an. Es werden keine axios Anfragen beantwortet.

    //=======================================================================================
    // Spezifische Prüfung für Instagram
    //=======================================================================================
    if (url.toLowerCase().includes("instagram.com")) {

        // Überprüfung des Meta-Titels
        const match = lowerHtml.match(/<meta property="og:title" content="(.*?)"/i);

        // Schleife für prüfung aller Schlagwörter
        for (let pattern of notFoundPatterns) { // Prüfung gegen alle Muster
            if (match && match[1].toLowerCase().includes(pattern.toLowerCase())) {
                return { exists: false }; // gibt zurück, dass das Profil nicht existiert in form eines Booleans
            }
        };
        for (let pattern of notFoundPatterns) { // Prüfung gegen alle Muster
            if (lowerHtml.includes(pattern.toLowerCase())) {
                return { exists: false }; // gibt zurück, dass das Profil nicht existiert in form eines Booleans
            }
        };
        return { exists: true };
    }

    //=======================================================================================
    // Spezifische Prüfung für GitHub
    //=======================================================================================
    if (url.toLowerCase().includes("github.com")) {
        const match = lowerHtml.match(/<title>(.*?)<\/title>/i); // Extrahiert den Titel der Seite
        for (let pattern of notFoundPatterns) { // Prüfung gegen alle Muster
            if (match && match[1].toLowerCase().includes(pattern.toLowerCase())) {
                return { exists: false }; // gibt zurück, dass das Profil nicht existiert in form eines Booleans
            }
        }
        for (let pattern of notFoundPatterns) { // Prüfung gegen alle Muster
            if (lowerHtml.includes(pattern.toLowerCase())) {
                return { exists: false }; // gibt zurück, dass das Profil nicht existiert in form eines Booleans
            }
        };
        return { exists: true };
    }

    //=======================================================================================
    // Spezifische Prüfung für Reddit
    //=======================================================================================
    if (url.toLowerCase().includes("reddit.com")) {
        const match = lowerHtml.match(/<title>(.*?)<\/title>/i); // Extrahiert den Titel der Seite
        for (let pattern of notFoundPatterns) { // Prüfung gegen alle Muster
            if (match && match[1].toLowerCase().includes(pattern.toLowerCase())) {
                return { exists: false }; // gibt zurück, dass das Profil nicht existiert in form eines Booleans
                break;
            }
        }
        for (let pattern of notFoundPatterns) { // Prüfung gegen alle Muster
            if (lowerHtml.includes(pattern.toLowerCase())) {
                return { exists: false }; // gibt zurück, dass das Profil nicht existiert in form eines Booleans
            }
        };
        return { exists: true };
    }

    //=======================================================================================
    // Spezifische Prüfung für LinkedIn
    //=======================================================================================
    if (url.toLowerCase().includes("linkedin.com")) {
        const match = lowerHtml.match(/<title>(.*?)<\/title>/i); // Extrahiert den Titel der Seite
        for (let pattern of notFoundPatterns) { // Prüfung gegen alle Muster
            if (match && match[1].toLowerCase().includes(pattern.toLowerCase())) {
                return { exists: false }; // gibt zurück, dass das Profil nicht existiert in form eines Booleans
            }
        }
        for (let pattern of notFoundPatterns) { // Prüfung gegen alle Muster
            if (pattern.toLowerCase().includes("{username}")) { // Spezialbehandlung für Muster mit Platzhalter
                pattern = pattern.replace("{username}", username.toLowerCase()); // Ersetzt Platzhalter durch tatsächlichen Benutzernamen
                if (lowerHtml.includes(pattern.toLowerCase())) { // Prüfung gegen das angepasste Muster
                    return { exists: false }; // gibt zurück, dass das Profil nicht existiert in form eines Booleans
                }
                continue; // Überspringt die Standardprüfung für dieses Muster
            }
            if (lowerHtml.includes(pattern.toLowerCase())) { // Standardprüfung für andere Muster
            return { exists: false }; // gibt zurück, dass das Profil nicht existiert in form eines Booleans
            }
        };
        return { exists: true };
    }

    //=======================================================================================
    // Spezifische Prüfung für Facebook
    //=======================================================================================
    // Multi Layer Prüfung, da Facebook verschiedene Methoden nutzt um "Nicht gefunden" anzuzeigen
    // Erst werden Kleinere Schritte geprüft, dann der gesamte HTML-Inhalt falls nötig
    // Facebook springt nur auf Puppeteer anfragen an, axios Anfragen werden meist umgeleitet
    if (url.toLowerCase().includes("facebook.com")) {
        const match = lowerHtml.match(/<title>(.*?)<\/title>/i); // Extrahiert den Titel der Seite
        for (let pattern of notFoundPatterns) { // Prüfung gegen alle Muster
            if (match && match[1].toLowerCase().includes(pattern.toLowerCase())) {
                return { exists: false }; // gibt zurück, dass das Profil nicht existiert in form eines Booleans
            }
        }
        // Zusätzliche Prüfung des Body-Inhalts, da Facebook Inhalte eigentlich über den Body ausgibt
        const bodyMatch = lowerHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i); // Extrahiert den Body-Inhalt
        for (let pattern of notFoundPatterns) { // Prüfung gegen alle Muster
            if (bodyMatch && bodyMatch[1].toLowerCase().includes(pattern.toLowerCase())) {
                return { exists: false }; // gibt zurück, dass das Profil nicht existiert in form eines Booleans
            }
        }
        const fullText = Textonly(html).toLowerCase(); // Nur Textinhalt extrahieren
        for (let pattern of notFoundPatterns) { // Prüfung gegen alle Muster
            if (fullText.includes(pattern.toLowerCase())) {
                return { exists: false }; // gibt zurück, dass das Profil nicht existiert in form eines Booleans
            }
        }
        return { exists: true };
    }


    //=======================================================================================
    // Spezifische Prüfung für YouTube
    //=======================================================================================
    if (url.toLowerCase().includes("youtube.com")) {
        const match = lowerHtml.match(/<title>(.*?)<\/title>/i); // Extrahiert den Titel der Seite
        for (let pattern of notFoundPatterns) { // Prüfung gegen alle Muster
            if (match && match[1].toLowerCase().includes(pattern.toLowerCase())) {
                return { exists: false }; // gibt zurück, dass das Profil nicht existiert in form eines Booleans
            }
        }
        for (let pattern of notFoundPatterns) { // Prüfung gegen alle Muster
            if (lowerHtml.includes(pattern.toLowerCase())) {
                return { exists: false }; // gibt zurück, dass das Profil nicht existiert in form eines Booleans
            }
        };
        return { exists: true };
    }



    //=======================================================================================
    // Spezifische Prüfung für X.com (ehemals Twitter)
    //=======================================================================================
    if (url.toLowerCase().includes("x.com")) {
        const match = lowerHtml.match(/<title>(.*?)<\/title>/i); // Extrahiert den Titel der Seite
        for (let pattern of notFoundPatterns) { // Prüfung gegen alle Muster
            if (match && match[1].toLowerCase().includes(pattern.toLowerCase())) {
                return { exists: false }; // gibt zurück, dass das Profil nicht existiert in form eines Booleans
            }
        }
        const bodyMatch = lowerHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i); // Extrahiert den Body-Inhalt
        for (let pattern of notFoundPatterns) { // Prüfung gegen alle Muster
            if (bodyMatch && bodyMatch[1].toLowerCase().includes(pattern.toLowerCase())) {
                return { exists: false }; // gibt zurück, dass das Profil nicht existiert in form eines Booleans
            }
        }
        for (let pattern of notFoundPatterns) { // Prüfung gegen alle Muster
            if (lowerHtml.includes(pattern.toLowerCase())) {
                return { exists: false }; // gibt zurück, dass das Profil nicht existiert in form eines Booleans
            }
        };
        return { exists: true };
    }



    //=======================================================================================
    // Spezifische Prüfung für TikTok
    //=======================================================================================
    if (url.toLowerCase().includes("tiktok.com")) {
        const match = lowerHtml.match(/<title>(.*?)<\/title>/i); // Extrahiert den Titel der Seite
        for (let pattern of notFoundPatterns) { // Prüfung gegen alle Muster
            if (match && match[1].toLowerCase().includes(pattern.toLowerCase())) {
                return { exists: false }; // gibt zurück, dass das Profil nicht existiert in form eines Booleans
            }
        }
        for (let pattern of notFoundPatterns) { // Prüfung gegen alle Muster
            if (lowerHtml.includes(pattern.toLowerCase())) {
                return { exists: false }; // gibt zurück, dass das Profil nicht existiert in form eines Booleans
            }
        };
        return { exists: true };
    }


    //=======================================================================================
    // Allgemeine Prüfung für alle anderen Seiten
    //=======================================================================================
    // Falls auf einer gesucht wird die spezifische Prüfung nicht definiert ist
    for (let pattern of notFoundPatterns) { // Prüfung gegen alle Muster
        if (lowerHtml.includes(pattern.toLowerCase())) {
            return { exists: false }; // gibt zurück, dass das Profil nicht existiert in form eines Booleans
        }
    };
    return { exists: true };
}

// ========================================================================================
// Anfrage Funktion mit Puppeteer für dynamische Webseiten
// ========================================================================================
async function fetchWithPuppeteer(username, specificUrl = null) {
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const results = {}; // Speichert Ergebnisse für jede Website
    
    // Wenn eine spezifische URL angegeben wurde, nur diese prüfen
    const urlsToCheck = specificUrl ? [specificUrl] : websites.map(site => site.replace('{username}', username));
    
    for (let url of urlsToCheck) {
        try {
            const page = await browser.newPage();
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 10000 }); // Warte bis die Seite vollständig geladen ist
            const content = await page.content(); // Holt den HTML-Inhalt der Seite
            const checkResult = contentIndicatesNotFound(content,url,username); // UMBENANNT von 'result' zu 'checkResult'
            await page.close();
            
            // Speichere Ergebnis für diese Website
            results[url] = checkResult.exists;
        } catch (error) {
            results[url] = null; // Speichere null bei Fehler
        }
    }
    await browser.close();
    return results; // Gibt alle Ergebnisse zurück
}


// ========================================================================================
// Anfrage Funktion mit Axios für statische Webseiten
// ========================================================================================
async function fetchWithAxios(username) {
    const results = {}; // Speichert Ergebnisse für jede Website
    
    for (let site of websites) { // Schleife durch alle Websites
        const url = site.replace('{username}', username);

        try {
            const response = await axios.get(url, {
                headers: { //Header zur Nachahmung eines echten Browsers
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
                    'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7'
                },
                timeout: 5000, // 5 Sekunden Timeout
                validateStatus: () => true  // Alle Status-Codes akzeptieren
            });
            
            if (response.status === 200) {
                // Bei Status 200 wird Puppeteer zur Verifizierung verwendet
                results[url] = 'needs_puppeteer'; // Markierung für Puppeteer-Prüfung
            } else if (response.status === 404 || response.status === 406) { // Github gibt bei fehler 406 zurück
                results[url] = false; // Profil nicht gefunden
            } else {
                if (url.toLocaleLowerCase().includes('linkedin.com')) {
                    results[url] = 'needs_puppeteer'; // LinkedIn benötigt oft Puppeteer
                }
                else if (url.toLocaleLowerCase().includes('pinterest.com')) {
                    results[url] = 'needs_puppeteer'; // Pinterest benötigt oft Puppeteer
                }
                else{
                console.log(`Fehler: ${response.status} : ${url}`);
                results[url] = null; // Unerwarteter Statuscode
                }
            }
        } catch (error) {
            results[url] = null; // Gibt null zurück bei Fehler
        }
    }
    return results; // Gibt alle Ergebnisse zurück
}
// ========================================================================================

//========================================================================================
// Hauptfunktion zur Überprüfung des Benutzernamens
// ========================================================================================
async function checkUsername(username) {
    // Überprüfe zuerst den Cache
    const cachedResult = getCachedResult(username);
    if (cachedResult) {
        console.log(`Cache-Treffer für ${username}`);
        return cachedResult; // Gibt das zwischengespeicherte Ergebnis zurück
    }
    
    // Erst Axios versuchen
    const axiosResults = await fetchWithAxios(username);
    
    // Sammle alle URLs die mit Puppeteer geprüft werden müssen (Status 200 von Axios)
    const urlsNeedingPuppeteer = [];
    for (let [url, status] of Object.entries(axiosResults)) {
        if (status === 'needs_puppeteer') {
            urlsNeedingPuppeteer.push(url);
        }
    }
    
    // Wenn URLs mit Puppeteer geprüft werden müssen
    if (urlsNeedingPuppeteer.length > 0) {
        
        // Prüfe jede URL einzeln mit Puppeteer
        for (let url of urlsNeedingPuppeteer) {
            const puppeteerResult = await fetchWithPuppeteer(username, url);
            // Überschreibe das Axios-Ergebnis mit dem Puppeteer-Ergebnis
            axiosResults[url] = puppeteerResult[url];
        }
    }
    
    setCachedResult(username, axiosResults); // Speichert das Ergebnis im Cache
    return axiosResults; // Gibt das Ergebnis zurück
}
// ========================================================================================
// Input-Menü
// ========================================================================================
readline.question("Username: ", async (input) => {
    const username = input.trim();
    readline.close();
    Time = Date.now();
    const results = await checkUsername(username);
    
    console.log('\n' + '='.repeat(80));
    console.log(`ERGEBNISSE FÜR: ${username}`);
    console.log('='.repeat(80) + '\n');
    
    let foundCount = 0;
    let notFoundCount = 0;
    let unknownCount = 0;
    
    // Durchlaufe alle Ergebnisse
    for (let [url, exists] of Object.entries(results)) {
        if (exists === true) {
            console.log(`(+) GEFUNDEN:       ${url}`);
            foundCount++;
        } else if (exists === false) {
            console.log(`(-) NICHT GEFUNDEN: ${url}`);
            notFoundCount++;
        } else {
            console.log(`(?) UNBEKANNT:      ${url}`);
            unknownCount++;
        }
    }
    let MS = Date.now() - Time; // Berechnet die Ausführungsdauer in Millisekunden
    //========================================================================================
    // Zusammenfassung der Ergebnisse
    //========================================================================================
    console.log('\n' + '='.repeat(80));
    console.log(`ZUSAMMENFASSUNG: ${foundCount} Gefunden | ${notFoundCount} Nicht gefunden | ${unknownCount} Unbekannt | Dauer: ${MS/1000}s`);
    console.log('='.repeat(80));
});