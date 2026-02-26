import puppeteer from "puppeteer";

const browser = await puppeteer.launch({
  headless: true
});

const page = await browser.newPage();

await page.goto("https://google.com");

console.log("Puppeteer working ✅");

await browser.close();
