import { makeWASocket, useSingleFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import express from 'express';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 3000;

// Create session folder if not exists
if (!fs.existsSync('./sessions')) fs.mkdirSync('./sessions');

const { state, saveState } = useSingleFileAuthState('./sessions/whatsapp.json');

// Start WhatsApp bot
const sock = makeWASocket({
    auth: state
});

sock.ev.on('creds.update', saveState);

sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if(connection === 'close') {
        const reason = lastDisconnect.error?.output?.statusCode;
        console.log('Disconnected:', reason);
    } else if(connection === 'open') {
        console.log('WhatsApp Connected ✅');
    }
});

app.get('/', (req, res) => {
    res.send('C-Jax Void Bot is running 😈');
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
