const fs = require('fs');
const path = require('path');
const Scry = require("scryfall-sdk");

Scry.setAgent("MTG-Ability-Scanner", "1.0.2");

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
const getAllKeys = () => {
    try {
        const customData = JSON.parse(fs.readFileSync(getFilePath('custom_rules.json')));
        return Object.keys(customData);
    } catch (e) {
        console.error("Error reading custom keys:", e);
        return [];
    }
};
// backend -> scryfallService.js

const getDefinition = async (keyword) => {
    const query = keyword.toLowerCase().trim();
    if (scryCache[query]) return scryCache[query];

    // 1. Check Custom Rules first
    try {
        const customData = JSON.parse(fs.readFileSync(getFilePath('custom_rules.json')));
        if (customData[query]) {
            return { definition: customData[query], source: 'custom' };
        }
    } catch (e) {}

    // 2. Scryfall Fetch with Validation
    try {
            const response = await fetch(
                `https://api.scryfall.com/cards/search?q=kw:"${encodeURIComponent(query)}"+-is:extra+not:digital&order=released&dir=asc`
            );
            const data = await response.json();

            if (data.object === 'error' || !data.data || data.data.length === 0) {
                return { definition: null, source: 'not_found' };
            }

            const card = data.data[0];
            const oracleText = card.oracle_text || "";

            // STAGE 1: Try to find parentheses immediately following the keyword
            const specificRegex = new RegExp(`${query}.*?\\(([^)]+)\\)`, 'i');
            const specificMatch = oracleText.match(specificRegex);

            // STAGE 2: If that fails, just grab the first set of parentheses on the whole card
            const generalMatch = oracleText.match(/\(([^)]+)\)/);

            const resultText = specificMatch ? specificMatch[1] : (generalMatch ? generalMatch[1] : null);

            return {
                definition: resultText,
                name: card.name,
                source: 'scryfall'
            };

        } catch (err) {
            return { definition: null, source: 'error' };
        }
    };

module.exports = { getDefinition, getAllKeys, isValidKeyword };