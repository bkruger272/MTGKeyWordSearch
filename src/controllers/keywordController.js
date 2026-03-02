const scryService = require('../services/scryfallService');

// --- THE BLACKLIST (The "Trash Filter") ---
const BLACKLIST = [
    'constellation', 'landfall', 'adamant', 'addictive', 'corrupted', 
    'coven', 'delirium', 'descend', 'fathomless descent', 'formidable', 
    'grandeur', 'hellbent', 'heroic', 'imprint', 'inspired', 'join forces', 
    'kinship', 'lieutenant', 'metalcraft', 'morbid', 'parley', 'radiance', 
    'revolt', 'spell-mastery', 'threshold', 'undergrowth', 'will of the council',
    "council's dilemma", 'collect evidence', 'hideaway', 'kinfall',
    'artifact', 'creature', 'enchantment', 'instant', 'sorcery', 'land', 
    'planeswalker', 'tribal', 'legendary', 'basic', 'snow', 'world', 'saga',
    'energy', 'poison', 'experience', 'ticket', 'attraction', 'stickers',
    'historic', 'modified', 'party', 'clue', 'food', 'treasure', 'blood', 
    'incubate', 'role', 'map', 'cumulative upkeep', 'daybound', 'nightbound', 
    'choose a background'
];

// 1. handleSearch: Now handles multi-terms AND respects Custom Rules first
exports.handleSearch = async (req, res) => {
    const query = req.query.q;
    if (!query) return res.json([]);

    // Keep your comma-splitting logic!
    const terms = query.split(',').map(t => t.trim().toLowerCase()).filter(t => t !== "");
    
    try {
        const results = await Promise.all(terms.map(async (term) => {
            // The ScryfallService already handles the Custom vs Scryfall logic in your app,
            // so we call getDefinition just like you had it.
            const result = await scryService.getDefinition(term);
            
            return {
                name: term.charAt(0).toUpperCase() + term.slice(1), // Capitalize for UI
                definition: result.definition,
                source: result.source 
            };
        }));
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch definitions" });
    }
};

// 2. getKeys: Now cleans the list before sending it to the app
exports.getKeys = (req, res) => {
    try {
        // Get the raw keys from your service
        const rawKeys = scryService.getAllKeys(); 
        
        // Apply the cleaning logic
        const cleanKeys = rawKeys
            .map(word => word.toLowerCase().trim())
            .filter(word => {
                if (BLACKLIST.includes(word)) return false;
                if (word.length < 3) return false;
                return true;
            })
            // Unique results only
            .filter((word, index, self) => self.indexOf(word) === index)
            .sort();

        res.json(cleanKeys);
    } catch (error) {
        res.status(500).json([]);
    }
};