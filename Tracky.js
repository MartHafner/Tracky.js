// Track.js
// Tracky ist ein OSINT-Tool 
// Das hier stellt nur das MAIN fenster dar, in dem die anderen Module geladen werden
// Alle Module sind auch einzeln ausführbar, aber hier werden sie alle zusammengeführt


//====================================
// Imports
//====================================

const child_process = require('child_process'); // Um Externe Skripte auszuführen (Die Module)
const cliProgress = require('cli-progress'); // Für die Fortschrittsbalken, damit man sieht, wie weit die Module sind
const chalk = require('chalk'); // Für die Farben in der Konsole, damit es übersichtlicher ist
const readline = require('readline'); // Für die Benutzereingaben
const { env } = require('process');


//=====================================
// Konfiguration für Readlines
//=====================================

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});


//======================================
// Hilfsfunktionen
//======================================

function Zeilenumbruch(times){
    const Umbruch = '\n'.repeat(times);
    process.stdout.write(Umbruch);
}

const args = process.argv.slice(2); // Argumente aus der Kommandozeile

//======================================
//              COMMANDS
//======================================


//======================================
// Command: '--help' / '-h'
//======================================

function helper() {
    Zeilenumbruch(3);
    console.log(chalk.blue (' --help, -h: Zeigt diese Hilfe an'));
    console.log(chalk.blue (' --version, -v: Zeigt die aktuelle Version von Tracky an'));
    console.log(chalk.blue (' --number, -n <Zahl>: Sucht nach Handynummern'));
    Zeilenumbruch(3);
    process.exit(0) // Programm wird ohne Fehler beendet
}
//======================================
// Command: '--search' / '-s'
//======================================

function search(parameter) {
    const Usernamesearch = child_process.spawn('node', ['Profile_Check_Socialmedia.js', parameter],{
        env: {
            ...process.env,
            FORCE_COLOR: '1'
        }
        
    });
    // Schreibt die Ergebnisse des Moduls in den Terminal
    Usernamesearch.stdout.on('data', (data) => {
        process.stdout.write(data);
    });

    // Bei Fehlern
    Usernamesearch.stderr.on('data', (data) => {
        console.error(chalk.red(`[MODUL-FEHLER]: ${data}`));
    });
    // Schließ die Zeile für das Modul und gibt den Status Code des Programms aus
    Usernamesearch.on('close', (code) => {
        console.log(chalk.yellow(`\nModul beendet mit Code: ${code}`));
        process.exit(0); // Programm wird ohne Fehler beendet
    });
}

//===================================
// Command: '--number' / '-n'
//===================================

function Phonenummer(parameter) {
    const Numbersearch = child_process.spawn('node', ['Number_Check.js', String(parameter)],{
        env: {
            ...process.env,
            FORCE_COLOR: '1'
        }
        
    });
    //Schreibt die Ergebnisse des Moduls in den Terminal
    Numbersearch.stdout.on('data', (data) => {
        process.stdout.write(data);
    });
    Numbersearch.stderr.on('data', (data) => {
        console.error(chalk.red(`[MODUL-FEHLER]: ${data}`));
    });
    Numbersearch.on('close', (code) => {
        console.log(chalk.yellow(`\nModul beendet mit Code: ${code}`));
        process.exit(0); // Programm wird ohne Fehler beendet
    });
}



//===================================
// Argument handler
//===================================

async function Arghandler(args) {
    // Erst kommt das Arg. und dann der Parameter 
    // Beispiel: node Tracky.js --search MaxMustermann
    const LowercaseArgs = args[0].toLowerCase() // Wir nehmen das erste Argument und wandeln es in Kleinbuchstaben um, damit die Groß- und Kleinschreibung keine Rolle spielt
    const parameter = args[1]; // Das zweite Argument ist der Parameter, den die meisten Module benötigen, z.B. die Handynummer oder der Benutzername
    switch (LowercaseArgs) {
        // Wenn der Benutzer --help oder -h eingibt, wird die Hilfefunktion aufgerufen
        case "--help":
        case "-h":
            helper();
            break;


        // Wenn der Benutzer --version oder -v eingibt, wird die Version angezeigt
        case "--version":
        case "-v":
            console.log(chalk.blue("Tracky Version 1.0.0"));
            break;


        case "--search":
        case "-s":
            Zeilenumbruch(2)
            console.log(chalk.blue(`Die angegebene Suche ist: ${parameter}`));
            search(parameter);
            break;


        case "--number":
        case "-n":
            Zeilenumbruch(2)
            console.log(chalk.blue(`Die angegebene Nummer ist: ${parameter}`));
            Phonenummer(parameter);
            break;


        default:
            console.log(chalk.red("Ungültiges Argument. Verwende --help oder -h für Hilfe."));
            process.exit(1)

        }
}


//================================
// Start-Funktion
//================================

async function Start() {
    if (args.length > 0) { // Prüft ob ein Argument mit gegeben wurde
        Arghandler(args); // Falls ja wird das Arg an den Arg handler übergeben
}
    else {  // Falls nein wird ein Fehler zurück gegeben
        console.log(chalk.red("Kein Ziel angegeben. Verwende: node Tracky.js <Ziel>"));
        rl.close();
        process.exit(1); // und das Programm wird mit einem Fehler geschlossen
    }
}
//==============================
// MAIN
//==============================

Start();