const axios = require("axios");
const cheerio = require("cheerio");
const { getQualifications } = require('./qualificationService');

function parseLocation(location) {
    let city = "N/A", province = "N/A", country = "N/A";
    if (location) {
        const parts = location.split(",").map(p => p.trim());
        city = parts[0] || "N/A";
        province = parts[1] || "N/A";
        country = parts[2] || "N/A";
    }
    return { city, province, country};
}

function extractFullDescription(description) {
    let cleanDescription = description.replace(/<!\[CDATA\[|\]\]>/g, "");

    const $ = cheerio.load(cleanDescription, {
        xmlMode: false,
        decodeEntities: false
    });

    $('br').replaceWith('\n');
    $('p').prepend('\n').append('\n');
    $('div').prepend('\n').append('\n');
    $('li').prepend('\n• ');
    $('ul').prepend('\n').append('\n');
    $('ol').prepend('\n').append('\n');

    let fullText = $.text()
        .replace(/\n\s*\n\s*\n/g, '\n\n')
        .replace(/\n\s*\n/g, '\n')
        .replace(/^\s+|\s+$/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    fullText = fullText.replace(/^(Job Description|Job Desc|Description):\s*/i, '');

    fullText = fullText.replace(/DMW License No:\s*DMW-\d+-[A-Z]+-\d+-[A-Z]+\s+Accreditation No:\s*\d+/gi, '')
                       .replace(/DMW License No:.*?Accreditation No:\s*\d+/gi, '')
                       .replace(/<dmw_number>.*?<\/dmw_number>/gi, '')
                       .replace(/<accre_number>.*?<\/accre_number>/gi, '')
                       .replace(/Job Description:\s*/gi, '')
                       .replace(/\s+/g, ' ')
                       .trim();

    return {
        cleanDescription: fullText
    };
}

async function scrapeJob(job) {
    const { id, title, company, description, url, location, listed_date, closing_date } = job;

    const qualificationData = getQualifications(title);
    const qualificationCodes = qualificationData ? qualificationData.qualifications : [];


    const formatDate = (dateStr) => {
        if (!dateStr) return dateStr;
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;

        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();

        return `${month}/${day}/${year}`;
    };

    const formattedListedDate = formatDate(listed_date);
    const formattedClosingDate = formatDate(closing_date);

    try {
        const { data } = await axios.get(url, { headers: { "User-Agent": "Mozilla/5.0" } });
        const $ = cheerio.load(data);

        let minSalary = "TBD", maxSalary = "TBD", currency = "N/A";

        $('.text-money').first().each((i, elem) => {
            const text = $(elem).text().trim();
            

            if (!text.toLowerCase().includes("no salary information is indicated for this ad.")) {
                const salaryPattern = /([A-Z]{3})\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)(?:\s*[-–—]\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?))?/i;
                const match = text.match(salaryPattern);

                if (match) {
                    currency = match[1].toUpperCase();
                    minSalary = parseFloat(match[2].replace(/,/g, "")).toLocaleString();
                    maxSalary = match[3] ? parseFloat(match[3].replace(/,/g, "")).toLocaleString() : minSalary;
                }
            }
        });

        let logo = null;
        $("a").each((i, el) => {
            const href = $(el).attr("href") || "";
            if (href.includes("/profile/agency/")) {
                const img = $(el).find("img").first();
                if (img.length) { logo = img.attr("src"); return false; }
            }
        });

        if (!logo) logo = "N/A";

        const { city, province, country } = parseLocation(location);

        const { cleanDescription } = extractFullDescription(description);

        return {
            "Job Title": title,
            "Company Name": company,
            Description: cleanDescription,
            "Employment Type": "Full-time",
            Source: "WorkAbroad.ph",
            "Currency": currency,
            "Minimum Salary": typeof minSalary === 'string' && minSalary !== "TBD" ?
                minSalary.replace(/(\d+(?:\.\d+)?)/, (num) => parseFloat(num).toLocaleString()) : minSalary,
            "Maximum Salary": typeof maxSalary === 'string' && maxSalary !== "TBD" ?
                maxSalary.replace(/(\d+(?:\.\d+)?)/, (num) => parseFloat(num).toLocaleString()) : maxSalary,
            City: city,
            Province: province,
            Country: country,
            "Application URL": url,
            "Remote Work": "On-site",
            "Company Logo": logo,
            "Date Posted": formattedListedDate,
            "Closing Date": formattedClosingDate,
            "Qualification": qualificationCodes.join(", "),
            "Source ID": id
        };
    } catch (error) {
        console.error(`Error scraping ${url}:`, error.message);

        const { cleanDescription } = extractFullDescription(description);

        return {
            "Job Title": title,
            "Company Name": company,
            Description: cleanDescription,
            "Employment Type": "Full-time",
            Source: "WorkAbroad.ph",
            "Currency": "N/A",
            "Minimum Salary": "TBD",
            "Maximum Salary": "TBD",
            City: "N/A",
            Province: "N/A",
            Country: "N/A",
            "Application URL": url,
            "Remote Work": "On-site",
            "Company Logo": "N/A",
            "Date Posted": formattedListedDate,
            "Closing Date": formattedClosingDate,
            "Qualification": qualificationCodes.join(", "),
            "Source ID": id
        };
    }
}

module.exports = scrapeJob;
