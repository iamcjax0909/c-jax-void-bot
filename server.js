import express from "express"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import P from "pino"
import {
  default as makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState
} from "@whiskeysockets/baileys"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.use(express.json())
app.use(express.static(path.join(__dirname, "public")))

const PORT = process.env.PORT || 10000

let sock

async function startSock() {
  const { state, saveCreds } = await useMultiFileAuthState(
    path.join(__dirname, "sessions")
  )

  const { version } = await fetchLatestBaileysVersion()

  sock = makeWASocket({
    version,
    logger: P({ level: "silent" }),
    auth: state,
    browser: ["C-Jax Void Bot", "Chrome", "1.0.0"]
  })

  sock.ev.on("creds.update", saveCreds)

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut

      console.log("Connection closed. Reconnecting:", shouldReconnect)

      if (shouldReconnect) {
        startSock()
      }
    } else if (connection === "open") {
      console.log("✅ WhatsApp Connected Successfully")
    }
  })
}

startSock()

// ROUTES

app.get("/", (req, res) => {
  res.send("😈 C-Jax Void Bot is Running!")
})

app.post("/pair", async (req, res) => {
  try {
    const { number } = req.body

    if (!number) {
      return res.json({ error: "Phone number required" })
    }

    const cleanNumber = number.replace(/[^0-9]/g, "")

    const code = await sock.requestPairingCode(cleanNumber)

    res.json({ pairingCode: code })
  } catch (err) {
    console.log("Pair error:", err)
    res.json({ error: "Failed to generate pairing code" })
  }
})

app.get("/status", (req, res) => {
  res.json({
    connected: !!sock?.user,
    user: sock?.user || null
  })
})

app.listen(PORT, () => {
  console.log(`😈 C-Jax Void Bot is Running on port ${PORT}`)
})
