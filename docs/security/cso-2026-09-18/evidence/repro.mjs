import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync } from 'node:fs';
const LOG = process.env.STUB_LOG;
const mark = () => readFileSync(LOG, 'utf8').split('\n').filter(Boolean).length;
const since = (n) => readFileSync(LOG, 'utf8').split('\n').filter(Boolean).slice(n).map(l => JSON.parse(l));
const show = (label, rows) => { console.log(`\n## ${label}`); rows.forEach(e => console.log(`  ${e.method} ${e.path}  auth=${e.auth ? e.auth.slice(0, 22) + '…' : 'none'}${e.body ? '\n    body=' + JSON.stringify(e.body) : ''}`)); };

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const page = await browser.newPage();
const consoleMsgs = []; page.on('console', m => consoleMsgs.push(m.text()));

// 1. Builders directory: what does the browser fetch and what comes back?
let m = mark();
await page.goto('http://localhost:3001/builders', { waitUntil: 'networkidle' });
show('1. /builders directory page: client-side profiles fetch', since(m));
const dirState = await page.evaluate(() => document.body.innerText.includes('alice@example.com'));
console.log('  email rendered in directory DOM?', dirState);

// 2. Username-based sign-in: resolves username -> email from the browser BEFORE authentication
await page.goto('http://localhost:3001/', { waitUntil: 'networkidle' });
m = mark();
await page.click('button.topbar-signup-btn:has-text("Sign In")');
await page.fill('#signin-identifier', 'alice');
await page.fill('#signin-password', 'wrong-password');
await page.click('button.signup-submit');
await page.waitForSelector('.auth-error', { timeout: 10000 });
show('2. Sign-in by username with WRONG password', since(m));
console.log('  UI error:', await page.textContent('.auth-error'));

// 2b. Non-existent username → distinguishable error (enumeration oracle)
m = mark();
await page.fill('#signin-identifier', 'ghost');
await page.click('button.signup-submit');
await page.waitForFunction(() => document.querySelector('.auth-error')?.textContent.includes('Username'), null, { timeout: 10000 });
console.log('  UI error for unknown username:', await page.textContent('.auth-error'));

// 3. Real sign-in, then submit a review against an agent id chosen via the URL
await page.fill('#signin-identifier', 'alice@example.com');
await page.fill('#signin-password', 'Alice1234!');
await page.click('button.signup-submit');
await page.waitForSelector('text=Log Out', { timeout: 10000 });
m = mark();
await page.goto('http://localhost:3001/review?agent=agt-DOES-NOT-EXIST', { waitUntil: 'networkidle' });
await page.fill('textarea >> nth=0', 'task text');
for (let i = 0; i < 5; i++) await page.locator('button:has-text("5")').nth(i).click();
await page.fill('textarea >> nth=1', 'note text');
await page.click('button:has-text("Submit review")');
await page.waitForURL('**/builders', { timeout: 10000 }).catch(() => {});
show('3. Review submission (agent id taken from URL, reviewer id supplied by client)', since(m).filter(e => e.path.startsWith('/rest')));

// 4. Sign-up flow: is a CAPTCHA token ever sent to the auth server?
await page.goto('http://localhost:3001/', { waitUntil: 'networkidle' });
await page.click('text=Log Out');
await page.click('button.topbar-signup-btn:has-text("Sign Up")');
await page.fill('#signup-name', 'alice');           // duplicate username
await page.fill('#signup-email', 'mallory@example.com');
await page.fill('#signup-password', 'Password1!');
await page.fill('#signup-confirm-password', 'Password1!');
const disabled = await page.isDisabled('button.signup-submit');
console.log('\n## 4. Sign-up: submit button disabled until client-side captcha callback?', disabled);
m = mark();
// simulate what any script on the page (or a direct API caller) can do: the gate is only a JS callback
await page.evaluate(() => window.onRecaptchaSuccess && window.onRecaptchaSuccess());
await page.waitForFunction(() => !document.querySelector('button.signup-submit')?.disabled, null, { timeout: 5000 });
await page.click('button.signup-submit');
await page.waitForTimeout(1500);
show('4. Sign-up requests after calling window.onRecaptchaSuccess() from the console', since(m));

// 5. Now that "alice" exists twice, username sign-in for the real alice:
await page.goto('http://localhost:3001/', { waitUntil: 'networkidle' });
if (await page.isVisible('text=Log Out')) await page.click('text=Log Out');
await page.click('button.topbar-signup-btn:has-text("Sign In")');
await page.fill('#signin-identifier', 'alice');
await page.fill('#signin-password', 'Alice1234!');
m = mark();
await page.click('button.signup-submit');
await page.waitForSelector('.auth-error', { timeout: 10000 }).catch(() => {});
show('5. Username sign-in after a second "alice" profile was created', since(m));
console.log('  UI error:', await page.textContent('.auth-error').catch(() => '(none)'));
const r = await fetch('http://localhost:3001/builders/alice'); console.log('  GET /builders/alice ->', r.status);

console.log('\n## console messages:', consoleMsgs.filter(t => !t.includes('Download the React DevTools')).slice(0, 10));
await browser.close();
