const fs = require('fs');
const path = require('path');

function check() {
  const envExamplePath = path.resolve(__dirname, '..', '.env.local.example');
  const lines = fs.readFileSync(envExamplePath, 'utf-8').split(/\r?\n/);
  const keys = lines
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => l.split('=')[0]);
  const missing = keys.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }
}

if (require.main === module) {
  try {
    check();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

module.exports = { check };
