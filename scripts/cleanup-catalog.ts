import * as fs from 'fs/promises';
import * as path from 'path';

const OUTPUT_PATH = path.join(process.cwd(), 'data', 'springCatalog.json');

function cleanTitle(text: string): string {
  if (!text) return text;
  return text
    .replace(/\s*\(product\)\s*/gi, '')
    .replace(/\s*\[product\]\s*/gi, '')
    .trim();
}

async function main() {
  try {
    const data = await fs.readFile(OUTPUT_PATH, 'utf8');
    const catalog = JSON.parse(data);
    
    if (!catalog?.designs || !Array.isArray(catalog.designs)) {
      console.log('No designs found in catalog');
      return;
    }
    
    let cleanedCount = 0;
    
    for (const design of catalog.designs) {
      // Clean title
      if (design.title && design.title.includes('(product)')) {
        design.title = cleanTitle(design.title);
        cleanedCount++;
      }
      
      // Clean variant labels
      if (design.variants && Array.isArray(design.variants)) {
        for (const variant of design.variants) {
          if (variant.label && variant.label.includes('(product)')) {
            variant.label = cleanTitle(variant.label);
            cleanedCount++;
          }
        }
      }
    }
    
    await fs.writeFile(OUTPUT_PATH, JSON.stringify(catalog, null, 2), 'utf8');
    console.log(`✅ Cleaned ${cleanedCount} titles/labels in ${catalog.designs.length} designs`);
    console.log(`Saved cleaned catalog → ${OUTPUT_PATH}`);
  } catch (err) {
    console.error('Error cleaning catalog:', err);
    process.exit(1);
  }
}

main();
