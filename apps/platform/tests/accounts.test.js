import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";

const base = new URL(process.env.PSC_TEST_BASE_URL || "http://127.0.0.1:3001");
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(base.hostname),
  "Run this suite against the local platform and a disposable local Supabase database.");

const tracesUrl = new URL("/review/trace-tokens", base).href;
const loginUrl = new URL("/login?next=%2Freview%2Ftrace-tokens", base).href;
const seededEmail = "reviewer1@example.com";
const seededUsername = "demo_reviewer_1";
const seededPassword = "password123";
const signupPassword = "LocalTesting42!";
let browser;

async function withPage(check) {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    page.setDefaultTimeout(12000);
    await check(page);
  } finally {
    await context.close();
  }
}

async function signIn(page, identifier, password) {
  await page.goto(loginUrl);
  const field = page.getByLabel(/^Email/);
  await field.fill(identifier);
  assert.ok(await field.evaluate((input) => input.validity.valid),
    "The sign-in form rejected the identifier before submitting");
  await page.locator("#signin-password").fill(password);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
}

async function expectTraceTokens(page) {
  await page.waitForURL(tracesUrl);
  await page.getByRole("heading", { name: "Trace tokens", exact: true }).waitFor();
}

async function submitSignup(page, confirmation) {
  const username = `report_${randomUUID().slice(0, 12)}`;
  const email = `${username}@example.com`;
  await page.goto(loginUrl);
  await page.getByRole("link", { name: "Sign up", exact: true }).click();
  await page.locator("#signup-name").fill(username);
  await page.locator("#signup-email").fill(email);
  await page.locator("#signup-password").fill(signupPassword);
  await page.locator("#signup-confirm-password").fill(confirmation);
  await page.frameLocator(".signup-captcha iframe").locator("#checkbox").click();
  await page.getByRole("button", { name: "Create Account", exact: true }).click();
  return email;
}

describe("accounts: signup and sign-in", () => {
  before(async () => {
    const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
    const channel = process.env.PSC_TEST_BROWSER_CHANNEL;
    browser = await chromium.launch({ channel });
  });
  after(async () => browser?.close());

  it("3.1 Create an account and sign in again in a fresh session", async () => {
    let email;
    await withPage(async (page) => {
      email = await submitSignup(page, signupPassword);
      await expectTraceTokens(page);
    });
    await withPage(async (page) => {
      await signIn(page, email, signupPassword);
      await expectTraceTokens(page);
    });
  });

  it("3.2 Block signup when the passwords differ", () => withPage(async (page) => {
    await submitSignup(page, signupPassword + "x");
    await page.getByText("Passwords do not match.", { exact: true }).waitFor();
    assert.equal(new URL(page.url()).pathname, "/login");
    await page.getByRole("heading", { name: "Create your account", exact: true }).waitFor();
    await page.goto(tracesUrl);
    await page.waitForURL(loginUrl);
  }));

  it("3.3 Sign in with a valid email and password", () => withPage(async (page) => {
    await signIn(page, seededEmail, seededPassword);
    await expectTraceTokens(page);
  }));

  it("3.4 Sign in with a valid username and password", () => withPage(async (page) => {
    await signIn(page, seededUsername, seededPassword);
    await expectTraceTokens(page);
  }));

  it("3.5 Reject an incorrect password and keep the user signed out", () => withPage(async (page) => {
    await signIn(page, seededEmail, "IncorrectLocalPassword42!");
    await page.getByText("Invalid login credentials", { exact: true }).waitFor();
    await page.goto(tracesUrl);
    await page.waitForURL(loginUrl);
  }));
});
