const fs = require('fs');

const envLogs = Object.keys(process.env).filter(k => k.includes('ELECTRON') || k.includes('NODE')).map(k => `${k}=${process.env[k]}`).join('\n');

const info = [
    `Exec path: ${process.execPath}`,
    `Versions: ${JSON.stringify(process.versions)}`,
    `Env:\n${envLogs}`,
    `require('electron') type: ${typeof require('electron')}`
].join('\n\n');

console.log('===== DEBUG INFO =====\n' + info + '\n======================');

process.exit(0);
