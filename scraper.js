const fetchXML = require("./services/fetchXML");
const parseXML = require("./services/parseXML");
const scrapeJob = require("./services/scrapeJob");
const delay = require("./utils/delay");
const { exportToExcel, flushCache } = require("./utils/exportToExcel");
const fs = require('fs');
const path = require('path');

async function main() {
    const xmlData = await fetchXML();
    if (!xmlData) return console.error("Failed to fetch XML.");

    const jobs = await parseXML(xmlData);
    console.log(`Total jobs found: ${jobs.length}`);

    const trackingFilePath = path.join(__dirname, "output", "scraped_ids.json");
    let scrapedIds = [];

    if (fs.existsSync(trackingFilePath)) {
        const trackingData = fs.readFileSync(trackingFilePath, 'utf8');
        scrapedIds = JSON.parse(trackingData);
        console.log(`Found ${scrapedIds.length} already scraped job IDs`);
    }

    const scrapedIdSet = new Set(scrapedIds);
    const remainingJobs = jobs.filter(job => !scrapedIdSet.has(job.id));
    console.log(`Jobs remaining to scrape: ${remainingJobs.length}`);

    const concurrencyLimit = 3;
    const batchSize = 10;
    const allScrapedJobs = []; // Store all scraped jobs

    for (let i = 0; i < remainingJobs.length; i += concurrencyLimit) {
        const jobChunk = remainingJobs.slice(i, i + concurrencyLimit);

        const promises = jobChunk.map(async (job, index) => {
            console.log(`Scraping job ${i + index + 1}/${remainingJobs.length}: ${job.title}`);

            try {
                const scrapedJob = await scrapeJob(job);

                console.log(`Saved: ${job.title}`);
                return scrapedJob;
            } catch (error) {
                console.error(`Error scraping job ${job.title}:`, error.message);
                return null;
            }
        });

        const results = await Promise.all(promises);

        const successfulResults = results.filter(result => result !== null);
        allScrapedJobs.push(...successfulResults);

        while (allScrapedJobs.length >= batchSize) {
            const batchToExport = allScrapedJobs.splice(0, batchSize);
            exportToExcel(batchToExport, "workabroad_jobs.xlsx");
            console.log(`Exported batch of ${batchToExport.length} jobs`);
        }

        if (i + concurrencyLimit < remainingJobs.length) {
            await delay(2000);
        }
    }

    if (allScrapedJobs.length > 0) {
        exportToExcel(allScrapedJobs, "workabroad_jobs.xlsx");
        console.log(`Exported final batch of ${allScrapedJobs.length} jobs`);
    }

    flushCache();

    console.log("Scraping completed!");
}

main();