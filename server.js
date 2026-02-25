import makeWASocket, { 
    useMultiFileAuthState, 
    DisconnectReason 
} from '@whiskeysockets/baileys'

import express from 'express'
import fs from 'fs'

const app = express()
const PORT = process.env.PORT || 3000

// Create sessions folder if it doesn't exist
if (!fs.existsSync('./sessions')) {
    fs.mkdirSync('./sessions')
}

// Use modern multi-file auth
const startSock = async () => {

    const { state, saveCreds } = await useMultiFileAuthState('./sessions')

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update

        if (connection === 'close') {
            const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut

            console.log('Connection closed. Reconnecting:', shouldReconnect)

            if (shouldReconnect) {
                startSock()
            }
        } else if (connection === 'open') {
            console.log('✅ WhatsApp Connected Successfully!')
        }
    })
}

startSock()

app.get('/', (req, res) => {
    res.send('😈 C-Jax Void Bot is Running!')
})

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})
