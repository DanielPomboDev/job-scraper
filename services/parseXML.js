const xml2js = require("xml2js");

async function parseXML(xmlData) {
    const parser = new xml2js.Parser({ explicitArray: false });

    try {
        const result = await parser.parseStringPromise(xmlData);
        const jobs = result.jobs.job;
        return Array.isArray(jobs) ? jobs : [jobs];
    } catch (error) {
        console.error("Error parsing XML:", error.message);
        return [];
    }
}

module.exports = parseXML;