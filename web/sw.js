/**
 * @fileOverview EasyCalculator用のServiceWorkerスクリプト
 */

const VERSION = "0.112";
const CONTEXT_NAME = "easycalculator";
const APP_ROOT = `/${CONTEXT_NAME}/`;
const CACHE_KEY = `${CONTEXT_NAME}-${VERSION}`;

// ServiceWorkerスクリプトを登録しているスクリプトを読み込んでいるページの
// ディレクトリがキャッシュに追加されていないとFirefoxではコンテンツデータ破損エラーになる。
// 定数RESOURCESの最初に指定しているディレクトリがそれに当たる。
// またスコープ配下でキャッシュに追加されなかったページをブラウザで参照した時も
// Firefoxではコンテンツデータ破損エラーになってしまう。回避するためにはスコープを小さくする。
// スコープを小さくするとユーティリティ関数をまとめたスクリプトのような共有のリソースは
// 普通スコープ外に配置されているためキャッシュに追加できない。
// そこでHTTPレスポンスヘッダーservice-worker-allowedで指定したディレクトリ以下に
// 該当ファイルを配置してキャッシュに追加する。以下のcore.jsがそれに該当する。
const targetResources = [
    APP_ROOT,
    `${APP_ROOT}index.html`,
    `${APP_ROOT}home.png`,
    `${APP_ROOT}home_small.png`,
    `${APP_ROOT}launch.png`,
    `${APP_ROOT}styles/easycalculator.css`,
    `${APP_ROOT}scripts/index.js`,
    `${APP_ROOT}scripts/easycalculator.js`,
    `${APP_ROOT}scripts/aircrafts.json`,
    `${APP_ROOT}scripts/ships.json`,
    `${APP_ROOT}favicon.ico`
];

const openCaches = async () => await caches.open(CACHE_KEY);

const isNotCurrentCacheKey = key => {
    return key.startsWith(CONTEXT_NAME) && key !== CACHE_KEY;
};

const getDeletePromise = cacheKey => {
    if (isNotCurrentCacheKey(cacheKey)) {
        console.log(`Delete cache: ${cacheKey}`);
        return caches.delete(cacheKey);
    } else {
        // CacheStorage.delete()はキャッシュが削除されなかった時にfalseでresolveする
        // Promiseを返す。この仕様に倣いこの関数でもPromise.resolve(false)を返す。
        return Promise.resolve(false);
    }
};

const createErrorPage = ({url, error}) => `
<!DOCTYPE html>
<html>
<head>
<meta charset='UTF-8' />
<title>Easy Calculator Error</title>
</head>
<body>
<header>
<h1>Easy Calculator Error</h1>
</header>
<main>
<section>
<h2>Cannot get resorces</h2>
<p>${url}</p>
<section>
<h3>Cause</h3>
<p>${error.message}</p>
</section>
</section>
</main>
</body>
</html>
`;

const getErrorResponse = ({url, error}) => {
    const page = createErrorPage({url, error});
    const response = new Response(page, {
        headers: {
            "Content-Type": "text/html"
        }
    });
    return response;
};

self.addEventListener("install", event => {
    console.log(`Install: ${CONTEXT_NAME}`);
    event.waitUntil(openCaches().then(ch => ch.addAll(targetResources)));
});

const checkResponse = (request, response) => {
    // CacheStorageにリソースが存在した場合
    if (response) {
        // ここでエラーを発生させるとEvent.respondWith().catch()のcatchに記述した
        // 内容に基づいてエラー処理が行われる。
        //throw new Error("test error");
        console.log(`Fetch(from service worker): ${request.url}`);
        return Promise.resolve(response);
    }
    // CacheStorageにリソースが存在しなかった場合
    return fetch(request).then(response => {
        console.log(`Fetch(from server): ${request.url}`);
        // CacheStorage保存対象のリソースだった場合はCacheStorageに保存してから
        // レスオポンスを返す。
        if (targetResources.indexOf(request.url) >= 0) {
            return openCaches().then(cache => {
                cache.put(request, response.clone());
                return response;
            });
        } else {
            // CacheStorage保存対象のリソースでなければそのままレスポンスを返す。
            return response;
        }
    });
};

self.addEventListener("fetch", event => {
    const request = event.request;
    event.respondWith(caches.match(request)
        .then(response => checkResponse(request, response))
        .catch(error => getErrorResponse({
                url: request.url,
                error
            })));
});

// ブラウザの履歴が削除された後，またはServiceWorkerが一度unregisterされた後に
// 再びregisterされるとactivateイベントが発生する。
self.addEventListener("activate", event => {
    console.log(`Activate: ${CONTEXT_NAME}`);
    event.waitUntil(caches.keys().then(keys => {
        return Promise.all(keys.map(key => getDeletePromise(key)));
    }));
});
