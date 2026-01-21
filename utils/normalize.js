function normalizedTitle(title = "") {
    let normalized = title.toLowerCase();

    normalized = normalized.replace(/[a-z]+[0-9]+/gi, "");

    normalized = normalized.replace(/\b(?:mr|ms|mrs|dr|engr|jr|sr|ii|iii)\b/g, " ");

    normalized = normalized.replace(/\b(?:senior|junior|lead|assistant|trainee|intern|sr|jr)\b/g, " ");

    normalized = normalized.replace(/\bprincipal\b/g, " ");

    normalized = normalized.replace(/\bsupervisor\b/g, " ");

    normalized = normalized.replace(/\bclerk\b/g, " ");
    normalized = normalized.replace(/\bstaff\b/g, " ");

    normalized = normalized.replace(/\b(?:full[-_\s]?time|part[-_\s]?time|contract|temporary|permanent|casual|seasonal|remote|hybrid|on[-_\s]?site|onsite)\b/g, " ");

    normalized = normalized.replace(/[^a-z0-9\s]/g, " ");

    normalized = normalized.replace(/\s+/g, " ");

    normalized = normalized.trim();

    return normalized || title.toLowerCase();
}

module.exports = { normalizeTitle: normalizedTitle };