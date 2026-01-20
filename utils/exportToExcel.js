const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const workbookCache = new Map();

function exportToExcel(data, fileName = "workabroad_jobs.xlsx") {
    const outputPath = path.join(__dirname, "../output", fileName);
    let workbook, worksheet;

    if (workbookCache.has(fileName)) {
        workbook = workbookCache.get(fileName);
        const sheetName = workbook.SheetNames[0] || "Jobs";
        worksheet = workbook.Sheets[sheetName];

        const existingData = XLSX.utils.sheet_to_json(worksheet);
        const combinedData = [...existingData, ...data];

        worksheet = XLSX.utils.json_to_sheet(combinedData);
        workbook.Sheets[sheetName] = worksheet;
    } else {
        if (fs.existsSync(outputPath)) {
            workbook = XLSX.readFile(outputPath);
            const sheetName = workbook.SheetNames[0] || "Jobs";
            worksheet = workbook.Sheets[sheetName];

            const existingData = XLSX.utils.sheet_to_json(worksheet);
            const combinedData = [...existingData, ...data];

            worksheet = XLSX.utils.json_to_sheet(combinedData);
            workbook.Sheets[sheetName] = worksheet;
        } else {
            workbook = XLSX.utils.book_new();
            worksheet = XLSX.utils.json_to_sheet(data);
            const sheetName = fileName.startsWith('Sample') ? 'Sheet1' : 'Jobs';
            XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        }

        workbookCache.set(fileName, workbook);
    }

    XLSX.writeFile(workbook, outputPath);

    const trackingFilePath = path.join(__dirname, "../output", "scraped_ids.json");
    let existingIds = [];

    if (fs.existsSync(trackingFilePath)) {
        const trackingData = fs.readFileSync(trackingFilePath, 'utf8');
        existingIds = JSON.parse(trackingData);
    }

    const newIds = data.map(item => item["Source ID"]);
    const allIds = [...new Set([...existingIds, ...newIds])];

    fs.writeFileSync(trackingFilePath, JSON.stringify(allIds, null, 2));
}

function flushCache() {
    for (const [fileName, workbook] of workbookCache) {
        const outputPath = path.join(__dirname, "../output", fileName);
        XLSX.writeFile(workbook, outputPath);
    }
    workbookCache.clear();
}

module.exports = { exportToExcel, flushCache };