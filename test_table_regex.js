
const text = "Diberikan tabel nilai fungsi f(x) saat x mendekati 4 dari kiri dan kanan:| x (mendekati 4 dari kiri) | f(x) | x (mendekati 4 dari kanan) | f(x) ||---|---|---|---| 3,9 | 7,80 | 4,01 | 11,02 || 3,95 | 7,90 | 4,001 | 11,002 || 3,99 | 7,98 | 4,0001 | 11,0002 || 3,9999 | 7,9998 | 4,00001 | 11,00002 |Berdasarkan data pada tabel, tentukan nilai lim";

const markdownTableToHtml = (text) => {
    if (!text) return "";

    // Original Regex
    const tableBlockRegex = /((?:^\s*\|.*\|\s*(?:\r?\n|$))+)/gm;

    return text.replace(tableBlockRegex, (match) => {
        console.log("Match found:", match);
        return "TABLE_REPLACED";
    });
};

console.log("Original Output:", markdownTableToHtml(text));

// Proposed Fix: Preprocess to add newlines before pipes that look like table starts?
// Or adjust regex.

const improvedMarkdownTableToHtml = (text) => {
    if (!text) return "";

    // Pre-process: Ensure table starts on new line if it follows text immediately
    // Look for pattern: [char]|...|
    // This is risky if it matches inline text like "a | b".
    // But for the specific issue "kanan:|", it seems safe to break.

    let processed = text.replace(/([^\n])(\s*\|.*\|)/g, "$1\n$2");

    // Also handle the double pipes || which seem to be used as row separators in the user's bad output?
    // The screenshot shows "|| 3,9 | ...". 
    // It looks like the AI generated a minified table: "| h1 | h2 || r1c1 | r1c2 || r2c1 | r2c2 |"
    // This is non-standard markdown.

    // Let's see if we can handle that.
    // If we split by || we might get rows.

    return processed;
};

console.log("Processed Text:", improvedMarkdownTableToHtml(text));
