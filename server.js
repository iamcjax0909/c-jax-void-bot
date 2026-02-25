import express from "express";
import { makeWASocket, DisconnectReason, fetchLatestBaileysVersion, useSingleFileAuthState } from "@whiskeysockets/baileys";
import fs from "fs";

const PORT = process.env.PORT || 10000;
const app = express();
app.use(express.json());

// Make sessions folder
if (!fs.existsSync("./sessions")) fs.mkdirSync("./sessions");
const SESSION_FILE = "./sessions/whatsapp.json";

// v6+ auth state
import { state, saveState } from "@whiskeysockets/baileys/lib/Utils/auth-utils.js";
const { auth, saveCreds } = state(SESSION_FILE);

const sock = makeWASocket({
    auth,
    printQRInTerminal: false,
});

sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        if (statusCode !== 401) sock.ws.close();
    }
    if (connection === "open") {
        console.log("😈 C-Jax Void Bot connected to WhatsApp!");
    }
});

sock.ev.on("creds.update", saveCreds);

// ===== Express Routes =====
app.get("/", (req, res) => res.send("😈 C-Jax Void Bot is Running!"));

app.get("/status", (req, res) => {
    res.json({
        connected: !!sock.user,
        user: sock.user || null,
    });
});

// Simple pairing route
let tempPair = {};

app.post("/pair", (req, res) => {
    const { number } = req.body;
    if (!number) return res.status(400).json({ error: "Number is required" });

    const code = Math.floor(100000 + Math.random() * 900000); // 6-digit
    tempPair[number] = code;

    // Normally you'd send the code to WhatsApp here
    res.json({ number, code, message: "Pairing code generated" });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
