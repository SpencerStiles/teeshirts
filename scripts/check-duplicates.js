const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/springCatalog.json', 'utf8'));

console.log('Total designs:', data.designs.length);

const slugs = data.designs.map(d => d.slug);
const uniqueSlugs = new Set(slugs);
console.log('Unique slugs:', uniqueSlugs.size);
console.log('Duplicates:', slugs.length - uniqueSlugs.size);

// Check for duplicates
const slugCounts = {};
slugs.forEach(s => slugCounts[s] = (slugCounts[s] || 0) + 1);
const dups = Object.entries(slugCounts).filter(([s, c]) => c > 1).slice(0, 10);
console.log('\nSample duplicates:', dups);

// Check for old vs new slug patterns
const withProductParam = slugs.filter(s => s.match(/-\d{2,4}$/)).length;
const withoutProductParam = slugs.length - withProductParam;

console.log('\nSlug patterns:');
console.log('Slugs ending with -#### (new format):', withProductParam);
console.log('Slugs without -#### (old format):', withoutProductParam);

// Find examples of potential duplicates
console.log('\nLooking for old/new pairs...');
const oldStyleSlugs = slugs.filter(s => !s.match(/-\d{2,4}$/));
for (let i = 0; i < Math.min(5, oldStyleSlugs.length); i++) {
  const oldSlug = oldStyleSlugs[i];
  const possibleNew = slugs.filter(s => s.startsWith(oldSlug + '-') && s.match(/-\d{2,4}$/));
  if (possibleNew.length > 0) {
    console.log(`Old: ${oldSlug}`);
    console.log(`New: ${possibleNew[0]}`);
    console.log('');
  }
}
