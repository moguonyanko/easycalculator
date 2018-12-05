/**
 * @name cdptests.js
 * @fileOverview ヘッドレスChrome単体テスト用スクリプト(CDP直接利用)
 * @see 参考サイト
 * https://www.npmjs.com/package/chrome-launcher
 * https://github.com/cyrus-and/chrome-remote-interface/
 * https://chromedevtools.github.io/devtools-protocol/
 * https://developers.google.com/web/updates/2017/04/headless-chrome
 * https://chromium.googlesource.com/chromium/src/+/lkgr/headless/README.md
 */

const chromeLauncher = require("chrome-launcher");
const CDP = require("chrome-remote-interface");

const killChrome = ({chrome, time = 0} = {}) => {
    setTimeout(async () => {
        await chrome.kill();
    }, time);
};

const getWebAppManifest = async Page => {
    const result = await Page.getAppManifest();
    if (!result.url) {
        return null;
    }
    return result.data;
}

const searchElement = async ({Runtime, elementName}) => {
    const expression = `document.querySelector("${elementName}").textContent`;
    const result = await Runtime.evaluate({expression});
    return result;
}

const testPageContent = async ({port, url}) => {
    const target = await CDP.New({port});
    const client = await CDP({target, port, secure: url.startsWith("https")});
    const {Runtime, Page} = client;

    await Page.enable();
    await Runtime.enable();

    Page.navigate({url});
    await Page.loadEventFired();
    
    try {
        const manifest = await getWebAppManifest(Page);
        console.log(manifest);
        const title = await searchElement({Runtime, elementName: "title"});
        console.log(title);
    } finally {
        client.close();
    }
};

const main = async () => {
    // TODO: HTTPSだとエラーになってしまう。
    const url = "http://localhost/easycalculator/";

    const chrome = await chromeLauncher.launch({
        //startingUrl: url,
        logLevel: "verbose",
        chromeFlags: [
            //"--remote-debugging-port=9222",
            //"--no-sandbox",
            "--headless",
            "--disable-gpu"
        ]
    });

    console.info(`ポート番号 ${chrome.port} でヘッドレスChromeによるテストを実行します。`);

    try {
        await testPageContent({port: chrome.port, url, chrome});
    } catch (err) {
        console.error(err);
    } finally {
        killChrome({chrome});
    }
};

const CDPTests = {
    run() {
        main().then();
    }
}; 

module.exports = CDPTests;
