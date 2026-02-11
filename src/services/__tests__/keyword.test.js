// keyword.test.js
const { getDefinition } = require('../scryfallService');

// Increase timeout because we are calling the real Scryfall API
jest.setTimeout(20000); 

describe('MTG Keyword API Validation', () => {

    const testCases = [
    { word: 'trample', expected: 'excess combat damage' },
    { word: 'madness', expected: 'discard this card' },
    { word: 'shroud', expected: 'target of spells' },
    { word: 'connive', expected: 'discard' },
    { word: 'reach', expected: 'block creatures with flying' }, // Match the card text
    { word: 'airbend', expected: 'exile it' }
    ];

        testCases.forEach(({ word, expected }) => {
        test(`Should return correct definition for: ${word}`, async () => {
            const result = await getDefinition(word);
            
            expect(result.source).not.toBe('error');
            
            // Safety check: ensure definition exists before calling toLowerCase
            const definition = result.definition || ""; 
            expect(definition.toLowerCase()).toContain(expected.toLowerCase());
        });
        });
});