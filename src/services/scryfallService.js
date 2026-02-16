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
        const customKeys = Object.keys(customData);

        const rawData = fs.readFileSync(getFilePath('Keywords.json'));
        const data = JSON.parse(rawData);

        // BLACKLIST: Add things here that show up in suggestions but you don't want
        const blacklist = [
            // --- Ability Words (The "flavor" headers that don't have rules) ---
            'constellation', 'landfall', 'adamant', 'addictive', 'corrupted', 
            'coven', 'delirium', 'descend', 'fathomless descent', 'formidable', 
            'grandeur', 'hellbent', 'heroic', 'imprint', 'inspired', 'join forces', 
            'kinship', 'lieutenant', 'metalcraft', 'morbid', 'parley', 'radiance', 
            'revolt', 'spell-mastery', 'threshold', 'undergrowth', 'will of the council',

            // --- Card Types / Supertypes (Not keywords) ---
            'artifact', 'creature', 'enchantment', 'instant', 'sorcery', 'land', 
            'planeswalker', 'tribal', 'legendary', 'basic', 'snow', 'world',

            // --- Counters / Terms (Not keyword mechanics) ---
            'energy', 'poison', 'experience', 'ticket', 'attraction', 'stickers',

            // --- Modern/Specific Mechanics that are usually junk without context ---
            'historic', 'modified', 'party', 'clue', 'food', 'treasure', 'blood', 
            'incubate', 'role', 'map'
        ];

        const scryfallKeys = [
            ...data.data.abilityWords, 
            ...data.data.keywordAbilities, 
            ...data.data.keywordActions
        ].filter(k => !blacklist.includes(k.toLowerCase())); // FILTER OUT BLACKLIST

        const combined = [...new Set([...customKeys, ...scryfallKeys])];
        return combined.sort((a, b) => a.localeCompare(b));
    } catch (e) {
        console.error("Error building master key list:", e);
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
        // --- THE "HYBRID" SEARCH ---
        // We look for any card containing the keyword. 
        // We order by 'released' but we don't force 'asc' or 'desc' yet.
        // We use 'unique=cards' to get a clean list of unique oracle texts.
        let response = await fetch(
            `https://api.scryfall.com/cards/search?q=fo:"${encodeURIComponent(query)}"+-is:extra+not:digital&unique=cards`
        );
        let data = await response.json();

        if (data.data && data.data.length > 0) {
            // STRATEGY: Find the "Best Representative" card
            // 1. Try to find a card where the keyword is at the START of a line with a parenthesis.
            // 2. If that fails, find any card with the keyword + parenthesis.
            const card = data.data.find(c => {
                const text = (c.oracle_text || "").toLowerCase();
                return text.includes(`\n${query} (`) || text.startsWith(`${query} (`);
            }) || data.data.find(c => (c.oracle_text || "").toLowerCase().includes(`${query} (`)) 
               || data.data[0];

            let oracleText = card.oracle_text || "";
            
            // REGEX: Focused but keeps internal symbols like {B} or {1}
            // It looks for the keyword, then anything on the same line until a '('
            const flexibleRegex = new RegExp(`${query}[^\\n\\(]*?\\(([^)]+)\\)`, 'i');
            const match = oracleText.match(flexibleRegex);

            if (match && match[1]) {
                let definition = match[1].trim();

                // SPECIFIC FIX: Web-slinging (Keep symbols, but clean up double spaces)
                if (query.includes('slinging')) {
                    definition = definition.replace(/\s\s+/g, ' '); 
                }

                // SPECIFIC FIX: Mill (Standardize it so it's not "Mill 3")
                if (query === 'mill' && definition.toLowerCase().includes('library into your graveyard')) {
                    definition = "Put the top card of your library into your graveyard.";
                }

                const result = {
                    definition: definition, // We NO LONGER strip { } symbols here
                    name: query.charAt(0).toUpperCase() + query.slice(1),
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