
try {
    // This is what we WANT the AI to generate now:
    // "text": "Limit \\lim_{x \\to 0}"
    // In a JS string literal, this looks like:
    const correctJsonString = '{"text": "Limit \\\\lim_{x \\\\to 0} and \\\\frac{1}{2}"}';

    console.log("Input JSON (Simulated AI Output):", correctJsonString);

    const parsed = JSON.parse(correctJsonString);
    console.log("Parsed JS String:", parsed.text);

    if (parsed.text.includes("\\lim") && parsed.text.includes("\\frac")) {
        console.log("SUCCESS: Backslashes preserved correctly!");
    } else {
        console.log("FAILURE: Backslashes lost or malformed.");
    }

} catch (e) {
    console.log("Error parsing:", e.message);
}
