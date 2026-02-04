const fs = require('fs');
const readline = require('readline');
const Scry = require("scryfall-sdk");

// Identify your app to Scryfall (Required)
Scry.setAgent("MTG-Ability-Scanner", "1.0.0");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function getDefinition(keyword) {
    const query = keyword.toLowerCase().trim();

    // --- NEW: CHECK CUSTOM OVERRIDES FIRST ---
    try {
        if (fs.existsSync('custom_rules.json')) {
            const customData = JSON.parse(fs.readFileSync('custom_rules.json'));
            if (customData[query]) {
                return customData[query] + " (Source: Custom Dictionary)";
            }
        }
    } catch (e) {
        console.log("Note: Could not read custom_rules.json, skipping to Scryfall.");
    }

    // --- EXISTING SCRYFALL LOGIC ---
    try {
        const card = await Scry.Cards.random(`oracle:"${keyword}"`);
        const oracleText = card.oracle_text;
        const reminderMatch = oracleText.match(/\(([^)]+)\)/);

        if (reminderMatch) {
            return reminderMatch[1] + " (Source: Scryfall)";
        } else {
            return `Oracle Text: "${oracleText}" (No reminder text found)`;
        }
    } catch (err) {
        return "Definition currently unavailable.";
    }
}

async function searchKeyword(input) {
    if (input.toLowerCase().trim() === 'exit') {
        console.log("Exiting... Goodbye!");
        rl.close();
        process.exit(0);
    }

    const terms = input.split(/[,\s]+/).filter(term => term.trim() !== "");

    try {
        const rawData = fs.readFileSync('Keywords.json');
        const data = JSON.parse(rawData);
        const allKeywords = [...data.data.abilityWords, ...data.data.keywordAbilities, ...data.data.keywordActions];

        console.log(`\n--- Results ---`);

        for (const term of terms) {
            const query = term.toLowerCase();
            const exists = allKeywords.some(k => k.toLowerCase() === query);

            if (exists) {
                process.stdout.write(`🔍 Fetching definition for ${term}... `);
                const definition = await getDefinition(term);
                console.log(`\n✅ ${term}: ${definition}\n`);
            } else {
                console.log(`❌ ${term}: Not a known keyword.`);
            }
        }
    } catch (error) {
        console.error("Error:", error.message);
    }

    console.log("-----------------------------------");
    rl.question('Search (or type "exit"): ', searchKeyword);
}

console.log("MTG Keyword Search Initialized.");
rl.question('Enter keyword(s) to lookup: ', searchKeyword);