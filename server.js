const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const { default: makeWASocket, useSingleFileAuthState, DisconnectReason } = require('@adiwajshing/baileys');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;

// Sessions folder
fs.ensureDirSync('./sessions');

// Store pairing codes temporarily
const pairingCodes = {};

// WhatsApp connection using Baileys
const { state, saveState } = useSingleFileAuthState('./sessions/whatsapp.json');
const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true
});

sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if(connection === 'close') {
        if((lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut) {
            console.log('Reconnecting...');
        } else {
            console.log('Logged out. Delete whatsapp.json to re-login.');
        }
    }
});

sock.ev.on('creds.update', saveState);

// Generate 6-digit code
function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Endpoint to request pairing
app.post('/pair', async (req, res) => {
    const phone = req.body.phone;
    if(!phone) return res.send("❌ Enter a valid phone number");

    const code = generateCode();
    pairingCodes[phone] = code;

    // Send WhatsApp message to the number
    try {
        await sock.sendMessage(`${phone}@s.whatsapp.net`, { text: `📌 Your C-Jax Void Bot pairing code is: ${code}` });
        res.send("✅ Pairing code sent to your WhatsApp. Enter it below to confirm.");
    } catch(err) {
        console.log(err);
        res.send("❌ Failed to send WhatsApp message. Make sure your number is registered.");
    }
});

// Endpoint to verify code
app.post('/verify', (req, res) => {
    const { phone, code } = req.body;
    if(pairingCodes[phone] && pairingCodes[phone] === code) {
        // Save session file
        fs.writeFileSync(`./sessions/${phone}.json`, JSON.stringify({ phone, linked: true }));
        delete pairingCodes[phone];
        res.send("🎉 Successfully connected to C-Jax Void Bot!");
    } else {
        res.send("❌ Invalid code, try again.");
    }
});

app.listen(PORT, () => {
    console.log(`🚀 C-Jax Void Bot running on port ${PORT}`);
});
