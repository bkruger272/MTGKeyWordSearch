const fs = require('fs');
const path = require('path'); // Added for safer file pathing
const Scry = require("scryfall-sdk");

Scry.setAgent("MTG-Ability-Scanner", "1.0.0");

// Helper to resolve paths since this file is now deep in src/services
const getFilePath = (filename) => path.join(__dirname, '../../', filename);

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
        console.error("Error reading Keywords.json:", e.message);
        return false;
    }
};

const getDefinition = async (keyword) => {
    const query = keyword.toLowerCase().trim();
    
    // 1. Check Custom Rules
    try {
        const customData = JSON.parse(fs.readFileSync(getFilePath('custom_rules.json')));
        if (customData[query]) {
            return `${customData[query]} (Source: Custom)`; 
        }
    } catch (e) {
        // Log error but continue to Scryfall
    }

    // 2. Check Scryfall
    try {
        const card = await Scry.Cards.random(`oracle:"${keyword}"`);
        const reminderMatch = card.oracle_text.match(/\(([^)]+)\)/);
        
        if (reminderMatch) {
            return `${reminderMatch[1]} (Source: Scryfall)`;
        }
        return "Definition found, but no reminder text available. (Source: Scryfall)";
    } catch (err) {
        return "Definition currently unavailable.";
    }
};

const getAllKeys = () => {
    const customData = JSON.parse(fs.readFileSync(getFilePath('custom_rules.json')));
    return Object.keys(customData);
};

// Now both functions are defined and exported
module.exports = { getDefinition, getAllKeys, isValidKeyword };