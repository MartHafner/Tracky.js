// Mail_checker.js - E-Mail-Überprüfungs Modul für Tracky
// Das ist der Email_Checker.js, ein Modul von Tracky, das speziell für die Überprüfung von E-Mail-Adressen entwickelt wurde.
// Es dient dazu herauszufinden, auf welchen Plattformen eine E-Mail-Adresse registriert ist.
// Mehr dazu in der README.md Datei.

const chalk  = require('chalk');   // Für farbige Konsolenausgabe
const crypto = require('crypto');  // Für MD5-Hash (Gravatar)
const https  = require('https');   // Für HTTP-Anfragen



//========================================================================================
// Konfiguration
//========================================================================================

// Config für Readline
const readline = require('readline').createInterface({
    input:  process.stdin,
    output: process.stdout
});

const cache = new Map();           // Einfacher In-Memory-Cache
const CACHE_DURATION = 10 * 60 * 1000;     // 10 Minuten in Millisekunden

//config requests
const CONFIG = {
    timeout:     8000,  // ms pro Request
    concurrency: 10,    // parallele Requests gleichzeitig
};


//========================================================================================
// Hilfsfunktionen
//========================================================================================

function md5(str) {
    // Erstellt einen MD5-Hash (wird für Gravatar-Lookup benötigt)
    return crypto.createHash('md5').update(str.trim().toLowerCase()).digest('hex');
}

function validateEmail(email) {
    // Überprüft ob die E-Mail-Adresse ein gültiges Format hat
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function Zeilenumbruch(times){
    const Umbruch = '\n'.repeat(times);
    process.stdout.write(Umbruch);
}

//Nötig für Instagram, da der CSRF-Token in einem Cookie gesetzt wird und für die Anfrage benötigt wird
async function fetchCsrfToken(url, cookieHostname) {
    // Ruft eine Seite auf und extrahiert den CSRF-Token aus den Set-Cookie-Headern
    return new Promise((resolve) => {
        const parsedUrl = new URL(url);
        const reqOptions = {
            hostname: parsedUrl.hostname,
            path:     parsedUrl.pathname,
            method:   'GET',
            headers: {
                'User-Agent':      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
                'Accept':          'text/html,application/xhtml+xml,*/*',
                'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
            }
        };

        const timer = setTimeout(() => resolve(null), CONFIG.timeout);

        const req = https.request(reqOptions, (res) => {
            // CSRF-Token aus Set-Cookie Header extrahieren
            const cookies = res.headers['set-cookie'] ?? [];
            let csrfToken = null;

            for (const cookie of cookies) {
                const match = cookie.match(/csrftoken=([^;]+)/);
                if (match) {
                    csrfToken = match[1];
                    break;
                }
            }

            // Body konsumieren damit die Verbindung sauber geschlossen wird
            res.resume();
            res.on('end', () => {
                clearTimeout(timer);
                resolve(csrfToken);
            });
        });

        req.on('error', () => { clearTimeout(timer); resolve(null); });
        req.end();
    });
}


//========================================================================================
// Cache Handling Funktionen
//========================================================================================

function getCACHEkey(email) {
    // Generiert einen eindeutigen Cache-Schlüssel basierend auf der E-Mail
    return `cache_${email.toLowerCase()}`;
}

function getCachedResult(email) {
    // Überprüft, ob ein Ergebnis im Cache vorhanden und noch gültig ist
    const key    = getCACHEkey(email);
    const cached = cache.get(key);

    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        // Überprüft, ob der Cache-Eintrag noch gültig ist
        return cached.data;
    }

    if (cached) {
        cache.delete(key); // Entfernt abgelaufene Cache-Einträge
    }

    return null; // Gibt null zurück, wenn kein gültiger Cache-Eintrag vorhanden ist
}

function setCachedResult(email, data) {
    // Speichert ein Ergebnis im Cache
    const key = getCACHEkey(email);
    cache.set(key, {
        data:      data,        // Zu speichernde Daten
        timestamp: Date.now()   // Aktueller Zeitstempel
    });
}


//========================================================================================
// Fetch Hilfsfunktion (kein externes Paket nötig)
//========================================================================================

function fetchURL(url, options = {}) {
    // Sendet eine HTTPS-Anfrage und gibt Status + Body zurück
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const reqOptions = {
            hostname: parsedUrl.hostname,
            path:     parsedUrl.pathname + parsedUrl.search,
            method:   options.method || 'GET',
            headers: {
                'User-Agent':      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
                'Accept':          'application/json, text/html, */*',
                'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
                ...options.headers
            }
        };

        const timer = setTimeout(() => reject(new Error('Timeout')), CONFIG.timeout);

        const req = https.request(reqOptions, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                clearTimeout(timer);
                resolve({ status: res.statusCode, body });
            });
        });

        req.on('error', (err) => { clearTimeout(timer); reject(err); });

        if (options.body) req.write(options.body);
        req.end();
    });
}


//========================================================================================
// Liste der Checker-Plattformen
//========================================================================================
// Jeder Checker gibt zurück:
//   { found: true | false | null, detail: string?, url: string? }
//
//   found: true  = E-Mail ist auf dieser Plattform registriert
//          false = E-Mail ist NICHT registriert
//          null  = Unbekannt / Fehler / Rate-Limit

const checkers = [
    //===========================================================================
    // Facebook
    //===========================================================================
    // Recover-Endpunkt: Suche nach "account_recovery_method" im Body = Account existiert

    {
        name:     'Facebook',
        category: 'Social Media',
        async check(email) {
            try {
                const body = `email=${encodeURIComponent(email)}&recaptcha_response=&lsd=&jazoest=`;
                const res  = await fetchURL(
                    'https://www.facebook.com/recover/initiate/',
                    {
                        method:  'POST',
                        headers: {
                            'Content-Type':   'application/x-www-form-urlencoded',
                            'Content-Length': Buffer.byteLength(body),
                            'Referer':        'https://www.facebook.com/login/identify/'
                        },
                        body
                    }
                );
                if (res.status === 200) {
                    //const data = JSON.parse(res.body);
                    const bodyLower = res.body.toLowerCase();
                    //console.log(data);
                    // Facebook zeigt Wiederherstellungsoptionen wenn der Account existiert
                    if (bodyLower.includes('account_recovery') || bodyLower.includes('recovery_data')) {
                        return { found: true,  detail: 'Account gefunden', url: 'https://facebook.com' };
                    }
                    if (bodyLower.includes('no_account') || bodyLower.includes('couldn\'t find')) {
                        return { found: false };
                    }
                    return { found: null, detail: 'Antwort nicht auswertbar (ggf. CAPTCHA)' };
                }
                if (res.status === 429) return { found: null, detail: 'Rate-Limit erreicht' };
                return { found: null, detail: `HTTP ${res.status}` };
            } catch (err) {
                return { found: null, detail: 'Timeout / Fehler' };
            }
        }
    },
    //===========================================================================
    // Instagram
    //===========================================================================
    // Schritt 1: CSRF-Token von Instagram-Startseite holen
    // Schritt 2: Passwort-Reset-Anfrage mit gültigem Token senden

    {
        name:     'Instagram',
        category: 'Social Media',
        async check(email) {
            try {
                // Schritt 1: Echten CSRF-Token von Instagram holen
                const csrfToken = await fetchCsrfToken('https://www.instagram.com/', 'instagram.com');

                if (!csrfToken) {
                    return { found: null, detail: 'CSRF-Token konnte nicht abgerufen werden' };
                }

                // Schritt 2: Account-Recovery-Anfrage mit gültigem Token
                const body = `email_or_username=${encodeURIComponent(email)}`;
                const res  = await fetchURL(
                    'https://www.instagram.com/api/v1/web/accounts/account_recovery_send_ajax/',
                    {
                        method:  'POST',
                        headers: {
                            'Content-Type':       'application/x-www-form-urlencoded',
                            'Content-Length':     Buffer.byteLength(body),
                            'X-CSRFToken':        csrfToken,
                            'X-Instagram-AJAX':   '1',
                            'Referer':            'https://www.instagram.com/',
                            'Cookie':             `csrftoken=${csrfToken}`
                        },
                        body
                    }
                );

                if (res.status === 200) {
                    const data = JSON.parse(res.body);
                    if (data?.status === 'ok' && data?.recovery_method){
                        return { found: true,  detail: 'Account gefunden', url: 'https://instagram.com' };
                    }
                    if (data?.status !== 'ok') {
                        return { found: false };
                    }
                    else {
                        return { found: null, detail: 'Unbekannte Antwort' };
                    }
                }
                if (res.status === 429) return { found: null, detail: 'Rate-Limit erreicht' };
                if (res.status === 400) return { found: false }; // Instagram gibt 400 zurück wenn die E-Mail nicht gefunden wird
                return { found: null, detail: `HTTP ${res.status}` };

            } catch (err) {
                return { found: null, detail: 'Timeout / Fehler' };
            }
        }
    },
    //===========================================================================
    // HaveIBeenPwned
    //===========================================================================

    {
        name:     'HaveIBeenPwned',
        category: 'Sicherheit',
        async check(email) {
            try {
                const res = await fetchURL(
                    `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`,
                    {
                        headers: {
                            'hibp-api-key': process.env.HIBP_API_KEY ?? '',
                            'user-agent':   'osint-email-checker'
                        }
                    }
                );
                if (res.status === 200) {
                    const data  = JSON.parse(res.body);
                    const names = data.slice(0, 3).map(b => b.Name).join(', ');
                    return {
                        found:  true,
                        detail: `${data.length} Leaks: ${names}${data.length > 3 ? '…' : ''}`,
                        url:    `https://haveibeenpwned.com/account/${encodeURIComponent(email)}`
                    };
                }
                if (res.status === 404) return { found: false };
                if (res.status === 401) return { found: null, detail: 'API-Key fehlt (HIBP_API_KEY)' };
                return { found: null, detail: `HTTP ${res.status}` };
            } catch {
                return { found: null, detail: 'Timeout / Fehler' };
            }
        }
    },


    //===========================================================================
    // ProtonMail
    //===========================================================================

    {
        name:     'ProtonMail',
        category: 'E-Mail',
        async check(email) {
            // Nur @proton.me / @protonmail.com Adressen über PGP-Keyserver prüfbar
            if (!email.endsWith('@proton.me') && !email.endsWith('@protonmail.com')) {
                return { found: null, detail: 'Nur für @proton.me Adressen' };
            }
            try {
                const res = await fetchURL(
                    `https://api.protonmail.ch/pks/lookup?op=get&search=${encodeURIComponent(email)}`
                );
                if (res.status === 200) return { found: true, detail: 'PGP-Schlüssel gefunden' };
                return { found: false };
            } catch {
                return { found: null, detail: 'Timeout / Fehler' };
            }
        }
    },


    //===========================================================================
    // Microsoft / Skype
    //===========================================================================
    // GetCredentialType-Endpoint verrät ob ein Microsoft-Account existiert
    // IfExistsResult: 0 oder 4 = Account existiert, 1 = nicht gefunden

    {
        name:     'Microsoft',
        category: 'Tech',
        async check(email) {
            try {
                const body = JSON.stringify({ username: email });
                const res  = await fetchURL('https://login.live.com/GetCredentialType.srf', {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
                    body
                });
                if (res.status === 200) {
                    const data = JSON.parse(res.body);
                    if (data.IfExistsResult === 0 || data.IfExistsResult === 4) {
                        return { found: true, detail: 'Microsoft / Skype Account', url: 'https://account.microsoft.com' };
                    }
                    return { found: false };
                }
                return { found: null, detail: `HTTP ${res.status}` };
            } catch {
                return { found: null, detail: 'Timeout / Fehler' };
            }
        }
    },


    //===========================================================================
    // Spotify
    //===========================================================================
    // status 20 = E-Mail bereits vergeben, status 0 = verfügbar

    {
        name:     'Spotify',
        category: 'Musik',
        async check(email) {
            try {
                const res = await fetchURL(
                    `https://spclient.wg.spotify.com/signup/public/v1/account?validate=1&email=${encodeURIComponent(email)}`
                );
                if (res.status === 200) {
                    const data = JSON.parse(res.body);
                    if (data.status === 20) return { found: true,  detail: 'Account registriert', url: 'https://open.spotify.com' };
                    if (data.status === 0)  return { found: false };
                    return { found: null, detail: `Status: ${data.status}` };
                }
                return { found: null, detail: `HTTP ${res.status}` };
            } catch {
                return { found: null, detail: 'Timeout / Fehler' };
            }
        }
    },


    // ===========================================================================
    // Firefox Accounts
    // ===========================================================================

    {
        name:     'Firefox Accounts',
        category: 'Browser',
        async check(email) {
            try {
                const body = JSON.stringify({ email });
                const res  = await fetchURL('https://api.accounts.firefox.com/v1/account/status', {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
                    body
                });
                if (res.status === 200) {
                    const data = JSON.parse(res.body);
                    return {
                        found:  data.exists === true,
                        detail: data.exists ? 'Mozilla Account gefunden' : undefined,
                        url:    'https://accounts.firefox.com'
                    };
                }
                return { found: null, detail: `HTTP ${res.status}` };
            } catch {
                return { found: null, detail: 'Timeout / Fehler' };
            }
        }
    },


    //===========================================================================
    // Duolingo
    //===========================================================================

    {
        name:     'Duolingo',
        category: 'Bildung',
        async check(email) {
            try {
                const res = await fetchURL(
                    `https://www.duolingo.com/2017-06-30/users?email=${encodeURIComponent(email)}`
                );
                if (res.status === 200) {
                    const data = JSON.parse(res.body);
                    if (data.users && data.users.length > 0) {
                        const user = data.users[0];
                        return {
                            found:  true,
                            detail: `@${user.username}`,
                            url:    `https://www.duolingo.com/profile/${user.username}`
                        };
                    }
                    return { found: false };
                }
                return { found: null, detail: `HTTP ${res.status}` };
            } catch {
                return { found: null, detail: 'Timeout / Fehler' };
            }
        }
    },


    //===========================================================================
    // Imgur
    //===========================================================================
    // available: false = E-Mail bereits vergeben
    {
        name:     'Imgur',
        category: 'Bilder',
        async check(email) {
            try {
                const body = `email=${encodeURIComponent(email)}`;
                const res  = await fetchURL('https://imgur.com/signin/ajax_email_available', {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
                    body
                });
                if (res.status === 200) {
                    const data = JSON.parse(res.body);
                    if (data.data?.available === false) return { found: true,  detail: 'Account gefunden', url: 'https://imgur.com' };
                    if (data.data?.available === true)  return { found: false };
                    return { found: null, detail: 'Unbekannte Antwort' };
                }
                return { found: null, detail: `HTTP ${res.status}` };
            } catch {
                return { found: null, detail: 'Timeout / Fehler' };
            }
        }
    },

    //===========================================================================
    // LastPass
    //===========================================================================
    // Iterations-Endpoint: gibt einen Zahlenwert zurück wenn Account existiert

    {
        name:     'LastPass',
        category: 'Passwort-Manager',
        async check(email) {
            try {
                const body = `email=${encodeURIComponent(email)}`;
                const res  = await fetchURL('https://lastpass.com/iterations.php', {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
                    body
                });
                if (res.status === 200) {
                    const iterations = parseInt(res.body.trim(), 10);
                    if (!isNaN(iterations) && iterations > 0) {
                        return { found: true, detail: `${iterations} Iterationen`, url: 'https://lastpass.com' };
                    }
                    return { found: false };
                }
                return { found: null, detail: `HTTP ${res.status}` };
            } catch {
                return { found: null, detail: 'Timeout / Fehler' };
            }
        }
    },


    //===========================================================================
    // Mailchimp
    //===========================================================================

    {
        name:     'Mailchimp',
        category: 'Marketing',
        async check(email) {
            try {
                const body = JSON.stringify({ email });
                const res  = await fetchURL('https://login.mailchimp.com/signup/check-email', {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
                    body
                });
                if (res.status === 200) {
                    const data = JSON.parse(res.body);
                    if (data.taken === true) return { found: true, detail: 'Account gefunden', url: 'https://mailchimp.com' };
                    return { found: false };
                }
                return { found: null, detail: `HTTP ${res.status}` };
            } catch {
                return { found: null, detail: 'Timeout / Fehler' };
            }
        }
    },


    //===========================================================================
    // WordPress.com
    //===========================================================================

    {
        name:     'WordPress.com',
        category: 'CMS',
        async check(email) {
            try {
                const res = await fetchURL(
                    `https://public-api.wordpress.com/rest/v1/users/${encodeURIComponent(email)}/auth-options`
                );
                if (res.status === 200) return { found: true,  detail: 'Account gefunden', url: 'https://wordpress.com' };
                if (res.status === 404 || res.status === 400) return { found: false };
                return { found: null, detail: `HTTP ${res.status}` };
            } catch {
                return { found: null, detail: 'Timeout / Fehler' };
            }
        }
    },


    //===========================================================================
    // Patreon
    //===========================================================================
    // Login-Fehleranalyse: "falsches Passwort" = Account existiert

    {
        name:     'Patreon',
        category: 'Creator',
        async check(email) {
            try {
                const body = JSON.stringify({ data: { attributes: { email, password: '!' }, type: 'user' } });
                const res  = await fetchURL(
                    'https://www.patreon.com/api/login?include=user.null&json-api-version=1.0',
                    {
                        method:  'POST',
                        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
                        body
                    }
                );
                if (res.status === 200 || res.status === 401) {
                    const data         = JSON.parse(res.body);
                    const errors       = data.errors ?? [];
                    const wrongPasswort = errors.some(e => e.code_message?.toLowerCase().includes('password'));
                    if (wrongPasswort) return { found: true, detail: 'Account gefunden', url: 'https://patreon.com' };
                    return { found: false };
                }
                return { found: null, detail: `HTTP ${res.status}` };
            } catch {
                return { found: null, detail: 'Timeout / Fehler' };
            }
        }
    },


    //===========================================================================
    // Adobe
    //===========================================================================
    // CheckToken-Endpoint: "account_exists" = Account existiert, "not_found" = nicht registriert

    {
        name:     'Adobe',
        category: 'Design',
        async check(email) {
            try {
                const body = `username=${encodeURIComponent(email)}&client_id=adobedotcom2`;
                const res  = await fetchURL(
                    'https://ims-na1.adobelogin.com/ims/check/v6/token?client_id=adobedotcom2',
                    {
                        method:  'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
                        body
                    }
                );
                if (res.status === 200) {
                    const data = JSON.parse(res.body);
                    if (data.result === 'account_exists') return { found: true,  detail: 'Account gefunden', url: 'https://account.adobe.com' };
                    if (data.result === 'not_found')      return { found: false };
                    return { found: null, detail: data.result ?? 'Unbekannt' };
                }
                return { found: null, detail: `HTTP ${res.status}` };
            } catch {
                return { found: null, detail: 'Timeout / Fehler' };
            }
        }
    },


    // =============================================================================
    // Snapchat
    //==============================================================================
    // Login-Fehleranalyse: WRONG_PASSWORD = Account existiert

    {
        name:     'Snapchat',
        category: 'Social Media',
        async check(email) {
            try {
                const body = `email=${encodeURIComponent(email)}&password=FAKEPASSWORD`;
                const res  = await fetchURL('https://accounts.snapchat.com/accounts/login', {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
                    body
                });
                if (res.status === 200 || res.status === 400) {
                    const data = JSON.parse(res.body);
                    if (data?.status === 'WRONG_PASSWORD') return { found: true, detail: 'Account gefunden', url: 'https://snapchat.com' };
                    return { found: false };
                }
                return { found: null, detail: `HTTP ${res.status}` };
            } catch {
                return { found: null, detail: 'Timeout / Fehler' };
            }
        }
    },

];


//========================================================================================
// Concurrency-Limit für parallele Anfragen
//========================================================================================

async function runWithConcurrency(tasks, limit) {
    // Führt alle Tasks mit begrenzter Parallelität aus
    const results   = [];
    const executing = new Set();

    for (const task of tasks) {
        const p = task().then((r) => {
            executing.delete(p);
            return r;
        });
        executing.add(p);
        results.push(p);

        if (executing.size >= limit) {
            await Promise.race(executing); // Wartet bis mindestens einer fertig ist
        }
    }
    return Promise.all(results);
}


//========================================================================================
// Hauptfunktion zur Überprüfung der E-Mail
//========================================================================================

async function checkEmail(email) {
    const cachedResult = getCachedResult(email);
    if (cachedResult) {
        console.log(`Cache-Treffer für ${email}`);
        return cachedResult;
    }

    // Erstelle Tasks für alle Checker
    const tasks = checkers.map(checker => async () => {
        const result = await checker.check(email);
        return { platform: checker.name, category: checker.category, ...result };
    });

    // Führe alle Checks mit Concurrency-Limit aus
    const results = await runWithConcurrency(tasks, CONFIG.concurrency);

    setCachedResult(email, results);
    return results;
}


//========================================================================================
// Ausgabe der Ergebnisse
//========================================================================================

function printResults(email, results) {
    // Sortierung: gefunden zuerst, dann nicht gefunden, dann Fehler
    const sortedResults = [...results].sort((a, b) => {
        const priority = (r) => r.found === true ? 0 : r.found === false ? 1 : 2;
        return priority(a) - priority(b);
    });

    console.log('\n' + chalk.green.bold('--- Ergebnisse der E-Mail Suche ---'));
    Zeilenumbruch(1);

    // Ausgabe der sortierten Ergebnisse
    for (const r of sortedResults) {
        const detail = r.detail ? `  (${r.detail})` : '';
        const url    = r.url ?? r.platform;

        if (r.found === true) {
            console.log(chalk.green(`[+] GEFUNDEN: `) + chalk.green(`${url}`));
        } else if (r.found === false) {
            console.log(chalk.red(`[-] NICHTS:   `) + chalk.red(url));
        } else {
            console.log(chalk.yellow(`[?] Fehler:   `) + chalk.yellow(`${url}${detail}`));
        }
    }

    const found = sortedResults.filter(r => r.found === true).length;
    Zeilenumbruch(2);
    console.log(`Treffer: ${chalk.green.bold(found)} / ${results.length} Plattformen\n`);
}


//========================================================================================
// Input-Menü / Schnittstelle für andere Programme
//========================================================================================

async function start() {
    const argumentEmail = process.argv[2];

    if (argumentEmail === '--help' || argumentEmail === '-h') {
        console.log(chalk.yellow('\nVerwendung:'));
        console.log('  node Mail_Checker.js <email>');
        console.log('  node Mail_Checker.js test@example.com\n');
        console.log(chalk.yellow('Optionale Umgebungsvariablen:'));
        console.log('  HIBP_API_KEY   HaveIBeenPwned API-Key (https://haveibeenpwned.com/API/Key)\n');
        process.exit(0);
    }

    if (argumentEmail) {
        // Modus: Gesteuert durch Haupt-CLI oder direkter Aufruf mit E-Mail
        const email = argumentEmail.trim().toLowerCase();

        if (!validateEmail(email)) {
            console.log(chalk.red(`[!] Ungültige E-Mail-Adresse: ${email}`));
            process.exit(1);
        }

        const results   = await checkEmail(email);

        printResults(email, results);
        process.exit(0);

    } else {
        // Modus: Manuelle Eingabe ohne Argumente
        readline.question(chalk.yellow('E-Mail: '), async (input) => {
            const email = input.trim().toLowerCase();

            if (!validateEmail(email)) {
                console.log(chalk.red(`[!] Ungültige E-Mail-Adresse: ${email}`));
                readline.close();
                return;
            }


            const results   = await checkEmail(email);

            printResults(email, results);
            console.log(`\n  E-Mail : ${chalk.cyan(email)}`);
            readline.close();
        });
    }
}


//================================
// MAIN
//================================

start();