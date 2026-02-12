const fs = require('fs');
const path = require('path');

const projectDir = path.join(__dirname, 'Tracky-OSINT');

if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true });
    console.log(`Ordner 'Tracky-OSINT' erstellt.`);
} else {
    console.log(`Ordner 'Tracky-OSINT' existiert bereits.`);
}
