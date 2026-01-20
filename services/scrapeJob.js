const axios = require("axios");
const cheerio = require("cheerio");

function parseLocation(location) {
    let city = "N/A", province = "N/A";
    if (location) {
        const parts = location.split(",").map(p => p.trim());
        if (parts.length >= 2) { city = parts[0]; province = parts[1]; }
        else if (parts.length === 1) { city = parts[0]; }
    }
    return { city, province};
}

function extractQualificationsFromDescription(description) {
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

    const jobDescMatch = fullText.match(/(Job Description:?\s*)([\s\S]*?)(?=Qualification[s]?|Additional Information:|Last Job Ad Activity:|Agency Details|Is this ad misleading|$)/i);

    const qualificationMatch = fullText.match(/(Qualification[s]?:?\s*)([\s\S]*?)(?=Additional Information:|Last Job Ad Activity:|Agency Details|Is this ad misleading|$)/i);

    let extractedQualifications = "Not specified";
    let cleanJobDescription = "";

    if (qualificationMatch && qualificationMatch[2]) {
        extractedQualifications = qualificationMatch[2].trim();
    }

    if (jobDescMatch && jobDescMatch[2]) {
        cleanJobDescription = jobDescMatch[2].trim();
    } else {
        if (qualificationMatch) {
            const qualStartIndex = fullText.search(/Qualification[s]?/i);
            if (qualStartIndex !== -1) {
                cleanJobDescription = fullText.substring(0, qualStartIndex).trim();
            } else {
                cleanJobDescription = fullText;
            }
        } else {
            cleanJobDescription = fullText;
        }
    }

    cleanJobDescription = cleanJobDescription
        .replace(/Job Description:\s*/i, '')
        .replace(/Qualification[s]?:?\s*/i, '')
        .replace(/\s+/g, ' ')
        .trim();

    if (extractedQualifications === "Not specified" || extractedQualifications.length < 5) {
        extractedQualifications = cleanJobDescription;
        cleanJobDescription = "Not specified";
    }

    return {
        cleanDescription: cleanJobDescription,
        extractedQualifications: extractedQualifications
    };
}

async function scrapeJob(job) {
    const { id, title, company, description, url, location, listed_date, closing_date } = job;

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

        let minSalary = "TBD", maxSalary = "TBD";

        $('.text-money').first().each((i, elem) => {
            const text = $(elem).text().trim();

            if (!text.toLowerCase().includes("no salary information is indicated for this ad.")) {
                const salaryPattern = /([A-Z]{3})\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)(?:\s*[-–—]\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?))?/i;
                const match = text.match(salaryPattern);

                if (match) {
                    const currency = match[1].toUpperCase();
                    minSalary = `${currency} ${parseFloat(match[2].replace(/,/g, "")).toLocaleString()}`;
                    maxSalary = match[3] ? `${currency} ${parseFloat(match[3].replace(/,/g, "")).toLocaleString()}` : minSalary;
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

        const { city, province } = parseLocation(location);

        const { cleanDescription, extractedQualifications } = extractQualificationsFromDescription(description);

        return {
            "Source ID": id,
            "Job Title": title,
            "Company Name": company,
            Description: cleanDescription,
            "Employment Type": "Full-time",
            Source: "WorkAbroad.ph",
            "Minimum Salary": typeof minSalary === 'string' && minSalary !== "TBD" ?
                minSalary.replace(/(\d+(?:\.\d+)?)/, (num) => parseFloat(num).toLocaleString()) : minSalary,
            "Maximum Salary": typeof maxSalary === 'string' && maxSalary !== "TBD" ?
                maxSalary.replace(/(\d+(?:\.\d+)?)/, (num) => parseFloat(num).toLocaleString()) : maxSalary,
            City: city,
            Province: province,
            "Application URL": url,
            "Remote Work": "On-site",
            Qualifications: extractedQualifications,
            "Company Logo": logo,
            "Date Posted": formattedListedDate,
            "Closing Date": formattedClosingDate
        };
    } catch (error) {
        console.error(`Error scraping ${url}:`, error.message);

        const { cleanDescription, extractedQualifications } = extractQualificationsFromDescription(description);

        return {
            "Source ID": id,
            "Job Title": title,
            "Company Name": company,
            Description: cleanDescription,
            "Employment Type": "Full-time",
            Source: "WorkAbroad.ph",
            "Minimum Salary": "TBD",
            "Maximum Salary": "TBD",
            City: "N/A",
            Province: "N/A",
            "Application URL": url,
            "Remote Work": "On-site",
            Qualifications: extractedQualifications,
            "Company Logo": "N/A",
            "Date Posted": formattedListedDate,
            "Closing Date": formattedClosingDate
        };
    }
}

module.exports = scrapeJob;
