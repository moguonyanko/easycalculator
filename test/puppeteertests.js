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

// ElementHandleクラスにselectメソッドを実装しようとしているが実装できない。
// Elementhandleがundefinedになっている。
// 実装できれば以下のように呼び出せるはず。
// 
//        mainEle.select({
//          root,
//          selector: '.ship-selector',
//          optionValue: '赤城改'
//        });
// 
// 参考:
// https://github.com/GoogleChrome/puppeteer/issues/613
const extendElementHandle = () => {
  if (typeof puppeteer.ElementHandle.prototype.select !== 'function') {
    puppeteer.ElementHandle.prototype.select = async ({root = document,
        selector, optionValue}) => {
      await this._page.evaluateHandle((el, value) => {
        const selectEle = root.querySelector(selector);
        const optionEle = root.querySelector(`.${selector} option[value="${value}"]`);
        optionEle.selected = true;
        const event = new Event('change', {bubbles: true});
        event.simulated = true;
        selectEle.dispatchEvent(event);
      }, this, optionValue);
    };
  }
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
 * @private
 * @type Object
 * @name testCases
 * @description テスト関数群です。
 * $で始まるテスト関数は優先的に実行され他の関数は無視されます。
 * _で始まるテスト関数は無視されます。
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
        // evaluateの内側から外側の変数や定数を参照することはできない。関数も参照できないので
        // 共通の処理をevaluateの外側にまとめることができない。
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
        acEle.dispatchEvent(event2);

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
  },
  testCalculateMasteryWithMaxSkill( {browser, url}) {
    return new Promise(async (resolve, reject) => {
      const expected = '92';
      const name = `赤城改の第3スロットに熟練度maxの烈風を積んだ時の制空値は ${expected} である`;

      const page = await getPage({browser, url});
      const actual = await page.$eval('main', main => {
        const shipName = '赤城改';
        const slotNo = 3;
        const acName = '烈風';

        const root = main.querySelector('.ships ship-config:first-of-type')
            .shadowRoot;

        // 艦艇リストから赤城改を選択するイベントを発生させる。
        const shipSelector = '.ship-selector';
        const shipEle = root.querySelector(shipSelector);
        const shipOption = root.querySelector(`.ship-selector option[value="${shipName}"]`);
        shipOption.selected = true;
        const shipEvent = new Event('change', {bubbles: true});
        shipEvent.simulated = true;
        shipEle.dispatchEvent(shipEvent);

        const targetSlotSelector = `.aircraft-selector-base .aircraft-selector-container:nth-of-type(${slotNo}) `;

        // 赤城改の第3スロットのリストから烈風を選択するイベントを発生させる。
        const acSelector = `${targetSlotSelector}.aircraft-selector`;
        const acEle = root.querySelector(acSelector);
        const acOption = root.querySelector(`${acSelector} option[value="${acName}"]`);
        acOption.selected = true;
        const acEvent = new Event('change', {bubbles: true});
        acEvent.simulated = true;
        acEle.dispatchEvent(acEvent);

        // 烈風の熟練度をmaxにするイベントを発生させる。
        const impSelector = `${targetSlotSelector}.aircraft-improve-range-container .aircraft-improve-range`;
        const impEle = root.querySelector(impSelector);
        impEle.value = '10';
        const impEvent = new Event('change', {bubbles: true});
        impEvent.simulated = true;
        impEle.dispatchEvent(impEvent);

        // 制空値計算実行
        main.querySelector('.calculator').click();
        // ページに出力された制空値取得
        return main.querySelector('.result-area').innerText;
      });

      if (actual === expected) {
        resolve({name, actual});
      } else {
        reject(new UnitTestError({name, expected, actual}));
      }
    });
  },
  testAddNewShipConfigElement( {browser, url}) {
    return new Promise(async (resolve, reject) => {
      const initialSize = 6; // TODO: 現在のdocumentから取得したい。
      const expected = initialSize + 1;
      const name = `追加ボタンを1回クリックするとship-configが ${expected} 個になる`;

      const page = await getPage({browser, url});
      const actual = await page.$eval('main', main => {
        const addEle = main.querySelector('.addship');
        addEle.click();
        return main.querySelectorAll('ship-config').length;
      });
      if (actual === expected) {
        resolve({name, actual});
      } else {
        reject(new UnitTestError({name, expected, actual}));
      }
    });
  },
  testNotAddShipConfigElementIfReachedLimit( {browser, url}) {
    return new Promise(async (resolve, reject) => {
      const expected = 12;
      const name = `追加ボタンをクリックし続けてもship-configは ${expected} 個までしか増えない`;

      const page = await getPage({browser, url});
      const actual = await page.$eval('main', main => {
        const clickCount = 15; // クリック回数はexpectedより多い適当な数
        const addEle = main.querySelector('.addship');
        for (let current = 0; current < clickCount; current++) {
          addEle.click();
        }
        // clickCountを引数に渡す呼び方ではclickイベントが1回しか発生しない。
        //addEle.click({clickCount});
        return main.querySelectorAll('ship-config').length;
      });
      if (actual === expected) {
        resolve({name, actual});
      } else {
        reject(new UnitTestError({name, expected, actual}));
      }
    });
  },
  testRemoveShipConfigElement({browser, url}) {
    return new Promise(async (resolve, reject) => {
      const name = '削除ボタンをクリックされたship-configはドキュメントから削除される';
      
      const page = await getPage({browser, url});
      const expected = null;
      const actual = await page.$eval('main', main => {
        const selector = '.ships ship-config:first-of-type';
        const testId = 'targetShipConfig';
        const shipConfig = main.querySelector(selector);
        const root = shipConfig.shadowRoot;
        shipConfig.setAttribute('id', testId);
        const removeEle = root.querySelector('.delete-ship-data');
        removeEle.click();
        // ドキュメントから削除されていればnull
        return main.querySelector(`#${testId}`);
      });
      if (actual === expected) {
        resolve({name, actual});
      } else {
        reject(new UnitTestError({name, expected, actual}));
      }
    });
  }
};

/**
 * @private
 * @function
 * @name getTestCases
 * @return {Array} テスト対象関数群 
 * @description テスト対象の関数群を返します。
 * 関数名が$で始まるテスト関数が見つかった場合はその関数だけを含む配列を返します。
 * $で始まるテスト関数が複数存在した時は一番最初に見つかった関数だけを返します。
 * _で始まるテスト関数は無視されます。
 */
const getTestCases = () => {
  const priorityPrefix = "$";
  const testCase = Object.values(testCases)
      .find(testCase => testCase.name.startsWith(priorityPrefix));

  if (testCase) {
    return [testCase];
  }

  const ignorePrefix = '_';
  return Object.values(testCases)
      .filter(testCase => !testCase.name.startsWith(ignorePrefix));
};

const runAllTests = ({browser, url}) => {
  return new Promise((resolve, reject) => {
    if (!url) {
      reject(new Error('Not found URL'));
      return;
    }

    // Promise.allによるテスト実行時にいずれかのテストが失敗しても他のテストが
    // 実行されるようPromise.catchを呼び出してreject時の振る舞いを変更している。
    // 参考: Promise.all fail-fast behaviour(MDN)
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all
    const tests = getTestCases().map(testCase => testCase({browser, url})
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
    //headless: false,
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
  run() {
    main().then();
  }
};

module.exports = PuppeteerTests;
