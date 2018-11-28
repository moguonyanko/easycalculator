/**
 * @name puppeteertests.js
 * @fileOverview ヘッドレスChrome単体テスト用スクリプト(Puppeteer版)
 * @see 参考サイト
 * https://developers.google.com/web/tools/puppeteer/
 * https://developers.google.com/web/tools/puppeteer/articles/ssr
 */

const puppeteer = require("puppeteer");

const getHtml = async ({url, browser}) => {
    const page = await browser.newPage();
    await page.goto(url, {
        waitUntil: "domcontentloaded"
    });
    const html = await page.content();
    return html;
};

const main = async () => {
    const url = "https://localhost/easycalculator/";
    const browser = await puppeteer.launch({
        //headless: true // デフォルトでtrue
        ignoreHTTPSErrors: true
    });
    try {
        const html = await getHtml({url, browser});
        console.log(html);
    } finally {
        await browser.close();
    }
}

const PuppeteerTests = {
    run: () => {
        main().then();
    }
};

module.exports = PuppeteerTests;
