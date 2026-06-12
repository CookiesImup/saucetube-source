const express = require("express");
const fetch = require("node-fetch");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const HF_HEADERS = {
  "Accept": "application/json",
  "Content-Type": "application/json",
  "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36",
  "Referer": "https://ytconvert.org/"
};

// POST /api/download — request download job
app.post("/api/download", async (req, res) => {
  const { url, output } = req.body;
  if (!url || !output) return res.status(400).json({ error: "Missing url or output" });

  try {
    const r = await fetch("https://ytdl.y2mp3.co/api/v2/download", {
      method: "POST",
      headers: HF_HEADERS,
      body: JSON.stringify({ url, output })
    });
    const data = await r.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/status/:id — poll status
app.get("/api/status/:id", async (req, res) => {
  try {
    const r = await fetch(`https://ytdl.y2mp3.co/api/status/${req.params.id}`, {
      headers: HF_HEADERS
    });
    const data = await r.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SauceTube running on port ${PORT}`));

module.exports = app;
  
