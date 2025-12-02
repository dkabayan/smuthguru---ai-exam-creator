
try {
    // Simulate what the AI might be returning (single backslashes in JSON string)
    const jsonString = '{"text": "Limit $\\text{lim}_{x \\to 0}$ and $\\frac{1}{2}$"}';
    console.log("Input JSON:", jsonString);
    const parsed = JSON.parse(jsonString);
    console.log("Parsed JS String:", parsed.text);
} catch (e) {
    console.log("Error parsing double escaped:", e.message);
}

try {
    // Simulate single backslash for \t (tab) and \f (form feed)
    // Note: In a JS string literal, "\t" is a tab. To represent a literal backslash and t in the JSON string, we need "\\t".
    // If the AI returns a raw string with just one backslash char before t, it is invalid JSON if it's not a control char.
    // But \t is a valid control char in string.

    // This represents the characters: { " t e x t " : " $ \t e x t ... $ " }
    const badJsonString = '{"text": "Limit $\text{lim}$ and $\frac{1}{2}$"}';
    console.log("\nInput Bad JSON (simulated):", badJsonString);
    const parsedBad = JSON.parse(badJsonString);
    console.log("Parsed Bad JS String:", parsedBad.text);

    console.log("Does it contain 'ext'?", parsedBad.text.includes("ext"));
    console.log("Does it contain 'rac'?", parsedBad.text.includes("rac"));
} catch (e) {
    console.log("Error parsing bad JSON:", e.message);
}
