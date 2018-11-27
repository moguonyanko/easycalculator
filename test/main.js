/**
 * @name main.js
 * @fileOverview ヘッドレスChrome単体テスト用スクリプト
 * 参考: 
 * https://www.npmjs.com/package/chrome-launcher
 * https://developers.google.com/web/updates/2017/04/headless-chrome
 * https://chromedevtools.github.io/devtools-protocol/
 */

const chromeLauncher = require("chrome-launcher");
const chromeRemote = require("chrome-remote-interface");

const startingUrl = "https://localhost/easycalculator/";

const killChrome = ({chromeLauncher, time = 0}) => {
    setTimeout(async () => {
        await chromeLauncher.kill();
    }, time);
};

const getPageManifest = async Page => {
    const response = await Page.getAppManifest();
    if (!response.url) {
        console.log("Site has no app manifest");
        return null;
    }
    console.log("Manifest: " + response.url);
    console.log(response.data);
    return response.data;
}

const searchElement = async ({Runtime, elementName}) => {
    const js = `document.querySelector("${elementName}").textContent`;
    const result = await Runtime.evaluate({expression: js});
    console.log(`Title of page: + ${result.result.value}`);
}

const shutdown = ({protocol}) => {
    protocol.close();
    killChrome({
        chromeLauncher
    });
};

const checkPage = () => {
    chromeRemote(async protocol => {
        const {Page, Runtime} = protocol;

        Promise.all([
            Page.enable(),
            Runtime.enable()
        ]).then(() => {
            Page.navigate({url: startingUrl});
            Page.loadEventFired(async () => {
                const manifest = await getPageManifest(Page);
                console.log(`Web App Manifest = ${manifest}`);
                await searchElement({Runtime, elementName: "title"});
                shutdown({protocol});
            });
        });
    });
};

const main = async () => {
    const chrome = await chromeLauncher.launch({
        startingUrl,
        chromeFlags: [
            //"--remote-debugging-port=9222",
            "--headless",
            "--disable-gpu"
        ]
    });
    console.log(`ポート番号 ${chrome.port} でヘッドレスChromeによるテストを実行します！`);

    try {
        const version = await chromeRemote.Version();
        console.log(version["User-Agent"]);
        checkPage();
    } catch (err) {
        console.error(err);
    }
};

main().then().catch(err => console.error(err));