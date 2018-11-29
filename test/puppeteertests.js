/**
 * @name puppeteertests.js
 * @fileOverview ヘッドレスChrome単体テスト用スクリプト(Puppeteer版)
 * @see 参考サイト
 * https://developers.google.com/web/tools/puppeteer/
 * https://developers.google.com/web/tools/puppeteer/articles/ssr
 * https://pptr.dev/#?product=Puppeteer&version=v1.10.0&show=outline
 */

const puppeteer = require("puppeteer");

const getPage = async ({browser, url}) => {
  const page = await browser.newPage();
  await page.goto(url, {
    waitUntil: "domcontentloaded"
  });
  return page;
};

class UnitTestError extends Error {
  constructor( {name, expected, actual}) {
    super(name);
    this.name = name;
    this.expected = expected;
    this.actual = actual;
  }

  diff() {
    return `expected: ${this.expected}, actual: ${this.actual}`;
  }
}

const testCases = {
  testCanGetPageHtml( {browser, url}) {
    return new Promise(async (resolve, reject) => {
      const expected = true;
      const name = "indexページのHTMLを取得することができる";
      const page = await getPage({browser, url});
      const content = await page.content();
      const actual = content ? content.length > 0 : false;
      if (actual) {
        resolve({name, actual});
      } else {
        reject(new UnitTestError({
          name, expected, actual
        }));
      }
    });
  },
  testValidTitle( {browser, url}) {
    return new Promise(async (resolve, reject) => {
      const expected = "簡易計算機";
      const name = `正しいタイトル ${expected} が設定されている`;
      const page = await getPage({browser, url});
      const actual = await page.title();
      if (actual === expected) {
        resolve({name, actual});
      } else {
        reject(new UnitTestError({name, expected, actual}));
      }
    });
  }
};

const runAllTests = ({browser, url}) => {
  return new Promise((resolve, reject) => {
    if (!url) {
      reject(new Error("Not found URL"));
      return;
    }

    // Promise.allによるテスト実行時にいずれかのテストが失敗しても他のテストが
    // 実行されるようPromise.catchを呼び出してreject時の振る舞いを変更している。
    // 参考: Promise.all fail-fast behaviour(MDN)
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all
    const tests = Object.values(testCases)
        .map(testCase => testCase({browser, url})
              .then(result => {
                console.log(`OK: ${result.name}`);
                return result;
              })
              .catch(err => {
                console.error(`NG: ${err.message}\n\t${err.diff()}`);
                return err;
              }));

    Promise.all(tests).then(resolve);
  });
};

const main = async () => {
  const url = "https://localhost/easycalculator/";
  const browser = await puppeteer.launch({
    //headless: true // デフォルトでtrueなので指定は不要
    ignoreHTTPSErrors: true // 自己署名証明書に伴うエラーを無視するために必要
  });
  try {
    await runAllTests({browser, url});
  } catch (err) {
    // テスト実行処理そのものの失敗
    // 各テストケースの失敗はここで処理されない。
    console.error(err.message);
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
