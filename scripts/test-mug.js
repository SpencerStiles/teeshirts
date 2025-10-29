const fetch = require('node-fetch');
const cheerio = require('cheerio');

async function testMugUrl() {
  // First, get a mug listing slug from the mugs category page
  const mugsPage = await fetch('https://sgt-major-says.creator-spring.com/mugs');
  const mugsHtml = await mugsPage.text();
  const $ = cheerio.load(mugsHtml);
  
  // Find first mug link
  const firstMugLink = $('a[href*="/listing/"]').first().attr('href');
  console.log('First mug link found:', firstMugLink);
  
  if (!firstMugLink) {
    console.log('No mug links found');
    return;
  }
  
  // Extract slug
  const slugMatch = firstMugLink.match(/\/listing\/([^?]+)/);
  if (!slugMatch) {
    console.log('Could not extract slug');
    return;
  }
  
  const slug = slugMatch[1];
  console.log('\n=== Testing mug slug:', slug, '===\n');
  
  // Fetch the mug page
  const mugUrl = `https://sgt-major-says.creator-spring.com/listing/${slug}`;
  console.log('Fetching:', mugUrl);
  
  const response = await fetch(mugUrl, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    }
  });
  
  console.log('Response status:', response.status);
  console.log('Response headers:', response.headers.raw());
  
  if (response.status === 307 || response.status === 301 || response.status === 302) {
    console.log('\n❌ REDIRECT DETECTED');
    console.log('Location:', response.headers.get('location'));
  }
  
  const html = await response.text();
  console.log('\nHTML length:', html.length);
  
  // Check for buildId
  const buildIdMatch = html.match(/"buildId":"([^"]+)"/);
  console.log('buildId found:', buildIdMatch ? buildIdMatch[1] : 'NO');
  
  // Check for product data
  const $page = cheerio.load(html);
  const nextDataScript = $page('script#__NEXT_DATA__').first().text();
  
  if (nextDataScript) {
    console.log('__NEXT_DATA__ found, length:', nextDataScript.length);
    try {
      const nextData = JSON.parse(nextDataScript);
      console.log('pageProps keys:', Object.keys(nextData?.props?.pageProps || {}));
      console.log('storeListing exists:', !!nextData?.props?.pageProps?.storeListing);
    } catch (err) {
      console.log('Failed to parse __NEXT_DATA__:', err.message);
    }
  } else {
    console.log('__NEXT_DATA__ NOT found');
  }
}

testMugUrl().catch(console.error);
