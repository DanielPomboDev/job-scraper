function normalizedTitle(title = "") {
    return title
    .toLowerCase()
    .replace(/^[•\-\–\*]+\s*/g, "")
    .replace(/\s*-\s*[a-z\s]+$/g, "")
    .replace(/\(([^)]+)\)/g, " $1 ")
    .replace(/[\/&]/g, " ")
    .replace(/[–—]/g, " ")
    .replace(/\bx\s*(\d+)\b/g, "x$1")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

module.exports = { normalizeTitle: normalizedTitle };