const fetch = require('node-fetch');
const cheerio = require('cheerio');

async function checkMugsPage() {
  const mugsUrl = 'https://sgt-major-says.creator-spring.com/mugs';
  console.log('Fetching:', mugsUrl);
  
  const response = await fetch(mugsUrl);
  const html = await response.text();
  const $ = cheerio.load(html);
  
  console.log('\n=== Products on /mugs page ===\n');
  
  const products = [];
  $('a[href*="/listing/"]').each((i, el) => {
    const href = $(el).attr('href');
    const title = $(el).find('h3, h4, p').first().text().trim();
    const img = $(el).find('img').attr('alt') || '';
    
    if (href && !products.some(p => p.href === href)) {
      products.push({ href, title, img });
    }
  });
  
  console.log(`Found ${products.length} unique product links\n`);
  
  for (let i = 0; i < Math.min(10, products.length); i++) {
    const p = products[i];
    console.log(`${i + 1}. ${p.href}`);
    console.log(`   Title: ${p.title}`);
    console.log(`   Image alt: ${p.img}`);
    console.log('');
  }
  
  // Now fetch the first product and check what it actually is
  if (products.length > 0) {
    const firstProduct = products[0];
    const fullUrl = firstProduct.href.startsWith('http') 
      ? firstProduct.href 
      : `https://sgt-major-says.creator-spring.com${firstProduct.href}`;
    
    console.log('\n=== Checking first product ===');
    console.log('URL:', fullUrl);
    
    const prodResponse = await fetch(fullUrl, {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      }
    });
    const prodHtml = await prodResponse.text();
    const $prod = cheerio.load(prodHtml);
    
    // Look for product type in page
    const pageText = $prod('body').text();
    const hasMug = pageText.toLowerCase().includes('mug');
    const hasBottle = pageText.toLowerCase().includes('bottle');
    const hasTee = pageText.toLowerCase().includes('tee');
    
    console.log('Contains "mug":', hasMug);
    console.log('Contains "bottle":', hasBottle);
    console.log('Contains "tee":', hasTee);
  }
}

checkMugsPage().catch(console.error);
