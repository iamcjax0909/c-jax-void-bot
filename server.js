import express from "express"
import makeWASocket, {
    useMultiFileAuthState,
    fetchLatestBaileysVersion
} from "@whiskeysockets/baileys"
import Pino from "pino"
import path from "path"
import { fileURLToPath } from "url"

const app = express()
const PORT = process.env.PORT || 10000

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

app.use(express.json())
app.use(express.static(path.join(__dirname, "public")))

let sock
let isSocketReady = false

async function initSocket() {
    const { state, saveCreds } = await useMultiFileAuthState("session")
    const { version } = await fetchLatestBaileysVersion()

    sock = makeWASocket({
        version,
        auth: state,
        logger: Pino({ level: "silent" }),
        browser: ["C-Jax Void Bot", "Chrome", "1.0.0"]
    })

    sock.ev.on("creds.update", saveCreds)

    sock.ev.on("connection.update", (update) => {
        const { connection } = update

        if (connection === "open") {
            console.log("WhatsApp Connected")
            isSocketReady = true
        }

        if (connection === "close") {
            console.log("Connection Closed")
            isSocketReady = false
        }
    })
}

app.post("/pair", async (req, res) => {
    try {
        const { number } = req.body

        if (!number) {
            return res.json({ error: "Number required" })
        }

        if (!sock) {
            await initSocket()
        }

        // wait until socket is ready (max 10 seconds)
        let attempts = 0
        while (!isSocketReady && attempts < 20) {
            await new Promise(resolve => setTimeout(resolve, 500))
            attempts++
        }

        if (!isSocketReady) {
            return res.json({ error: "WhatsApp not connected. Try again." })
        }

        const code = await sock.requestPairingCode(number)

        res.json({ code })

    } catch (err) {
        console.error(err)
        res.json({ error: "Failed to generate pairing code" })
    }
})

app.listen(PORT, () => {
    console.log(`😈 C-Jax Void Bot running on ${PORT}`)
})
