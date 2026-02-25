import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} from "@whiskeysockets/baileys"

import express from "express"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 10000

app.use(express.json())
app.use(express.static("public"))

if (!fs.existsSync("./sessions")) {
    fs.mkdirSync("./sessions")
}

let sock = null
let pairingCode = null
let connectionStatus = "Disconnected"

async function startSock() {

    const { state, saveCreds } = await useMultiFileAuthState("./sessions")
    const { version } = await fetchLatestBaileysVersion()

    sock = makeWASocket({
        version,
        auth: state
    })

    sock.ev.on("creds.update", saveCreds)

    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update

        if (connection === "open") {
            connectionStatus = "Connected ✅"
            console.log("WhatsApp Connected")
        }

        if (connection === "close") {
            connectionStatus = "Disconnected ❌"
            const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut

            if (shouldReconnect) startSock()
        }
    })
}

startSock()

// API to request pairing code
app.post("/pair", async (req, res) => {
    try {
        const { number } = req.body

        if (!number) {
            return res.json({ error: "Phone number required" })
        }

        if (!sock) {
            return res.json({ error: "Socket not ready" })
        }

        const code = await sock.requestPairingCode(number)
        pairingCode = code

        res.json({ code })
    } catch (err) {
        console.log(err)
        res.json({ error: "Failed to generate pairing code" })
    }
})

// API to get connection status
app.get("/status", (req, res) => {
    res.json({
        status: connectionStatus
    })
})

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})
