const scryService = require('../services/scryfallService');
const fs = require('fs');
const path = require('path');

// 1. Define handleSearch directly on the exports object
exports.handleSearch = async (req, res) => {
    const query = req.query.q;
    if (!query) return res.json([]);

    const terms = query.split(',').map(t => t.trim()).filter(t => t !== "");
    
    try {
        const results = await Promise.all(terms.map(async (term) => {
            const result = await scryService.getDefinition(term);
            return {
                name: term,
                definition: result.definition, // Extract from object
                source: result.source          // Extract from object
            };
        }));
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch definitions" });
    }
};

// 2. Define getKeys directly on the exports object
exports.getKeys = (req, res) => {
    try {
        const keys = scryService.getAllKeys(); // Use scryService here
        res.json(keys);
    } catch (error) {
        res.status(500).json([]);
    }
};

