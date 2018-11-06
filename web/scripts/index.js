import EC from "./easycalculator.js";

const win = window, 
    doc = document;

const selectAllShipElements = opt_doc => {
    const shipEles = (opt_doc || doc).querySelectorAll(".ships .ship");
    return shipEles;
};

const appendAircraft = (aircraftSelector, acName) => {
    const aircraftEle = new Option(acName, acName);
    aircraftSelector.appendChild(aircraftEle);
};

const appendAllAircrafts = aircraftSelector => {
    [...Object.keys(EC.AIRCRAFTS_FACTORY)].forEach(acName => {
        appendAircraft(aircraftSelector, acName);
    });
};

const getImprovementText = impValue => {
    const value = parseInt(impValue);

    if (Number.isNaN(value) || value <= EC.IMPROVEMENT_VALUES.MIN) {
        return "　";
    } else if (EC.IMPROVEMENT_VALUES.MAX <= value) {
        return "★max";
    } else {
        return "★" + value;
    }
};

const createImprovementRange = (ship, slotNo) => {
    const impEle = doc.createElement("input");
    impEle.setAttribute("class", "aircraft-improve-range");
    impEle.setAttribute("type", "range");
    impEle.setAttribute("min", EC.IMPROVEMENT_VALUES.MIN);
    impEle.setAttribute("max", EC.IMPROVEMENT_VALUES.MAX);

    let impValue = EC.IMPROVEMENT_VALUES.DEFAULT;
    if (ship.getAircraft(slotNo)) {
        impValue = ship.getAircraft(slotNo).improvement;
    }
    impEle.setAttribute("value", impValue);

    const impValEle = doc.createElement("span");
    impValEle.setAttribute("class", "aircraft-improve-value");
    impValEle.innerText = getImprovementText(impValue);
    const improveAircraft = evt => {
        const aircraft = ship.getAircraft(slotNo);
        if (aircraft) {
            const impValue = evt.target.value;
            aircraft.improve(impValue);
            ship.setAircraft(slotNo, aircraft);
            impValEle.innerText = getImprovementText(impValue);
        }
    };
    impEle.addEventListener("change", improveAircraft, false);

    const acImpContainer = doc.createElement("div");
    acImpContainer.setAttribute("class", "aircraft-improve-range-container");
    acImpContainer.appendChild(impEle);
    acImpContainer.appendChild(impValEle);

    return acImpContainer;
};

const resetImprovementRange = rangeBase => {
    const impEle = rangeBase.querySelector(".aircraft-improve-range");
    if (impEle) {
        impEle.value = EC.IMPROVEMENT_VALUES.DEFAULT;
    }

    const impValEle = rangeBase.querySelector(".aircraft-improve-value");
    if (impValEle) {
        impValEle.innerText = getImprovementText(EC.IMPROVEMENT_VALUES.DEFAULT);
    }
};

class NoSkillBonusChecker {
    constructor(ship, slotNo) {
        this.checkerClassName = "aircraft-nobonus-checker";
        const container = doc.createElement("div");
        container.setAttribute("class", "aircraft-nobonus-checker-container");

        const checker = doc.createElement("input");
        checker.setAttribute("class", this.checkerClassName);
        checker.setAttribute("type", "checkbox");
        checker.addEventListener("click",
            () => ship.setNoSkillBonus(slotNo, checker.checked));

        const label = doc.createElement("label");
        label.appendChild(checker);
        label.appendChild(doc.createTextNode("熟練度なし"));

        container.appendChild(label);

        this.container = container;
    }

    get checkElement() {
        return this.container.querySelector(`.${this.checkerClassName}`);
    }
}

/**
 * 航空機が選択された時のイベントハンドラを返します。
 */
const changeShipSlot = (ship, slotNo, checker) => {
    return evt => {
        const acName = evt.target.value;
        if (acName in EC.AIRCRAFTS_FACTORY) {
            const aircraft = EC.AIRCRAFTS_FACTORY[acName]();
            ship.setAircraft(slotNo, aircraft);
            const defaultNoSkillBonus = aircraft.type.defaultNoSkillBonus;
            ship.setNoSkillBonus(slotNo, defaultNoSkillBonus);
            if (defaultNoSkillBonus) {
                checker.checkElement.checked = "checked";
            } else {
                checker.checkElement.checked = null;
            }
        } else {
            ship.removeAircraft(slotNo);
            ship.setNoSkillBonus(slotNo, false);
            checker.checkElement.checked = null;
        }
        /**
         * 要素の親子や兄弟の関係はサードパーティのライブラリ利用時に
         * 変更されることがあるので，parentNodeやchildNodes等は極力
         * 使うべきでない。
         */
        resetImprovementRange(evt.target.parentNode);
    };
};

const createNoSkillBonusChecker = (ship, slotNo) => {
    /**
     * 要素を横に並べるためにspanのようなinline要素を選択するべきではない。
     * 表示方法はCSSに任せる。
     */
    const container = doc.createElement("div");
    container.setAttribute("class", "aircraft-nobonus-checker-container");

    const checker = doc.createElement("input");
    checker.setAttribute("class", "aircraft-nobonus-checker");
    checker.setAttribute("type", "checkbox");
    checker.addEventListener("click",
        () => ship.setNoSkillBonus(slotNo, checker.checked));

    const label = doc.createElement("label");
    label.appendChild(checker);
    label.appendChild(doc.createTextNode("熟練度なし"));

    container.appendChild(label);

    return container;
};

const createAircraftSelector = (ship, slotNo) => {
    const aircraftSubBase = doc.createElement("div");
    aircraftSubBase.setAttribute("class", "aircraft-selector-container");

    const noSkillBonusChecker = new NoSkillBonusChecker(ship, slotNo);
    const changeSlotListener = changeShipSlot(ship, slotNo, noSkillBonusChecker);

    const aircraftSelector = doc.createElement("select");
    aircraftSelector.setAttribute("class", "aircraft-selector");
    const empOpt = new Option("", "", true, true);
    aircraftSelector.appendChild(empOpt);
    appendAllAircrafts(aircraftSelector);
    aircraftSelector.addEventListener("change", changeSlotListener, false);
    aircraftSubBase.appendChild(aircraftSelector);

    const slotLoadingSize = ship.getSlot(slotNo).size;
    const slotLoadingEle = doc.createElement("span");
    slotLoadingEle.setAttribute("class", "aircraft-loading-size");
    slotLoadingEle.innerText = slotLoadingSize;
    aircraftSubBase.appendChild(slotLoadingEle);

    const improvementRange = createImprovementRange(ship, slotNo);
    aircraftSubBase.appendChild(improvementRange);

    aircraftSubBase.appendChild(noSkillBonusChecker.container);

    return aircraftSubBase;
};

const appendAircraftSelectors = (ship, selectBase) => {
    const baseClassName = "aircraft-selector-base";
    const aircraftBase = doc.createElement("div");
    aircraftBase.setAttribute("class", baseClassName);

    for (let i = 0; i < ship.slotSize; i++) {
        const slotNo = i + 1;
        const aircraftSelector = createAircraftSelector(ship, slotNo);
        aircraftBase.appendChild(aircraftSelector);
    }

    const base = selectBase.querySelector(`.${baseClassName}`);
    if (base) {
        selectBase.replaceChild(aircraftBase, base);
    } else {
        selectBase.appendChild(aircraftBase);
    }
};

const selectedShips = ((() => {
    let selShips = {};

    [...selectAllShipElements()].forEach((selectBase, idx) => {
        selShips[idx] = {};
    });

    return selShips;
})());

const saveSelectedShip = (shipIdx, ship) => {
    /**
     * 現在選択されていないShipの情報は削除してよい。
     * ただしもう一度選択した際に以前設定した状態で復帰させたい場合は必要になる。
     */
    selectedShips[shipIdx] = {};
    const shipNames = EC.getShipNames();

    if (shipNames.indexOf(ship.name) >= 0) {
        selectedShips[shipIdx][ship.name] = ship;
    }
};

const findSelectedShip = (shipIdx, shipName) => {
    if (shipIdx in selectedShips) {
        return selectedShips[shipIdx][shipName] || new EC.NoNameShip();
    } else {
        return new EC.NoNameShip();
    }
};

const appendShip = (shipName, selectBase, idx) => {
    const shipEle = new Option(shipName, shipName);
    const shipSel = selectBase.querySelector(".ship-selector");
    shipSel.appendChild(shipEle);
    shipSel.addEventListener("change", evt => {
        const value = evt.target.value;
        const ship = EC.getShip(value);
        appendAircraftSelectors(ship, selectBase);
        saveSelectedShip(idx, ship);
    }, false);
};

const appendAllShips = () => {
    [...selectAllShipElements()].forEach((selectBase, idx) => {
        [...EC.getShipNames()].forEach(shipName => {
            appendShip(shipName, selectBase, idx);
        });
    });
};

const getSelectedShip = (selectBase, idx) => {
    const shipSel = selectBase.querySelector(".ship-selector");
    return findSelectedShip(idx, shipSel.value);
};

/**
 * 計算対象に指定されていてかつ任意の艦か基地航空隊が選択されている要素はtrue，
 * それ以外の要素はfalseを割り当てた配列を返す。
 */
const getTargetShipFlags = () => {
    const shipEles = selectAllShipElements();
    const flags = Array.from(shipEles).map((shipEle, index) => {
        const checked = shipEle.querySelector(".enable-ship-data").checked;
        const fn = ele => ele.querySelector(".ship-selector").value;
        const value = fn(shipEle);
        return checked && value && (value !== "未選択");
    });
    return flags;
};

const getAllSelectedShips = () => {
    const shipEles = selectAllShipElements();
    return [...shipEles].map((selectBase, idx) => {
        return getSelectedShip(selectBase, idx);
    });
};

const getSelectedMasteryModeName = () => {
    const modeEles = doc.querySelectorAll(".mastery-mode");
    const checkedValues = Array.from(modeEles)
        .filter(ele => ele.checked)
        .map(ele => ele.value);
    return checkedValues[0];
};

/**
 * TODO: イベントリスナーまでコピーできていない。
 */
const appendNewShip = () => {
    const shipEle = doc.querySelector(".ship");
    const newShipEle = shipEle.cloneNode(true);
    const container = doc.querySelector(".ships");
    container.appendChild(newShipEle);
};

const initPage = () => {
    appendAllShips();

    doc.querySelector(".calculator").addEventListener("click", evt => {
        const allShips = getAllSelectedShips();
        const flags = getTargetShipFlags();
        const targetShips = allShips.filter((ship, index) => flags[index]);
        const mode = getSelectedMasteryModeName();
        const masteries = [...targetShips].map(ship => ship.getMastery(mode));
        const result = masteries.reduce((m1, m2) => m1 + m2, 0);
        const resultArea = doc.querySelector(".result .result-area");
        resultArea.innerText = result;
    });
};

const reportError = err => {
    const resultEle = doc.querySelector(".result");
    resultEle.innerHTML = "";
    const reportEle = doc.createElement("span");
    /**
     * classListでは複数のクラスを一度に設定できない。
     * addの引数にスペースが含まれているとシンタックスエラーになる。
     */
    reportEle.setAttribute("class", "error error-report");
    reportEle.appendChild(doc.createTextNode(err.message));
    resultEle.appendChild(reportEle);
};

const putAppInfo = txt => {
    const info = doc.querySelector(".app-info");
    info.innerHTML = txt;
};

// PWA化のためのServiceWorker設定

const registerService = async () => {
    if (!("serviceWorker" in navigator)) {
        throw new Error("ServiceWorker未対応");
    }

    const scope = "./";
    const url = "sw.js";
    return await navigator.serviceWorker.register(url, {scope});
};

// キャッシュのクリアにはキャッシュのキーが必要になる。
// キャッシュ対象となるアプリのスクリプトでキャッシュのキーを
// 参照するべきではないので，ServiceWorkerスクリプトに
// キャッシュのクリアは任せてアプリのスクリプトでは
// ServiceWorkerのregister及びunregisterのみ行う。
const unregisterService = async registration => {
    if (registration) {
        return await registration.unregister();
    } else {
        return false;
    }
};

const addInstallListener = () => {
    const installer = doc.querySelector(".app-installer");
    installer.addEventListener("click", async () => {
        try {
            await registerService();
            putAppInfo("インストール成功");
        } catch (err) {
            putAppInfo(`インストール失敗: ${err.message}`);
        }
    });
};

const addUninstallListener = async () => {
    const uninstaler = doc.querySelector(".app-uninstaller");
    uninstaler.addEventListener("click", async () => {
        try {
            const registration = await navigator.serviceWorker.ready;
            const result = await unregisterService(registration);
            if (result) {
                putAppInfo("アンインストール成功");
            } else {
                putAppInfo("アンインストール失敗");
            }
        } catch (err) {
            putAppInfo(`アンインストール失敗: ${err.message}`);
        }
    });
};

const setupServiceWorkerListener = () => {
    addInstallListener();
    addUninstallListener();
};

const loadConfig = async path => {
    const response = await fetch(path);
    if (!response.ok) {
        throw new Error(`設定ファイル読み込み失敗: ${response.status}`);
    }
    const json = await response.json();
    return json;
};

const setUpMaker = (config, maker) => {
    for (let key in config) {
        maker(config[key]);
    }
};

class ShipElement extends HTMLElement {
    constructor() {
        super();
        
        const template = doc.querySelector(".ship-template");
        const shadow = this.attachShadow({mode: "open"});
        shadow.appendChild(template.content.cloneNode(true));
    }
}

const init = async () => {
    customElements.define("ship-config", ShipElement);
    
    //EC.test.testCalculateMastery();
    setupServiceWorkerListener();

    try {
        const acConfig = await loadConfig("scripts/aircrafts.json");
        const shipConfig = await loadConfig("scripts/ships.json");
        setUpMaker(acConfig, EC.setAircraftMaker);
        setUpMaker(shipConfig, EC.setShipMaker);
        initPage();
    } catch (err) {
        reportError(err);
    }
};

win.addEventListener("DOMContentLoaded", async () => await init());
// Promise関連のエラーの取りこぼしを防ぐためのコード
win.addEventListener("rejectionhandled", e => console.error(e));
win.addEventListener("unhandledrejection", e => console.error(e));