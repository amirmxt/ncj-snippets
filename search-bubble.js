const axios = require('axios');
const cheerio = require('cheerio');
const ObjectsToCsv = require('objects-to-csv');
const fs = require('fs');

const linkedinJobs = [];
const processedLinks = new Set();
let numProcessedJobs = 0;

async function readExistingLinks() {
  if (fs.existsSync('./linkedInJobs.csv')) {
    const existingJobs = await csv.fromDisk('./linkedInJobs.csv');
    existingJobs.forEach(job => processedLinks.add(job.Link));
    numProcessedJobs = processedLinks.size;
  }
}

async function fetchJobsOnPage(url) {
  try {
    const response = await axios(url);
    const html = response.data;
    const $ = cheerio.load(html);
    const jobs = $('.jobs-search__results-list li');
    jobs.each((index, element) => {
      const jobTitle = $(element).find('h3').text().trim();
      const company = $(element).find('h4').text().trim();
      const location = $(element).find('.job-search-card__location').text().trim();
      const link = $(element).find('a').attr('href');
      if (!processedLinks.has(link)) {
        processedLinks.add(link);
        if (jobTitle.toLowerCase().includes('bubble.io developer')) {
          linkedinJobs.push({
            'Title': jobTitle,
            'Company': company,
            'Location': location,
            'Link': link,
          });
        }
        numProcessedJobs++;
      }
    });
    console.log(`Page ${numProcessedJobs/25+1} done.`);
  } catch (error) {
    console.error(error);
  }
}

async function fetchAllJobs() {
  let hasMoreResults = true;
  let pageNumber = 0;
  while (hasMoreResults) {
    const url = `https://www.linkedin.com/jobs/search/?currentJobId=3480612720&f_TPR=r604800&f_WT=1%2C2%2C3&geoId=92000000&keywords=%22Bubble.io%20Developer%22&location=Worldwide&refresh=true&sortBy=R${pageNumber}`;
    await fetchJobsOnPage(url);
    hasMoreResults = linkedinJobs.length > numProcessedJobs;
    pageNumber += 25;
  }
}

async function writeCsv() {
  const csv = new ObjectsToCsv(linkedinJobs);
  try {
    await csv.toDisk('./search-bubble.csv', { append: true });
    console.log('CSV file created successfully.');
  } catch (error) {
    console.error('Failed to write to CSV file:', error);
  }
}

(async function () {
  await readExistingLinks();
  await fetchAllJobs();
  await writeCsv();
})();
