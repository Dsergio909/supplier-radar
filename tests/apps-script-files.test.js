// The Apps Script folder ships copies of src/core so the system can be
// installed by pasting files, without Node. This keeps the copies honest.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

for (const name of ['classifier.js', 'compliance.js', 'messages.js']) {
  test(`apps-script/core_${name} matches src/core/${name}`, () => {
    const source = fs.readFileSync(path.join(root, 'src', 'core', name), 'utf8');
    const copy = fs.readFileSync(path.join(root, 'apps-script', `core_${name}`), 'utf8');
    assert.equal(copy, source, 'run `npm run build:gas` and commit the result');
  });
}
