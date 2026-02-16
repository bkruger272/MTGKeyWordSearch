const fs = require('fs');
const path = require('path');
const Scry = require("scryfall-sdk");

Scry.setAgent("MTG-Ability-Lookup", "1.0.2");

const getFilePath = (filename) => path.join(__dirname, '../../', filename);

const scryCache = {};

// --- HELPER FUNCTIONS ---

const getAllKeys = () => {
    try {
        const customData = JSON.parse(fs.readFileSync(getFilePath('custom_rules.json')));
        return Object.keys(customData);
    } catch (e) {
        console.error("Error reading custom keys:", e);
        return [];
    }
};

const isValidKeyword = (term) => {
    const query = term.toLowerCase().trim();
    const customKeys = getAllKeys().map(k => k.toLowerCase());
    
    try {
        const rawData = fs.readFileSync(getFilePath('Keywords.json'));
        const data = JSON.parse(rawData);
        const allKeywords = [
            ...data.data.abilityWords, 
            ...data.data.keywordAbilities, 
            ...data.data.keywordActions
        ].map(k => k.toLowerCase());
        
        return allKeywords.includes(query) || customKeys.includes(query);
    } catch (e) {
        return customKeys.includes(query);
    }
};

// --- MAIN SEARCH LOGIC ---
const getDefinition = async (keyword) => {
    const query = keyword.toLowerCase().trim();
    if (scryCache[query]) return scryCache[query];

    try {
        // IMPROVED FETCH: Look for cards where the oracle text START with the keyword
        // This avoids cards like Aetherstream Leopard that have multiple mechanics.
        let response = await fetch(
            `https://api.scryfall.com/cards/search?q=kw:"${encodeURIComponent(query)}"+-is:extra+not:digital&order=released&dir=desc`
        );
        let data = await response.json();

        if (data.data && data.data.length > 0) {
            // STEP A: Try to find a card in the results that has the "cleanest" text
            // We want a card where the keyword and its reminder text are the ONLY things.
            const card = data.data.find(c => (c.oracle_text || "").toLowerCase().startsWith(query)) || data.data[0];
            
            const oracleText = card.oracle_text || "";

            // LOGGING FOR YOU: This will show up in your Render logs
            console.log(`[DEBUG] Keyword: ${query} | Card Found: ${card.name}`);
            console.log(`[DEBUG] Raw Oracle: ${oracleText}`);

            // NEW REGEX: It looks for the keyword, some spaces, and then the (reminder text)
            // The [^\n]* ensures it STAYs ON THE SAME LINE. It won't jump to Energy on the next line.
            const sameLineRegex = new RegExp(`${query}[^\\n\\(]*?\\(([^)]+)\\)`, 'i');
            const match = oracleText.match(sameLineRegex);

            if (match && match[1]) {
                const result = {
                    definition: match[1],
                    name: card.name,
                    source: 'scryfall'
                };
                scryCache[query] = result;
                return result;
            }
        }
    } catch (err) {
        console.error("Scryfall error:", err);
    }

    // --- STEP 2: CUSTOM RULES FALLBACK ---
    // (Keep your existing Custom Rules logic here)
    try {
        const customData = JSON.parse(fs.readFileSync(getFilePath('custom_rules.json')));
        if (customData[query]) {
            return { 
                definition: customData[query], 
                name: query.charAt(0).toUpperCase() + query.slice(1), 
                source: 'custom' 
            };
        }
    } catch (e) {}

    return { definition: null, source: 'not_found' };
};

module.exports = { getDefinition, getAllKeys, isValidKeyword };