import express from "express";
import { makeWASocket, DisconnectReason, useSingleFileAuthState } from "@whiskeysockets/baileys";
import fs from "fs";

const PORT = process.env.PORT || 10000;
const app = express();
app.use(express.json());

const SESSIONS_FILE = "./sessions/whatsapp.json";
if (!fs.existsSync("./sessions")) fs.mkdirSync("./sessions");

const { state, saveState } = useSingleFileAuthState(SESSIONS_FILE);

const sock = makeWASocket({
  auth: state,
  printQRInTerminal: false
});

sock.ev.on("connection.update", (update) => {
  const { connection, lastDisconnect } = update;
  if (connection === "close") {
    const status = lastDisconnect?.error?.output?.statusCode;
    if (status !== 401) {
      console.log("Reconnecting...");
      sock.ws.close();
    }
  }
  if (connection === "open") {
    console.log("😈 C-Jax Void Bot connected to WhatsApp!");
  }
});

sock.ev.on("creds.update", saveState);

// ====== Express Routes ======

// Home
app.get("/", (req, res) => res.send("😈 C-Jax Void Bot is Running!"));

// Status
app.get("/status", (req, res) => {
  res.json({
    connected: sock.user != null,
    user: sock.user || null
  });
});

// Pairing request
app.post("/pair", async (req, res) => {
  const { number } = req.body;
  if (!number) return res.status(400).json({ error: "Number is required" });

  try {
    const pairingCode = Math.floor(100000 + Math.random() * 900000); // 6-digit code
    // Save pairing code somewhere (in-memory for now)
    sock.pairingCode = pairingCode;
    sock.pairingNumber = number;

    // Here you would send WhatsApp message via sock.sendMessage(number,...)
    // For testing we just return the code
    res.json({
      message: `Pairing code generated for ${number}`,
      code: pairingCode
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to generate pairing code" });
  }
});

// Reset (if pairing fails)
app.post("/reset", (req, res) => {
  sock.pairingCode = null;
  sock.pairingNumber = null;
  res.json({ message: "Pairing reset done" });
});

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
