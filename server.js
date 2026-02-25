import express from "express";
import fs from "fs";
import path from "path";
import P from "pino";
import { makeWASocket, DisconnectReason, fetchLatestBaileysVersion } from "@whiskeysockets/baileys";

const app = express();
const PORT = process.env.PORT || 10000;
app.use(express.json());
app.use(express.static("public"));

// Logs
const logger = P({ level: 'info' });

// Sessions folder
const SESSION_FILE = './sessions/whatsapp.json';
let sessionData = {};
if (fs.existsSync(SESSION_FILE)) {
    sessionData = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
}

// Store generated pairing codes
let pairingCodes = {};

// Generate random pairing code
function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Save session
function saveSession() {
    fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData));
}

// Create WhatsApp socket
async function startWhatsApp() {
    const { version } = await fetchLatestBaileysVersion();
    const sock = makeWASocket({
        version,
        logger,
        auth: sessionData
    });

    sock.ev.on('connection.update', update => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            logger.info("QR generated (ignore if using phone pairing code).");
        }
        if (connection === 'close') {
            if ((lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut) {
                logger.info('Reconnecting...');
                startWhatsApp();
            } else {
                logger.info('Logged out from WhatsApp.');
            }
        } else if (connection === 'open') {
            logger.info('WhatsApp connected successfully!');
        }
    });

    sock.ev.on('creds.update', save => {
        sessionData = save;
        saveSession();
    });

    return sock;
}

// Start WhatsApp
const waSockPromise = startWhatsApp();

// -----------------
// Website endpoints
// -----------------

// Home
app.get('/', (req, res) => {
    res.sendFile(path.join(Deno.cwd ? Deno.cwd() : process.cwd(), 'public/index.html'));
});

// Request pairing code
app.post('/pair', async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'Phone number required' });

    const code = generateCode();
    pairingCodes[code] = { phone, created: Date.now() };
    res.json({ success: true, code });
});

// Verify pairing code
app.post('/verify', async (req, res) => {
    const { code } = req.body;
    const entry = pairingCodes[code];
    if (!entry) return res.status(400).json({ success: false, message: 'Invalid or expired code' });

    // Use WhatsApp to send notification to your phone
    const sock = await waSockPromise;
    await sock.sendMessage(entry.phone + '@s.whatsapp.net', { text: `✅ Successfully connected to C-Jax Void Bot!` });

    delete pairingCodes[code];
    res.json({ success: true, message: 'Connected successfully!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`😈 C-Jax Void Bot is Running on port ${PORT}`);
});
