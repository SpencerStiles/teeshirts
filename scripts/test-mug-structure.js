const fetch = require('node-fetch');
const cheerio = require('cheerio');

async function analyzeMugStructure() {
  const mugUrl = 'https://sgt-major-says.creator-spring.com/listing/airmen-3';
  console.log('Fetching:', mugUrl);
  
  const response = await fetch(mugUrl, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    }
  });
  
  const html = await response.text();
  const $ = cheerio.load(html);
  
  // Check for product images
  const images = [];
  $('img').each((i, el) => {
    const src = $(el).attr('src');
    if (src && src.includes('mockup-api')) {
      images.push(src);
    }
  });
  console.log('\nMockup images found:', images.length);
  if (images.length > 0) console.log('First image:', images[0]);
  
  // Check for product title
  const h1 = $('h1').first().text().trim();
  console.log('\nH1 title:', h1);
  
  // Check for price
  const priceElements = [];
  $('*').each((i, el) => {
    const text = $(el).text();
    if (text.match(/\$\d+\.\d{2}/)) {
      priceElements.push(text.trim());
    }
  });
  console.log('\nPrice patterns found:', priceElements.slice(0, 3));
  
  // Check all script tags
  console.log('\n=== Script tags ===');
  $('script').each((i, el) => {
    const id = $(el).attr('id');
    const src = $(el).attr('src');
    const content = $(el).html() || '';
    
    if (id) {
      console.log(`Script #${id}: ${content.length} chars`);
    } else if (src) {
      console.log(`External script: ${src}`);
    } else if (content.includes('product') || content.includes('variation') || content.includes('storeListing')) {
      console.log(`Inline script with product data: ${content.substring(0, 100)}...`);
    }
  });
  
  // Look for JSON-LD structured data
  console.log('\n=== Structured data ===');
  $('script[type="application/ld+json"]').each((i, el) => {
    const content = $(el).html();
    try {
      const data = JSON.parse(content);
      console.log('JSON-LD type:', data['@type']);
      console.log('Keys:', Object.keys(data).join(', '));
    } catch (err) {
      console.log('Failed to parse JSON-LD');
    }
  });
}

analyzeMugStructure().catch(console.error);
