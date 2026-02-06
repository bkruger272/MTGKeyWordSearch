const express = require('express');
const fs = require('fs');
const Scry = require("scryfall-sdk");
const cors = require('cors'); // 1. Import CORS
const app = express();
const PORT = 3000;


Scry.setAgent("MTG-Ability-Scanner", "1.0.0");

app.use(cors()); // 2. Enable CORS for all requests
app.use(express.static('public'));

async function getDefinition(keyword) {
    const query = keyword.toLowerCase().trim();
    // 1. Check Custom Rules
    const customData = JSON.parse(fs.readFileSync('custom_rules.json'));
    if (customData[query]) return customData[query];

    // 2. Check Scryfall
    try {
        const card = await Scry.Cards.random(`oracle:"${keyword}"`);
        const reminderMatch = card.oracle_text.match(/\(([^)]+)\)/);
        return reminderMatch ? reminderMatch[1] : "No reminder text found.";
    } catch (e) {
        return "Definition unavailable.";
    }
}

app.get('/search', async (req, res) => {
    // Your web app used ?q=keyword, so we keep that!
    const query = req.query.q;
    if (!query) return res.json([]);

    const terms = query.split(',').map(t => t.trim()).filter(t => t.length > 0);

    const results = [];
    for (const term of terms) {
        const definition = await getDefinition(term);
        results.push({ name: term, definition: definition });
    }
    res.json(results);
});

// Add this route to your server.js
app.get('/api/keys', (req, res) => {
  try {
    const customData = JSON.parse(fs.readFileSync('custom_rules.json'));
    // This gets every key (name) from your custom rules object
    const keys = Object.keys(customData); 
    res.json(keys);
  } catch (error) {
    res.status(500).json([]);
  }
});

app.listen(PORT, () => {
    console.log(`✨ MTG App running at http://localhost:${PORT}`);
});