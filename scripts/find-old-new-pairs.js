const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/springCatalog.json', 'utf8'));

console.log('Total designs:', data.designs.length);

// Group by base slug (without product param)
const byBaseSlug = {};

data.designs.forEach(design => {
  // Try to extract base slug by removing trailing -#### pattern
  const match = design.slug.match(/^(.+?)(-\d{2,4})$/);
  const baseSlug = match ? match[1] : design.slug;
  
  if (!byBaseSlug[baseSlug]) {
    byBaseSlug[baseSlug] = [];
  }
  byBaseSlug[baseSlug].push(design.slug);
});

// Find base slugs with multiple versions
const multiVersion = Object.entries(byBaseSlug)
  .filter(([base, variants]) => variants.length > 1)
  .slice(0, 10);

console.log('\nBase slugs with multiple versions:');
multiVersion.forEach(([base, variants]) => {
  console.log(`\n${base}:`);
  variants.forEach(v => console.log(`  - ${v}`));
});

// Check specific examples
console.log('\n=== Checking specific examples ===');
const airmen3 = data.designs.filter(d => d.slug.includes('airmen-3'));
console.log('\nAirmen-3 variants:', airmen3.length);
airmen3.slice(0, 5).forEach(d => {
  console.log(`  ${d.slug}: ${d.title.substring(0, 50)}...`);
});

const newWhatIs = data.designs.filter(d => d.slug.startsWith('new-what-is-best-in-life'));
console.log('\nNew-what-is-best-in-life variants:', newWhatIs.length);
newWhatIs.slice(0, 5).forEach(d => {
  console.log(`  ${d.slug}: ${d.title.substring(0, 50)}...`);
});
