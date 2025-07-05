const fs = require('fs');
const threshold = parseFloat(process.env.COVERAGE_THRESHOLD || '0');
if (!threshold) {
  console.log('No coverage threshold set; skipping check.');
  process.exit(0);
}

const file = 'coverage/coverage-final.json';
if (!fs.existsSync(file)) {
  console.error(`Coverage file ${file} not found.`);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(file, 'utf8'));
let total = 0;
let covered = 0;
for (const cov of Object.values(data)) {
  for (const count of Object.values(cov.l)) {
    total++;
    if (count > 0) covered++;
  }
}
const percent = (covered / total) * 100;
console.log(`Line coverage: ${percent.toFixed(2)}%`);
if (percent < threshold) {
  console.error(`Coverage threshold of ${threshold}% not met`);
  process.exit(1);
}
