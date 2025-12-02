
const text = "Diberikan tabel nilai fungsi f(x) saat x mendekati 4 dari kiri dan kanan:| x (mendekati 4 dari kiri) | f(x) | x (mendekati 4 dari kanan) | f(x) ||---|---|---|---| 3,9 | 7,80 | 4,01 | 11,02 || 3,95 | 7,90 | 4,001 | 11,002 || 3,99 | 7,98 | 4,0001 | 11,0002 || 3,9999 | 7,9998 | 4,00001 | 11,00002 |Berdasarkan data pada tabel, tentukan nilai lim";

const markdownTableToHtml = (text) => {
    if (!text) return "";

    // Regex to detect markdown tables
    const tableBlockRegex = /((?:^\s*\|.*\|\s*(?:\r?\n|$))+)/gm;

    return text.replace(tableBlockRegex, (match) => {
        const lines = match.trim().split(/\r?\n/);
        if (lines.length < 2) return match;

        // Simple HTML generation for test
        return "<table>" + lines.length + " rows</table>";
    });
};

const fixTable = (text) => {
    // 1. Ensure newline before start of table if it follows text
    // Look for: [non-newline] followed by |...|
    let processed = text.replace(/([^\n])(\s*\|)/g, "$1\n$2");

    // 2. Expand compressed rows "||" -> "|\n|"
    processed = processed.replace(/\|\|/g, "|\n|");

    return processed;
}

const fixedText = fixTable(text);
console.log("Fixed Text:\n", fixedText);
console.log("Converted HTML:", markdownTableToHtml(fixedText));
