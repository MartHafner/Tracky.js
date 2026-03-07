// Number_Checker.js
// Number_Checks ist da, um Nummer zu überprüfen und ist ein Modul von Tracky.js
// Mob. Vorwahlen bis jetzt aus DE, USA, FR
// Funktioniert besser mit einem Proxy oder VPN, um Blockierungen zu vermeiden. Es ist wichtig, die Suchanfragen nicht zu schnell hintereinander zu senden, um nicht als Bot erkannt zu werden. -> siehe google_Dorking_phonenumber.py

//========================================
// Imports & Initialisierung
//========================================

const chalk = require('chalk');
const { parsePhoneNumber } = require('libphonenumber-js/max');
const fs = require('fs').promises;
const path = require('path');
const { execFile, spawn } = require('child_process');

const SCRAPER_PATH = path.join(__dirname, 'google_Dorking_phonenumber.py');
const PYTHON_BIN   = process.env.PYTHON_BIN || 'python3';

//========================================
//          DB Ladevorgänge
//========================================

async function Vorwahl_Mobilfunk_DE_US() {
    try {
        const Data = await fs.readFile('Vorwahl_Mobilfunk_DE_US.json', 'utf-8');
        return JSON.parse(Data);
    } catch (error) {
        console.error('Fehler beim Laden der Datei DE_US:', error.message);
        return null;
    }
}

async function Vorwahl_Mobilfunk_FR() {
    try {
        const Data = await fs.readFile('Vorwahl_Mobilfunk_FR.json', 'utf-8');
        return JSON.parse(Data);
    } catch (error) {
        console.error('Fehler beim Laden der Datei FR:', error.message);
        return null;
    }
}

async function Vorwahl_Festnetz(phoneNumber) {
    return new Promise((resolve) => {
        const scriptPath = path.join(__dirname, 'Festnetz_Analyse.py');
        execFile('python3', [scriptPath, phoneNumber], (error, stdout) => {
            if (error) resolve('Unbekannt');
            else resolve(stdout.trim());
        });
    });
}

//========================================
// Online Suche
//========================================

async function Online_Suche(formattedNumber) {
    const nummerKompakt = formattedNumber.replace(/\s/g, '');

    return new Promise((resolve) => {
        let stdoutData = '';

        const child = spawn(PYTHON_BIN, [SCRAPER_PATH, nummerKompakt]);

        // Hier landet NUR das JSON (stdout) - das behalten wir
        child.stdout.on('data', (data) => {
            stdoutData += data.toString();
        });

        // Wir hören auf stderr, machen aber NICHTS damit.
        // Dadurch werden die [Python-Log] Zeilen in der JS-Konsole unterdrückt.
        child.stderr.on('data', (data) => {
            // Falls du später debuggen willst, kannst du hier ein console.error einfügen.
            // Für den produktiven Einsatz lassen wir es leer:
        });

        child.on('close', (code) => {
            if (code === 0 && stdoutData.trim()) {
                try {
                    const finalJson = JSON.parse(stdoutData);
                    resolve(finalJson);
                } catch (e) {
                    // Nur echte Fehler beim Parsen anzeigen
                    resolve([]);
                }
            } else {
                resolve([]);
            }
        });
    });
}

// Ausgabe der Online-Suchergebnisse
function Online_Suche_Ausgabe(results) {
    if (!results || results.length === 0) {
        console.log(chalk.red('   Keine Online-Treffer gefunden.'));
        return;
    }

    console.log(chalk.cyan(`\n--- Online-Suche ${results.length} Treffer ---`));
    for (const treffer of results) {
        console.log(chalk.green(`[+] GEFUNDEN : ${treffer.source}`));
    }
}

//========================================
// Hilfsfunktion
//========================================

function Umbruch(times) {
    process.stdout.write('\n'.repeat(times));
}

async function US_DE_Nummer(OhneKEN, land) {
    if (land === 'US' || land === 'DE') {
        const db = await Vorwahl_Mobilfunk_DE_US();
        if (!db) return 'DB Fehler';
        for (let vorwahl in db) {
            if (OhneKEN.startsWith(vorwahl)) return db[vorwahl];
        }
        return 'Unbekannt';
    } else if (land === 'FR') {
        const db = await Vorwahl_Mobilfunk_FR();
        if (!db) return 'DB Fehler';
        for (let vorwahl in db) {
            if (OhneKEN.startsWith(vorwahl)) return db[vorwahl];
        }
        return 'Unbekannt';
    }
}

//========================================
// Vorwahlchecker Mob. Nummer
//========================================

async function Vorwahl_Checker_Mob(Mob_Objekt) {
    const land              = Mob_Objekt.country;
    const formatierteNummer = Mob_Objekt.formatInternational().replace(/\s/g, '');
    let OhneKEN;

    if      (land === 'DE') OhneKEN = formatierteNummer.slice(3);
    else if (land === 'US') OhneKEN = formatierteNummer.slice(2);
    else if (land === 'FR') OhneKEN = formatierteNummer.slice(3);
    else return 'Unbekannt';

    return await US_DE_Nummer(OhneKEN, land);
}

//========================================
// Analyse der Mobilrufnummer
//========================================

async function Mob_NR_Analye(Mob_Nummer) {
    if (!Mob_Nummer || typeof Mob_Nummer !== 'object') {
        console.log(chalk.red('Fehler in Mob_NR_Analye: Ungültiges Objekt erhalten.'));
        process.exit(1);
    }

    console.log(chalk.cyan('\n--- Analyse-Ergebnisse ---'));
    Umbruch(1);

    const Anbietercheck = await Vorwahl_Checker_Mob(Mob_Nummer);
    const Land          = Mob_Nummer.country;

    console.log(`Nummer:    ${chalk.green(Mob_Nummer.formatInternational())}`);
    console.log(`Type:      ${chalk.green(Mob_Nummer.getType())}`);
    console.log(`Land:      ${chalk.green(Mob_Nummer.country)}`);

    if      (Land === 'DE' || Land === 'FR') console.log(`Anbieter:  ${chalk.green(Anbietercheck)}`);
    else if (Land === 'US')                  console.log(`Region:    ${chalk.green(Anbietercheck)}`);
    else                                     console.log(`Info:      ${chalk.red(Anbietercheck)}`);

    Umbruch(1);

    console.log(chalk.yellow('[*] Starte Online-Suche ...'));
    const onlineResults = await Online_Suche(Mob_Nummer.formatInternational());
    Online_Suche_Ausgabe(onlineResults);

    Umbruch(1);
    process.exit(0);
}

//========================================
// Analyse der Festnetznummer
//========================================

async function Festnetz(Festnetz_Nummer) {
    if (!Festnetz_Nummer || typeof Festnetz_Nummer !== 'object') {
        console.log(chalk.red('Fehler in Festnetz: Ungültiges Objekt erhalten.'));
        process.exit(1);
    }

    console.log(chalk.cyan('\n--- Analyse-Ergebnisse ---'));
    Umbruch(1);

    const RegionCheck = await Vorwahl_Festnetz(Festnetz_Nummer.formatInternational());

    console.log(`Nummer:    ${chalk.green(Festnetz_Nummer.formatInternational())}`);
    console.log(`Type:      ${chalk.green(Festnetz_Nummer.getType())}`);
    console.log(`Land:      ${chalk.green(Festnetz_Nummer.country)}`);
    console.log(`Region:    ${chalk.green(RegionCheck)}`);

    Umbruch(1);

    console.log(chalk.yellow('[*] Starte Online-Suche ...'));
    const onlineResults = await Online_Suche(Festnetz_Nummer.formatInternational());
    Online_Suche_Ausgabe(onlineResults);

    Umbruch(1);
    process.exit(0);
}

//========================================
// Startfunktion
//========================================

async function Start() {
    const Nummer = process.argv[2];

    if (!Nummer) {
        console.log(chalk.red('Keine Nummer erkannt. Bitte Nummer als Argument übergeben.'));
        process.exit(1);
    }

    try {
        const TelNummer = parsePhoneNumber(Nummer, 'DE');

        if (TelNummer && TelNummer.isValid()) {
            console.log(chalk.blue(`[*] Analysiere: ${TelNummer.formatInternational()}`));

            const type = TelNummer.getType();
            if (type === 'MOBILE' || type === 'FIXED_LINE_OR_MOBILE') {
                await Mob_NR_Analye(TelNummer);
            } else {
                await Festnetz(TelNummer);
            }
        } else {
            console.log(chalk.red(`Die Nummer ${Nummer} ist ungültig.`));
            process.exit(1);
        }
    } catch (error) {
        console.log(chalk.red(`Fehler: ${error.message}`));
        process.exit(1);
    }
}

Start();