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
        // We use q=kw: to find cards that officially have the keyword.
        // We exclude Lands to prevent the "{T}: Add {G}" issue (Connive).
        let response = await fetch(
            `https://api.scryfall.com/cards/search?q=kw:"${encodeURIComponent(query)}"+-t:land+-is:extra+not:digital&order=released&dir=desc`
        );
        let data = await response.json();

        if (data.data && data.data.length > 0) {
            // STRATEGY: Find the "Cleanest" card.
            // We want a card where the text actually contains the keyword followed by parentheses.
            const card = data.data.find(c => {
                const text = (c.oracle_text || "").toLowerCase();
                return text.includes(`${query} (`); 
            }) || data.data[0];
            
            let oracleText = card.oracle_text || "";

            // REGEX: 
            // 1. Look for the keyword (allowing for hyphens like web-slinging)
            // 2. Look for the first '(' on the SAME line.
            // 3. Capture everything until the first ')'.
            const sameLineRegex = new RegExp(`${query}[^\\n\\(]*?\\(([^)]+)\\)`, 'i');
            const match = oracleText.match(sameLineRegex);

            if (match && match[1]) {
                // CLEANUP: Remove mana symbols like {1}{G}{W} or {T} that sneak into reminder text
                const cleanDefinition = match[1].replace(/\{[^}]+\}/g, '').trim();

                const result = {
                    definition: cleanDefinition,
                    name: query.charAt(0).toUpperCase() + query.slice(1), // Use the keyword as the name
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
    try {
        const customData = JSON.parse(fs.readFileSync(getFilePath('custom_rules.json')));
        const key = query.replace('-', ''); // Handle hyphenated keys in JSON if needed
        if (customData[query] || customData[key]) {
            const result = { 
                definition: customData[query] || customData[key], 
                name: query.charAt(0).toUpperCase() + query.slice(1), 
                source: 'custom' 
            };
            scryCache[query] = result;
            return result;
        }
    } catch (e) {}

    return { definition: null, source: 'not_found' };
};

module.exports = { getDefinition, getAllKeys, isValidKeyword };