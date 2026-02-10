const scryService = require('../services/scryfallService');
const fs = require('fs');
const path = require('path');

// 1. Define handleSearch directly on the exports object
exports.handleSearch = async (req, res) => {
    const query = req.query.q;
    if (!query) return res.json([]);

    // Split by comma or space to match your original search logic
    const terms = query.split(/[,\s]+/).filter(t => t.trim() !== "");
    
    try {
        const results = await Promise.all(terms.map(async (term) => ({
            name: term,
            definition: await scryService.getDefinition(term) // Use scryService here
        })));
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

