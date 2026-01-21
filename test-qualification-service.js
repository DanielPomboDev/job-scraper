const { getQualifications } = require('./services/qualificationService');

// Test cases with various job titles
const testTitles = [
  "Poultry Raiser",
  "Professional Driver",
  "Automotive painter",
  "Farm Laborer",
  "Software Engineer", // This should return Unknown as it's not in the TESDA list
  "Aquaculture Farm Caretaker",
  "Net Mender Team Leader",
  "some job that doesn't exist"
];

console.log("Testing qualification service with various job titles:\n");

testTitles.forEach(title => {
  const result = getQualifications(title);
  console.log(`Job Title: "${title}"`);
  console.log(`Mapped Title: "${result.mappedJobTitle}"`);
  console.log(`Sector: "${result.sector}"`);
  console.log(`Qual Code: "${result.qual_code}"`);
  console.log(`Level: "${result.level}"`);
  console.log(`Qualifications Count: ${result.qualifications.length}`);
  console.log('---');
});