const fetch = require('node-fetch');

function unescapeNextFlightString(s) {
  return s
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

function extractStoreListingFromHtml(html) {
  const scriptContents = [];
  const scriptRe = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = scriptRe.exec(html)) !== null) {
    scriptContents.push(m[1]);
  }

  const payloads = [];
  const flightChunkRe = /self\.__next_f\.push\(\[1,\s*"([\s\S]*?)"\]\)/g;
  for (const sc of scriptContents) {
    let mm;
    while ((mm = flightChunkRe.exec(sc)) !== null) {
      payloads.push(unescapeNextFlightString(mm[1]));
    }
  }

  console.log('Total Flight payloads found:', payloads.length);

  for (const p of payloads) {
    const key = '"storeListing":';
    const idx = p.indexOf(key);
    if (idx === -1) continue;
    
    console.log('\nFound storeListing at payload index, extracting...');
    const start = idx + key.length;
    let i = start;
    while (i < p.length && /\s/.test(p[i])) i++;
    if (p[i] !== '{') continue;
    let depth = 0;
    let inStr = false;
    let prev = '';
    for (; i < p.length; i++) {
      const ch = p[i];
      if (inStr) {
        if (ch === '"' && prev !== '\\') inStr = false;
      } else {
        if (ch === '"') inStr = true;
        else if (ch === '{') depth++;
        else if (ch === '}') {
          depth--;
          if (depth === 0) {
            const jsonStr = p.slice(start, i + 1);
            try {
              const storeListing = JSON.parse(jsonStr);
              console.log('✅ Successfully parsed storeListing');
              console.log('Keys:', Object.keys(storeListing).join(', '));
              console.log('primaryProduct exists:', !!storeListing.primaryProduct);
              console.log('moreProducts exists:', !!storeListing.moreProducts);
              console.log('products exists:', !!storeListing.products);
              return storeListing;
            } catch (err) {
              console.log('❌ Failed to parse:', err.message);
            }
          }
        }
      }
      prev = ch;
    }
  }
  return null;
}

async function testMugExtraction() {
  const mugUrl = 'https://sgt-major-says.creator-spring.com/listing/airmen-3';
  console.log('Fetching:', mugUrl);
  
  const response = await fetch(mugUrl, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    }
  });
  
  const html = await response.text();
  console.log('HTML length:', html.length);
  console.log('\n=== Extracting storeListing ===');
  
  const storeListing = extractStoreListingFromHtml(html);
  
  if (storeListing) {
    console.log('\n=== storeListing details ===');
    if (storeListing.primaryProduct) {
      console.log('Primary product:', storeListing.primaryProduct);
    }
    if (storeListing.moreProducts) {
      console.log('More products count:', 
        Array.isArray(storeListing.moreProducts?.items) ? storeListing.moreProducts.items.length :
        Array.isArray(storeListing.moreProducts) ? storeListing.moreProducts.length : 'N/A');
    }
  } else {
    console.log('\n❌ No storeListing extracted');
  }
}

testMugExtraction().catch(console.error);
