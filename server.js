const express = require('express');
const fs = require('fs');
const Scry = require("scryfall-sdk");
const app = express();
const PORT = 3000;

Scry.setAgent("MTG-Ability-Scanner", "1.0.0");

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
    const query = req.query.q;
    const terms = query.split(/[,\s]+/).filter(t => t.trim().length >= 3); // Only search words 3+ chars long

    if (terms.length === 0) return res.json([]);

    const results = [];
    for (const term of terms) {
        const definition = await getDefinition(term);
        results.push({ name: term, definition: definition });
    }
    res.json(results);
});

app.listen(PORT, () => {
    console.log(`✨ MTG App running at http://localhost:${PORT}`);
});