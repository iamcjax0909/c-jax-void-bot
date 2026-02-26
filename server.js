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

let sock = null

async function startWhatsApp(number) {
    const { state, saveCreds } = await useMultiFileAuthState("session")
    const { version } = await fetchLatestBaileysVersion()

    sock = makeWASocket({
        version,
        auth: state,
        logger: Pino({ level: "silent" })
    })

    sock.ev.on("creds.update", saveCreds)

    if (!sock.authState.creds.registered) {
        const code = await sock.requestPairingCode(number)
        return code
    }

    return "Already Connected"
}

app.post("/pair", async (req, res) => {
    try {
        const { number } = req.body

        if (!number) {
            return res.json({ error: "Number required" })
        }

        const code = await startWhatsApp(number)

        res.json({ code })

    } catch (err) {
        console.error(err)
        res.json({ error: "Failed to generate pairing code" })
    }
})

app.listen(PORT, () => {
    console.log(`😈 C-Jax Void Bot is Running on port ${PORT}`)
})
