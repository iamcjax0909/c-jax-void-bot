const express = require("express")
const fs = require("fs")
const path = require("path")
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys")

const P = require("pino")

const app = express()
app.use(express.json())

let sock = null
let isConnecting = false

// =========================
// START SOCKET FUNCTION
// =========================
async function startSock() {
  if (isConnecting) return
  isConnecting = true

  const { state, saveCreds } = await useMultiFileAuthState("./sessions")

  const { version } = await fetchLatestBaileysVersion()

  sock = makeWASocket({
    version,
    logger: P({ level: "silent" }),
    auth: state,
    browser: ["C-Jax Void Bot", "Chrome", "1.0.0"]
  })

  sock.ev.on("creds.update", saveCreds)

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut

      console.log("Connection closed. Reconnecting:", shouldReconnect)

      if (shouldReconnect) {
        startSock()
      } else {
        console.log("Logged out. Clearing session.")
        if (fs.existsSync("./sessions")) {
          fs.rmSync("./sessions", { recursive: true, force: true })
        }
      }
    }

    if (connection === "open") {
      console.log("✅ WhatsApp Connected Successfully")
    }
  })

  isConnecting = false
}

// Start socket when server boots
startSock()

// =========================
// ROOT ROUTE
// =========================
app.get("/", (req, res) => {
  res.send("😈 C-Jax Void Bot is Running!")
})

// =========================
// GENERATE PAIRING CODE
// =========================
app.post("/pair", async (req, res) => {
  try {
    const { number } = req.body

    if (!number) {
      return res.json({ error: "Phone number is required" })
    }

    if (!sock) {
      await startSock()
    }

    // If already registered
    if (sock.authState?.creds?.registered) {
      return res.json({
        message: "Bot already connected to WhatsApp"
      })
    }

    const cleanNumber = number.replace(/[^0-9]/g, "")

    const code = await sock.requestPairingCode(cleanNumber)

    res.json({
      pairingCode: code
    })

  } catch (err) {
    console.log("Pairing Error:", err)

    res.json({
      error: "Failed to generate pairing code. Try resetting session."
    })
  }
})

// =========================
// RESET SESSION
// =========================
app.post("/reset", async (req, res) => {
  try {
    if (fs.existsSync("./sessions")) {
      fs.rmSync("./sessions", { recursive: true, force: true })
    }

    await startSock()

    res.json({
      message: "Session reset successful. You can generate new pairing code."
    })

  } catch (err) {
    console.log(err)

    res.json({
      error: "Failed to reset session"
    })
  }
})

// =========================
// HEALTH CHECK
// =========================
app.get("/status", (req, res) => {
  if (!sock) {
    return res.json({ status: "Socket not initialized" })
  }

  res.json({
    connected: sock.user ? true : false,
    user: sock.user || null
  })
})

// =========================
// START SERVER
// =========================
const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
})
