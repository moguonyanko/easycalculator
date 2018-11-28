/**
 * @fileOverview テストケース実行用メインスクリプト
 */

const CDPTests = require("./cdptests.js");
const PuppeteerTests = require("./puppeteertests");

const main = () => {
    //CDPTests.run();
    PuppeteerTests.run();
};

main();
