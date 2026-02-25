import express from "express";
import { readdirSync, existsSync, writeFileSync } from "fs";
import { join } from "path";
import pino from "pino";
import * as qrcode from "qrcode";
import { default: makeWASocket, useSingleFileAuthState, DisconnectReason } from "@whiskeysockets/baileys";
import fs from "fs-extra";

const PORT = process.env.PORT || 3000;
const app = express();
app.use(express.json());
app.use(express.static("public"));

// --- SESSION MANAGEMENT ---
const SESSIONS_FOLDER = "./sessions";
if (!existsSync(SESSIONS_FOLDER)) fs.mkdirSync(SESSIONS_FOLDER);

const sessions = {};

// Load existing sessions
readdirSync(SESSIONS_FOLDER).forEach(file => {
  const sessionName = file.replace(".json", "");
  sessions[sessionName] = useSingleFileAuthState(join(SESSIONS_FOLDER, file));
});

// --- PAIRING ROUTE ---
app.post("/pair", async (req, res) => {
  const { number } = req.body;
  if (!number) return res.status(400).send({ error: "Number required" });

  if (sessions[number]) return res.status(400).send({ error: "Already paired" });

  const sessionFile = join(SESSIONS_FOLDER, `${number}.json`);
  const { state, saveCreds } = useSingleFileAuthState(sessionFile);

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: true
  });

  sessions[number] = { sock, saveCreds };

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode;
      console.log(`Connection closed for ${number} - ${reason}`);
      delete sessions[number];
    } else if (connection === "open") {
      console.log(`✅ ${number} paired successfully!`);
    }
  });

  sock.ev.on("creds.update", saveCreds);

  // Generate QR code for the website
  const qrData = await qrcode.toDataURL("scan this with WhatsApp"); // temporary placeholder
  res.send({ qr: qrData, message: "Scan the QR with your WhatsApp to pair" });
});

// --- SIMPLE STATUS PAGE ---
app.get("/status", (req, res) => {
  res.send({
    onlineSessions: Object.keys(sessions).length
  });
});

app.listen(PORT, () => console.log(`🚀 C-Jax Void Bot running on port ${PORT}`));
