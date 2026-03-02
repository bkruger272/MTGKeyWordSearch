// backend/src/utils/keywordCleaner.js

const BLACKLIST = [
    // --- Ability Words (Flavor headers with no rules) ---
    'constellation', 'landfall', 'adamant', 'addictive', 'corrupted', 
    'coven', 'delirium', 'descend', 'fathomless descent', 'formidable', 
    'grandeur', 'hellbent', 'heroic', 'imprint', 'inspired', 'join forces', 
    'kinship', 'lieutenant', 'metalcraft', 'morbid', 'parley', 'radiance', 
    'revolt', 'spell-mastery', 'threshold', 'undergrowth', 'will of the council',
    "council's dilemma", 'collect evidence', 'hideaway', 'kinfall',

    // --- Card Types / Supertypes ---
    'artifact', 'creature', 'enchantment', 'instant', 'sorcery', 'land', 
    'planeswalker', 'tribal', 'legendary', 'basic', 'snow', 'world', 'saga',

    // --- Counters / Resource Terms ---
    'energy', 'poison', 'experience', 'ticket', 'attraction', 'stickers',

    // --- Mechanics that are junk without context ---
    'historic', 'modified', 'party', 'clue', 'food', 'treasure', 'blood', 
    'incubate', 'role', 'map', 'cumulative upkeep', 'daybound', 'nightbound', 
    'choose a background'
];

/**
 * Cleans a list of keywords by removing junk and duplicates.
 * @param {Array} rawKeywords - The list from Scryfall or DB
 * @returns {Array} - The polished list
 */
const getCleanKeywords = (rawKeywords) => {
    return rawKeywords
        .map(word => word.toLowerCase().trim()) // Standardize
        .filter(word => {
            // 1. Remove if it's in our manual blacklist
            if (BLACKLIST.includes(word)) return false;

            // 2. Remove words shorter than 3 letters (e.g., "up", "to", "on")
            if (word.length < 3) return false;

            // 3. Remove "The" or "Of" at start (usually card name fragments)
            if (word.startsWith('the ') || word.startsWith('of ')) return false;

            return true;
        })
        .filter((word, index, self) => self.indexOf(word) === index) // Unique only
        .sort(); // Alphabetical
};

module.exports = { getCleanKeywords };