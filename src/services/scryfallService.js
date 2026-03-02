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
        const rawData = fs.readFileSync(getFilePath('Keywords.json'));
        const data = JSON.parse(rawData);

        // BLACKLIST: Add things here that show up in suggestions but you don't want
        const blacklist = [
            // --- Ability Words (The "flavor" headers that don't have rules) ---
            'constellation', 'landfall', 'adamant', 'addictive', 'corrupted', 
            'coven', 'delirium', 'descend', 'fathomless descent', 'formidable', 
            'grandeur', 'hellbent', 'heroic', 'imprint', 'inspired', 'join forces', 
            'kinship', 'lieutenant', 'metalcraft', 'morbid', 'parley', 'radiance', 
            'revolt', 'spell-mastery', 'threshold', 'undergrowth', 'will of the council',"Council's dilemma",'Collect evicence',
            'hideway',

            // --- Card Types / Supertypes (Not keywords) ---
            'artifact', 'creature', 'enchantment', 'instant', 'sorcery', 'land', 
            'planeswalker', 'tribal', 'legendary', 'basic', 'snow', 'world',

            // --- Counters / Terms (Not keyword mechanics) ---
            'energy', 'poison', 'experience', 'ticket', 'attraction', 'stickers',

            // --- Modern/Specific Mechanics that are usually junk without context ---
            'historic', 'modified', 'party', 'clue', 'food', 'treasure', 'blood', 
            'incubate', 'role', 'map', 'Cumulative upkeep', 'Daybound', 'Nightbound', 'Choose a background','kinfall'
        ];

        const rawList = [
            ...Object.keys(customData),
            ...data.data.abilityWords, 
            ...data.data.keywordAbilities, 
            ...data.data.keywordActions
        ];

        // This removes duplicates regardless of Capitalization
        const uniqueMap = new Map();
        rawList.forEach(word => {
            const lower = word.toLowerCase();
            if (!uniqueMap.has(lower) && !blacklist.includes(lower)) {
                uniqueMap.set(lower, word.charAt(0).toUpperCase() + word.slice(1));
            }
        });

        return Array.from(uniqueMap.values()).sort((a, b) => a.localeCompare(b));
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
// ... (keep your imports and helper functions the same)

const getDefinition = async (keyword) => {
    const query = keyword.toLowerCase().trim();
    if (scryCache[query]) return scryCache[query];

    // --- 1. CUSTOM RULES (High Priority) ---
    try {
        const customData = JSON.parse(fs.readFileSync(getFilePath('custom_rules.json')));
        const customKey = Object.keys(customData).find(k => k.toLowerCase() === query);
        
        if (customKey) {
            const result = { 
                definition: customData[customKey], 
                name: customKey.charAt(0).toUpperCase() + customKey.slice(1), 
                source: 'custom' 
            };
            scryCache[query] = result;
            return result;
        }
    } catch (e) {}

    // --- 2. SCRYFALL FALLBACK ---
try {
        // We sort by 'released' to get older Core Sets which usually have the best reminder text
        let response = await fetch(
            `https://api.scryfall.com/cards/search?q=kw:"${encodeURIComponent(query)}"+not:digital&order=released&dir=asc`
        );
        let data = await response.json();

        if (data.data && data.data.length > 0) {
            
            // NEW & IMPROVED SEARCH: 
            // We only want a card where the keyword is immediately followed by a parenthesis.
            const regex = new RegExp(`${query}[^\\(]*?\\(([^)]+)\\)`, 'i');

            const cardWithExactReminder = data.data.find(c => {
                const text = c.oracle_text || "";
                // Does THIS specific card have "(reminder text)" for THIS specific keyword?
                return regex.test(text);
            });

            // If we found a card with the right reminder text, use it. 
            // Otherwise, use the first card found.
            const card = cardWithExactReminder || data.data[0];
            let oracleText = card.oracle_text || "";

            const match = oracleText.match(regex);

            if (match && match[1]) {
                const result = {
                    definition: match[1].trim(),
                    name: query.charAt(0).toUpperCase() + query.slice(1),
                    source: 'scryfall'
                };
                scryCache[query] = result;
                return result;
            } 
            
            // FALLBACK for core mechanics with NO reminder text (like Flying on most cards)
            return {
                definition: `Confirmed keyword: ${query.charAt(0).toUpperCase() + query.slice(1)}. This is a standard MTG mechanic. (No specific reminder text found in the Grimoire's current records).`,
                name: query.charAt(0).toUpperCase() + query.slice(1),
                source: 'scryfall_confirmed'
            };
        }
    } catch (err) {
        console.error("Scryfall error:", err);
    }

    return { definition: null, source: 'not_found' };
};

module.exports = { getDefinition, getAllKeys, isValidKeyword };