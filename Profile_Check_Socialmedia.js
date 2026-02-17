// Profile_Ckeck_Socialmedia.js
// Das ist der Profile_Check_Socialmedia.js, ein Modul von Tracky, das speziell für die Überprüfung von Social-Media-Profilen entwickelt wurde.
// Es dient um Social-Media-Profile zu finden.
// Mehr dazu in der README.md Datei.
const axios = require('axios'); // Für HTTP-Anfragen
const cache = new Map(); // Einfacher In-Memory-Cache
const CACHE_DURATION = 10 * 60 * 1000; // 10 Minuten in Millisekunden
const puppeteer = require('puppeteer'); // Für dynamische Webseiten
const chalk = require('chalk'); // Für farbige Konsolenausgabe
const {HttpsProxyAgent} = require('https-proxy-agent'); // Für Proxy-Anfragen


// Config für Readline
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
// =======================================================================================

const websites = [

    "https://www.instagram.com/{username}/",
    "https://www.facebook.com/{username}",
    "https://www.x.com/{username}",
    "https://github.com/{username}",
    "https://www.reddit.com/user/{username}",
    "https://www.linkedin.com/in/{username}",
    "https://www.youtube.com/@{username}",
    "https://www.tiktok.com/@{username}",
    "https://www.pinterest.com/{username}",
    "https://www.snapchat.com/add/{username}",
    "https://wa.me/{username}",
    "https://t.me/{username}",
    "https://discord.com/users/{username}",
    "https://{username}.tumblr.com",
    "https://www.threads.net/@{username}",
    "https://bere.al/{username}",
    "https://mastodon.social/@{username}",
    "https://blueskyweb.xyz/{username}",
    "https://signal.me/#p/{username}",
    "https://weixin.qq.com/{username}",
    "https://user.qzone.qq.com/{username}",
    "https://weibo.com/{username}",
    "https://www.douyin.com/user/{username}",
    "https://www.kuaishou.com/profile/{username}",
    "https://vk.com/{username}",
    "https://ok.ru/{username}",
    "https://line.me/{username}",
    "https://www.kakao.com/{username}",
    "https://www.viber.com/{username}",
    "https://www.skype.com/en/people/{username}",
    "https://www.meetup.com/members/{username}",
    "https://nextdoor.com/profile/{username}",
    "https://www.joinclubhouse.com/@{username}",
    "https://www.twitch.tv/{username}",
    "https://www.kick.com/{username}",
    "https://www.likee.video/{username}",
    "https://badoo.com/{username}",
    "https://tinder.com/{username}",
    "https://bumble.com/{username}",
    "https://hinge.co/{username}",
    "https://www.okcupid.com/profile/{username}",
    "https://www.grindr.com/profile/{username}",
    "https://weareher.com/{username}",
    "https://www.pof.com/{username}",
    "https://tagged.com/profile/{username}",
    "https://myspace.com/{username}",
    "https://friendster.com/{username}",
    "https://hi5.com/{username}",
    "https://www.flickr.com/people/{username}",
    "https://www.deviantart.com/{username}",
    "https://www.behance.net/{username}",
    "https://dribbble.com/{username}",
    "https://ello.co/{username}",
    "https://foursquare.com/{username}",
    "https://swarmapp.com/{username}",
    "https://www.yelp.com/user_details?userid={username}",
    "https://www.goodreads.com/{username}",
    "https://letterboxd.com/{username}",
    "https://www.strava.com/athletes/{username}",
    "https://www.komoot.com/user/{username}",
    "https://www.ravelry.com/people/{username}",
    "https://www.wattpad.com/user/{username}",
    "https://medium.com/@{username}",
    "https://{username}.substack.com",
    "https://www.quora.com/profile/{username}",
    "https://stackoverflow.com/users/{username}",
    "https://gitlab.com/{username}",
    "https://www.patreon.com/{username}",
    "https://onlyfans.com/{username}",
    "https://www.xing.com/profile/{username}",
    "https://www.viadeo.com/{username}",
    "https://www.researchgate.net/profile/{username}",
    "https://www.academia.edu/{username}",
    "https://www.couchsurfing.com/people/{username}",
    "https://untappd.com/user/{username}",
    "https://soundcloud.com/{username}",
    "https://{username}.bandcamp.com",
    "https://www.last.fm/user/{username}",
    "https://www.reverbnation.com/{username}",
    "https://www.mixcloud.com/{username}",
    "https://triller.co/@{username}",
    "https://www.dubsmash.com/{username}",
    "https://www.houseparty.com/{username}",
    "https://yubo.live/{username}",
    "https://www.peanut-app.io/{username}",
    "https://www.vero.co/{username}",
    "https://mewe.com/i/{username}",
    "https://www.minds.com/{username}",
    "https://gab.com/{username}",
    "https://parler.com/profile/{username}",
    "https://truthsocial.com/{username}",
    "https://diasporafoundation.org/{username}",
    "https://friendica.com/{username}",
    "https://hive.social/{username}",
    "https://www.caffeine.tv/{username}",
    "https://trovo.live/{username}",
    "https://www.periscope.tv/{username}",
    "https://www.dailymotion.com/{username}",
    "https://vimeo.com/{username}",
    "https://rumble.com/{username}",
    "https://www.bitchute.com/{username}",
    "https://steamcommunity.com/id/{username}",
    "https://www.roblox.com/users/{username}",
    "https://www.minecraft.net/profile/{username}",
    "https://aminoapps.com/{username}",
    "https://www.gaiaonline.com/profiles/{username}",
    "https://www.habbo.com/habbo/{username}",
    "https://www.imvu.com/catalog/web_profile.php?uid={username}",
    "https://9gag.com/u/{username}",
    "https://ifunny.co/user/{username}"
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
// Anfrage Funktion mit Puppeteer - RICHTIGE BATCH-METHODE
// ========================================================================================
// concurrency ist die Anzahl der Browser die maximal gleichzeitig geöffnet werden
// Wert wird überschrieben von Funktion CheckUsername
async function fetchWithPuppeteer(username, Proxy_URL, specificUrls = null, concurrency = 5) {
    const launchOptions = { 
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    };

    if (Proxy_URL) { 
        launchOptions.args.push(`--proxy-server=${Proxy_URL}`);
    }
    
    // Bestimme welche URLs geprüft werden sollen
    let urlsToCheck;
    if (specificUrls) {
        urlsToCheck = Array.isArray(specificUrls) ? specificUrls : [specificUrls];
    } else {
        urlsToCheck = websites.map(site => site.replace('{username}', username));
    }
    
    const allResults = {};
    
    // Verarbeite URLs in Batches (blockweise) => siehe concurrency
    for (let i = 0; i < urlsToCheck.length; i += concurrency) {
        const batch = urlsToCheck.slice(i, i + concurrency);
        
        //console.log(chalk.blue(`[PUPPETEER] Batch ${Math.floor(i / concurrency) + 1}: Starte ${batch.length} Browser...`));
        
        // Starte seperate Browser für jede URL im Batch
        const batchPromises = batch.map(async (url) => {
            const browser = await puppeteer.launch(launchOptions);
            
            try {
                const page = await browser.newPage();
                await page.goto(url, { waitUntil: 'networkidle2', timeout: 10000 });
                const content = await page.content();
                const checkResult = contentIndicatesNotFound(content, url, username);
                await page.close();
                await browser.close();
                
                return { url, exists: checkResult.exists };
            } catch (error) {
                await browser.close();
                return { url, exists: null };
            }
        });
        
        // Warte bis ALLE Browser in diesem Batch fertig sind
        const batchResults = await Promise.all(batchPromises);
        
        // Speichere Ergebnisse
        batchResults.forEach(({ url, exists }) => {
            allResults[url] = exists;
        });
        
        //console.log(chalk.blue(`[PUPPETEER] Batch ${Math.floor(i / concurrency) + 1} abgeschlossen`));
    }
    
    return allResults;
}

// ========================================================================================
// Anfrage Funktion mit Axios für statische Webseiten
// ========================================================================================

async function fetchWithAxios(username, Proxy_URL, concurrency = 20) {
    const results = {}; // Speichert Ergebnisse für jede Website
    const axiosConfig = { // Config für die Axios anfragen
        headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
            'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7'
        },
        timeout: 3000, // 3 Sekunden
        validateStatus: () => true  // Alle Status-Codes akzeptieren
    };
    
    if (Proxy_URL) {  // fügt der config die Proxy IP hinzu
        axiosConfig.httpsAgent = new HttpsProxyAgent(Proxy_URL);
        axiosConfig.proxy = false;
    }
    
    // Funktion für einzelne URL-Prüfung
    const checkUrl = async (site) => {
        const url = site.replace('{username}', username);
        try {
            const response = await axios.get(url, axiosConfig);
            if (response.status === 200) {
                return { url, result: 'needs_puppeteer' };
            } else if (response.status === 404 || response.status === 406) {
                return { url, result: false };
            } else {
                if (url.toLowerCase().includes('linkedin.com') || 
                    url.toLowerCase().includes('pinterest.com')) {
                    return { url, result: 'needs_puppeteer' };
                } else {
                    //console.log(`Fehler: ${response.status} : ${url}`);
                    return { url, result: null };
                }
            }
        } catch (error) {
            return { url, result: null };
        }
    };
    
    // Parallel mit Batches verarbeiten
    for (let i = 0; i < websites.length; i += concurrency) {
        const batch = websites.slice(i, i + concurrency);
        const batchResults = await Promise.all(batch.map(checkUrl));
        
        // Ergebnisse speichern
        batchResults.forEach(({ url, result }) => {
            results[url] = result;
        });
    }
    
    return results;
}


//========================================================================================
// Hauptfunktion zur Überprüfung des Benutzernamens
// =======================================================================================

async function checkUsername(username, Proxy_URL) {
    const cachedResult = getCachedResult(username);
    if (cachedResult) {
        console.log(`Cache-Treffer für ${username}`);
        return cachedResult;
    }
    
    const axiosResults = await fetchWithAxios(username, Proxy_URL);
    
    const urlsNeedingPuppeteer = [];
    for (let [url, status] of Object.entries(axiosResults)) {
        if (status === 'needs_puppeteer') {
            urlsNeedingPuppeteer.push(url);
        }
    }
    
    if (urlsNeedingPuppeteer.length > 0) {
        const puppeteerResults = await fetchWithPuppeteer(
            username, 
            Proxy_URL, 
            urlsNeedingPuppeteer,
            3  // Wert der Browser gleichzeitig
        );
        
        Object.assign(axiosResults, puppeteerResults);
    }
    
    setCachedResult(username, axiosResults);
    return axiosResults;
}


// ========================================================================================
// Input-Menü / Schnittstelle für andere Programme
// ========================================================================================

async function start() {
    const argumentUser = process.argv[2];
    let Proxy_URL = process.argv[4];
    if (Proxy_URL === undefined){
        Proxy_URL = null;
    }

    if (argumentUser) {
        // Modus: Gesteuert durch Haupt-CLI oder direkter Aufruf mit Name
        const results = await checkUsername(argumentUser.trim(), Proxy_URL);
        
        console.log('\n' + chalk.green.bold('--- Ergebnisse der Social-Media Suche ---'));
        
        // Sortierung + (true) zuerst, dann - (false), dann ? (null)
        const sortedEntries = Object.entries(results).sort((a, b) => {
            const [urlA, statusA] = a;
            const [urlB, statusB] = b;
            
            // Definiere Priorität: true = 0, false = 1, null = 2
            const priorityA = statusA === true ? 0 : statusA === false ? 1 : 2;
            const priorityB = statusB === true ? 0 : statusB === false ? 1 : 2;
            
            return priorityA - priorityB;
        });
        
        // Ausgabe der sortierten Ergebnisse
        for (const [url, status] of sortedEntries) {
            if (status === true) {
                console.log(chalk.green(`[+] GEFUNDEN: `) + chalk.green(url));
            } else if (status === false) {
                console.log(chalk.red(`[-] NICHTS:   `) + chalk.red(url));
            } else {
                console.log(chalk.yellow(`[?] Fehler:   `) + chalk.yellow(url));
            }

        }
        process.exit(0);

    } else {
        // Modus: Manuelle Eingabe ohne Argumente
        readline.question(chalk.yellow("Username: "), async (input) => {
            const results = await checkUsername(input.trim());
            
            // Sortierung => siehe CLI
            const sortedEntries = Object.entries(results).sort((a, b) => {
                const [urlA, statusA] = a;
                const [urlB, statusB] = b;
                
                const priorityA = statusA === true ? 0 : statusA === false ? 1 : 2;
                const priorityB = statusB === true ? 0 : statusB === false ? 1 : 2;
                
                return priorityA - priorityB;
            });
            
            for (const [url, status] of sortedEntries) {
                if (status === true) console.log(chalk.green(`[+] GEFUNDEN: `) + url);
            }
            readline.close();
        });
    }
}

//================================
// MAIN
//================================

start();