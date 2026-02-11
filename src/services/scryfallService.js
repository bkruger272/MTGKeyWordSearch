const fs = require('fs');
const path = require('path');
const Scry = require("scryfall-sdk");

Scry.setAgent("MTG-Ability-Scanner", "1.0.0");

const getFilePath = (filename) => path.join(__dirname, '../../', filename);

// Simple in-memory cache to prevent multiple API calls for the same word
const scryCache = {};

const isValidKeyword = (term) => {
    try {
        const rawData = fs.readFileSync(getFilePath('Keywords.json'));
        const data = JSON.parse(rawData);
        const allKeywords = [
            ...data.data.abilityWords, 
            ...data.data.keywordAbilities, 
            ...data.data.keywordActions
        ].map(k => k.toLowerCase());
        
        return allKeywords.includes(term.toLowerCase().trim());
    } catch (e) {
        return false;
    }
};

const getDefinition = async (keyword) => {
    const query = keyword.toLowerCase().trim();
    
    // 1. Check Cache
    if (scryCache[query]) return scryCache[query];

    // 2. Check Custom Rules
    try {
        const customData = JSON.parse(fs.readFileSync(getFilePath('custom_rules.json')));
        if (customData[query]) {
            const result = { definition: customData[query], source: 'custom' };
            scryCache[query] = result;
            return result;
        }
    } catch (e) {}

    // 3. Check Scryfall using a direct API call (More reliable than the SDK Search)
    try {
        // We use the 'cards/search' endpoint directly
        const response = await fetch(
            `https://api.scryfall.com/cards/search?q=kw:"${encodeURIComponent(query)}"+-is:promo+-is:spotlight+not:digital+frame:2015`
        );
        const data = await response.json();

        if (data.object === 'error' || !data.data || data.data.length === 0) {
            throw new Error("Not found");
        }

        // Always take the first card in the results
        const card = data.data[0];
        const reminderMatch = card.oracle_text.match(/\(([^)]+)\)/);
        
        const result = {
            definition: reminderMatch ? reminderMatch[1] : "Official rule found, but no reminder text available.",
            source: 'scryfall'
        };

        scryCache[query] = result;
        return result;

    } catch (err) {
        console.error("Scryfall Fetch Error:", err.message);
        return {
            definition: "Definition currently unavailable.",
            source: 'error'
        };
    }
};

const getAllKeys = () => {
    try {
        const customData = JSON.parse(fs.readFileSync(getFilePath('custom_rules.json')));
        return Object.keys(customData);
    } catch (e) {
        return [];
    }
};

module.exports = { getDefinition, getAllKeys, isValidKeyword };