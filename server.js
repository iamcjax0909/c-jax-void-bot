import express from "express";
import { readdirSync, existsSync, writeFileSync } from "fs";
import { join } from "path";
import fs from "fs-extra";

const PORT = process.env.PORT || 3000;
const app = express();
app.use(express.json());
app.use(express.static("public"));

// --- SESSIONS ---
const SESSIONS_FOLDER = "./sessions";
if (!existsSync(SESSIONS_FOLDER)) fs.mkdirSync(SESSIONS_FOLDER);

const sessions = {};

// Load existing sessions
readdirSync(SESSIONS_FOLDER).forEach(file => {
  const sessionName = file.replace(".json", "");
  sessions[sessionName] = { paired: true };
});

// --- PAIRING ROUTE ---
app.post("/pair", async (req, res) => {
  const { number } = req.body;
  if (!number) return res.status(400).send({ error: "Number required" });

  if (sessions[number]) return res.status(400).send({ error: "Already paired" });

  const sessionFile = join(SESSIONS_FOLDER, `${number}.json`);
  writeFileSync(sessionFile, JSON.stringify({ paired: true }));

  sessions[number] = { paired: true };

  res.send({ message: `✅ ${number} registered. You are now paired!` });
});

// --- STATUS PAGE ---
app.get("/status", (req, res) => {
  res.send({
    onlineSessions: Object.keys(sessions).length
  });
});

app.listen(PORT, () => console.log(`🚀 C-Jax Void Bot running on port ${PORT}`));
