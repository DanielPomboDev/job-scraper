const axios = require('axios');

async function fetchXML() {
    const url = "https://workabroad.ph/jora.xml";
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error("Error fetching XML:", error.message);
        return null;
    }
}

module.exports = fetchXML;
