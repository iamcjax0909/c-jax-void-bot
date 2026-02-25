// server.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const { default: makeWASocket, useSingleFileAuthState, fetchLatestBaileysVersion } = require('@adiwajshing/baileys');

// ---------- Setup Express ----------
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from public/
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ---------- WhatsApp session ----------
const sessionFile = './sessions/whatsapp.json';
const { state, saveState } = useSingleFileAuthState(sessionFile);

// ---------- WhatsApp Socket ----------
async function startBot() {
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    auth: state,
    version
  });

  sock.ev.on('creds.update', saveState);

  sock.ev.on('connection.update', (update) => {
    console.log('Connection Update:', update);
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    console.log('Message received:', messages[0].message);
    // Here you can add your command handling later
  });
}

// Start WhatsApp bot
startBot().catch(err => console.log('Bot Error:', err));

// ---------- API Routes ----------
app.post('/pair', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number required' });

  // In real deployment, you can generate a verification code here
  const code = Math.floor(100000 + Math.random() * 900000);
  // You can send this code to your own WhatsApp via bot later
  console.log(`Pair request: ${phone} | Code: ${code}`);
  res.json({ message: `Code sent to ${phone}`, code });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---------- Start server ----------
app.listen(PORT, () => {
  console.log(`🚀 C-Jax Void Bot running on port ${PORT}`);
});
