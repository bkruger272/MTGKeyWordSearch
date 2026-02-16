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
    
    // Check Cache
    if (scryCache[query]) return scryCache[query];

    // --- STEP 1: SCRYFALL FETCH ---
    try {
        let response = await fetch(
            `https://api.scryfall.com/cards/search?q=kw:"${encodeURIComponent(query)}"+r:common+-is:extra+not:digital`
        );
        let data = await response.json();

        if (data.object === 'error') {
            response = await fetch(
                `https://api.scryfall.com/cards/search?q=kw:"${encodeURIComponent(query)}"+-is:extra+not:digital`
            );
            data = await response.json();
        }

        if (data.data && data.data.length > 0) {
            const card = data.data[0];
            const oracleText = card.oracle_text || "";

            const specificRegex = new RegExp(`${query}.*?\\(([^)]+)\\)`, 'i');
            const specificMatch = oracleText.match(specificRegex);
            const generalMatch = oracleText.match(/\(([^)]+)\)/);

            const scryfallDefinition = specificMatch ? specificMatch[1] : (generalMatch ? generalMatch[1] : null);

            if (scryfallDefinition && scryfallDefinition.trim().length > 0) {
                const result = {
                    definition: scryfallDefinition,
                    name: card.name,
                    source: 'scryfall'
                };
                scryCache[query] = result;
                return result;
            }
            // If no definition found in Scryfall text, we fall through to Step 2
        }
    } catch (err) {
        console.error("Scryfall fetch error:", err);
    }

    // --- STEP 2: CUSTOM RULES FALLBACK ---
    try {
        const customData = JSON.parse(fs.readFileSync(getFilePath('custom_rules.json')));
        if (customData[query]) {
            const result = { 
                definition: customData[query], 
                name: query.charAt(0).toUpperCase() + query.slice(1), 
                source: 'custom' 
            };
            scryCache[query] = result;
            return result;
        }
    } catch (e) {
        console.error("Custom rules error:", e);
    }

    return { definition: null, source: 'not_found' };
};

module.exports = { getDefinition, getAllKeys, isValidKeyword };