import express from "express"
import makeWASocket, {
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    DisconnectReason
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

async function startWhatsApp(number) {

    const { state, saveCreds } = await useMultiFileAuthState("session")
    const { version } = await fetchLatestBaileysVersion()

    return new Promise((resolve, reject) => {

        const sock = makeWASocket({
            version,
            auth: state,
            logger: Pino({ level: "silent" }),
            browser: ["C-Jax Void Bot", "Chrome", "1.0.0"]
        })

        sock.ev.on("creds.update", saveCreds)

        sock.ev.on("connection.update", async (update) => {

            const { connection, lastDisconnect } = update

            if (connection === "open") {

                try {
                    if (!sock.authState.creds.registered) {

                        // small delay ensures backend is ready
                        setTimeout(async () => {
                            const code = await sock.requestPairingCode(number)
                            resolve(code)
                        }, 3000)

                    } else {
                        resolve("Already Connected")
                    }

                } catch (err) {
                    reject("Failed to request pairing code")
                }
            }

            if (connection === "close") {
                const shouldReconnect =
                    lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut

                if (!shouldReconnect) {
                    reject("Logged out. Delete session folder.")
                }
            }
        })
    })
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
        res.json({ error: "Pairing failed" })
    }
})

app.listen(PORT, () => {
    console.log(`😈 C-Jax Void Bot is Running on port ${PORT}`)
})
