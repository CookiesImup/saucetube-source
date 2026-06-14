const express = require("express");
const fetch = require("node-fetch");
const path = require("path");
const { spawn } = require("child_process");

// Bot spawner — restart every 5 minutes
let botProcess = null;

function startBot() {
  if (botProcess) {
    botProcess.kill();
    botProcess = null;
  }
  console.log("[Bot] Starting bot/index.js...");
  botProcess = spawn("node", [path.join(__dirname, "bot", "index.js")], {
    stdio: "inherit",
    detached: false
  });
  botProcess.on("exit", function(code) {
    console.log("[Bot] Exited with code", code);
    botProcess = null;
  });
}

startBot();
setInterval(function() {
  console.log("[Bot] Auto-restart (5 min)");
  startBot();
}, 5 * 60 * 1000);

// Web server
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const YT_HEADERS = {
  "Accept": "application/json",
  "Content-Type": "application/json",
  "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36",
  "Referer": "https://ytconvert.org/"
};

app.post("/api/download", async (req, res) => {
  const { url, output } = req.body;
  if (!url || !output) return res.status(400).json({ error: "Missing url or output" });
  try {
    const r = await fetch("https://ytdl.y2mp3.co/api/v2/download", {
      method: "POST", headers: YT_HEADERS, body: JSON.stringify({ url, output })
    });
    res.json(await r.json());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/status/:id", async (req, res) => {
  try {
    const r = await fetch("https://ytdl.y2mp3.co/api/status/" + req.params.id, { headers: YT_HEADERS });
    res.json(await r.json());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/tiktok", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "Missing url" });
  try {
    const r = await fetch("https://tikwm.com/api/?url=" + url, {
      headers: { "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36" }
    });
    res.json(await r.json());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/ig", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "Missing url" });
  try {
    const r = await fetch("https://api.nexray.eu.cc/downloader/v2/instagram?url=" + encodeURIComponent(url), {
      headers: { "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36" }
    });
    const data = await r.json();
    if (data.author) data.author = "SauceTube";
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "landing.html"));
});

app.get("/youtube", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "youtube.html"));
});

app.get("/tiktok", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "tiktok.html"));
});

app.get("/instagram", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "instagram.html"));
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "landing.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("SauceTube running on port " + PORT));
module.exports = app;
