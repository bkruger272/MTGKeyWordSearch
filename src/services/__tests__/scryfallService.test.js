const scryService = require('../scryfallService');

// We increase timeout because Scryfall API calls can be slow
jest.setTimeout(10000); 

describe('Scryfall Service Logic', () => {

  it('should identify a valid keyword from Keywords.json', () => {
    const valid = scryService.isValidKeyword('Evoke');
    expect(valid).toBe(true);
  });

  it('should identify an invalid keyword', () => {
    const invalid = scryService.isValidKeyword('Mega-Super-Haste');
    expect(invalid).toBe(false);
  });

  it('should fetch a definition from custom_rules.json if it exists', async () => {
    // This assumes "Artifact" or something similar is in your custom_rules.json
    // Adjust the keyword based on your actual JSON content
    const result = await scryService.getDefinition('Trample');
    expect(result).toContain('(Source: Custom)');
  });

  it('should fetch a definition from Scryfall for keywords not in custom rules', async () => {
    // 'Trample' is unlikely to be in your custom overrides, so it hits Scryfall
    const result = await scryService.getDefinition('Blight');
    expect(result).toBeDefined();
    expect(result).toMatch(/Source: (Scryfall|Custom)/);
  });

});