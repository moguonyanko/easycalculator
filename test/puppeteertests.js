/**
 * @name puppeteertests.js
 * @fileOverview ヘッドレスChrome単体テスト用スクリプト(Puppeteer版)
 * @see 参考サイト
 * https://developers.google.com/web/tools/puppeteer/
 * https://developers.google.com/web/tools/puppeteer/articles/ssr
 * https://pptr.dev/#?product=Puppeteer&version=v1.10.0&show=outline
 */

const puppeteer = require('puppeteer');

const getPage = async ({browser, url}) => {
  const page = await browser.newPage();
  await page.goto(url, {
    waitUntil: 'domcontentloaded'
  });
  return page;
};

/**
 * @private
 * @class
 * @name UnitTestError
 * @description 単体テストで期待値と実際の値に差異があったことを示すエラーです。
 */
class UnitTestError extends Error {
  constructor( {name, expected, actual}) {
    super(name);
    this.name = name;
    this.expected = expected;
    this.actual = actual;
  }
  /**
   * @memberOf UnitTestError
   * @function
   * @name diff
   * @description 期待値expectedと実際の値actualを比較した文字列を返します。
   */
  diff() {
    return `expected: ${this.expected}, actual: ${this.actual}`;
  }
}

/**
 * @name testCases
 * @description テストケース群です。アンダースコアで始まるテストケースはテスト実行に
 * 無視されます。
 */
const testCases = {
  _testDummy( {browser, url}) {
    const result = {
      name: 'ダミーテスト',
      actual: 'Dummy'
    };
    return Promise.resolve(result);
  },
  testCanGetPageHtml( {browser, url}) {
    return new Promise(async (resolve, reject) => {
      const expected = true;
      const name = 'indexページのHTMLを取得することができる';
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
      const expected = '簡易計算機';
      const name = `正しいタイトル ${expected} が設定されている`;
      const page = await getPage({browser, url});
      const actual = await page.title();
      if (actual === expected) {
        resolve({name, actual});
      } else {
        reject(new UnitTestError({name, expected, actual}));
      }
    });
  },
  testClickCalclator( {browser, url}) {
    return new Promise(async (resolve, reject) => {
      const expected = '0';
      const name = `設定未変更時は初期制空値 ${expected} が表示されている`;
      const page = await getPage({browser, url});
      const main = await page.$('main');
      const actual = await page.evaluate(m => {
        const ele = m.querySelector('.calculator');
        ele.click();
        const resultArea = m.querySelector('.result-area');
        return resultArea.innerText;
      }, main);
      if (actual === expected) {
        resolve({name, actual});
      } else {
        reject(new UnitTestError({name, expected, actual}));
      }
    });
  },
  testCalculateMasteryWithoutSkill( {browser, url}) {
    return new Promise(async (resolve, reject) => {
      const expected = '81';
      const name = `赤城改の第3スロットに熟練度ゼロの烈風を積んだ時の制空値は ${expected} である`;

      const page = await getPage({browser, url});
      const main = await page.$('main');
      const actual = await page.evaluate(mainEle => {
        // evaluateの内側から外側の変数や定数を参照することはできない。
        // もちろん関数も参照することもできない。
        const shipName = '赤城改';
        const slotNo = 3;
        const acName = '烈風';

        const root = mainEle.querySelector('.ships ship-config:first-of-type')
            .shadowRoot;

        // 艦艇リストから赤城改を選択するイベントを発生させる。
        const shipSelector = '.ship-selector';
        const shipEle = root.querySelector(shipSelector);
        const shipOption = root.querySelector(`.ship-selector option[value="${shipName}"]`);
        shipOption.selected = true;
        const event = new Event('change', {bubbles: true});
        event.simulated = true;
        shipEle.dispatchEvent(event);

        // 赤城改の第3スロットのリストから烈風を選択するイベントを発生させる。
        const acSelector = `.aircraft-selector-base .aircraft-selector-container:nth-of-type(${slotNo}) .aircraft-selector`;
        const acEle = root.querySelector(acSelector);
        const acOption = root.querySelector(`${acSelector} option[value="${acName}"]`);
        acOption.selected = true;
        const event2 = new Event('change', {bubbles: true});
        event2.simulated = true;
        acEle.dispatchEvent(event);

        // 制空値計算実行
        mainEle.querySelector('.calculator').click();
        // ページに出力された制空値取得
        return mainEle.querySelector('.result-area').innerText;
      }, main);

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
      reject(new Error('Not found URL'));
      return;
    }

    const ignorePrefix = '_';

    // Promise.allによるテスト実行時にいずれかのテストが失敗しても他のテストが
    // 実行されるようPromise.catchを呼び出してreject時の振る舞いを変更している。
    // 参考: Promise.all fail-fast behaviour(MDN)
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all
    const tests = Object.values(testCases)
        .filter(testCase => !testCase.name.startsWith(ignorePrefix))
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
  const url = 'https://localhost/easycalculator/';
  const browser = await puppeteer.launch({
    // headlessはデフォルトでtrueである。ただしPage.evaluate内のコンソール出力の内容を
    // 確認したい時はheadlessをfalseにしてテストを実行する必要がある。
    headless: true,
    // 自己署名証明書に伴うエラーを無視するために必要。
    ignoreHTTPSErrors: true
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
