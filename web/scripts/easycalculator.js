/**
 * @fileOverview 制空値計算システム
 */

/**
 * 改修度
 */
const IMPROVEMENT_VALUES = {
    MIN: 0,
    MAX: 10,
    DEFAULT: 0
};
/**
 * 航空機種別
 */
const AIRCRAFT_TYPE_NAMES = {
    KS: "kansen", //艦上戦闘機
    KK: "kankou", //艦上攻撃機
    KB: "kanbaku", //艦上爆撃機
    BS: "bakusen", //爆戦
    SB: "suibaku", //水上爆撃機
    SS: "suisen", //水上戦闘機
    HB: "hunbaku", //噴式爆撃機
    RS: "rikusen", //陸軍戦闘機
    KYS: "kyokusen", //局地戦闘機
    ROS: "rocketsen", //ロケット戦闘機
    RK: "rikko", //陸上攻撃機
    KT: "kantei", //艦上偵察機
    ST: "suitei", //水上偵察機
    RT: "rikutei" //陸上偵察機
};

class AircraftType {
    constructor(name, bonus, defaultNoSkillBonus = false) {
        this.name = name;
        this.bonus = bonus;
        this.defaultNoSkillBonus = defaultNoSkillBonus;
    }

    toString() {
        return this.name;
    }
}

/**
 * 今のところskill < 7は考慮していない。
 * 常に最大skillのボーナス値が設定されている。
 */
const AIRCRAFT_TYPES = {
    [AIRCRAFT_TYPE_NAMES.KS]: new AircraftType(AIRCRAFT_TYPE_NAMES.KS, 25),
    [AIRCRAFT_TYPE_NAMES.KK]: new AircraftType(AIRCRAFT_TYPE_NAMES.KK, 3, true),
    [AIRCRAFT_TYPE_NAMES.KB]: new AircraftType(AIRCRAFT_TYPE_NAMES.KB, 3, true),
    [AIRCRAFT_TYPE_NAMES.BS]: new AircraftType(AIRCRAFT_TYPE_NAMES.BS, 3, true),
    [AIRCRAFT_TYPE_NAMES.SB]: new AircraftType(AIRCRAFT_TYPE_NAMES.SB, 9, true),
    [AIRCRAFT_TYPE_NAMES.SS]: new AircraftType(AIRCRAFT_TYPE_NAMES.SS, 25),
    [AIRCRAFT_TYPE_NAMES.HB]: new AircraftType(AIRCRAFT_TYPE_NAMES.HB, 3, true),
    [AIRCRAFT_TYPE_NAMES.RS]: new AircraftType(AIRCRAFT_TYPE_NAMES.RS, 25),
    [AIRCRAFT_TYPE_NAMES.KYS]: new AircraftType(AIRCRAFT_TYPE_NAMES.KYS, 25),
    [AIRCRAFT_TYPE_NAMES.ROS]: new AircraftType(AIRCRAFT_TYPE_NAMES.ROS, 25),
    [AIRCRAFT_TYPE_NAMES.RK]: new AircraftType(AIRCRAFT_TYPE_NAMES.RK, 3, true),
    [AIRCRAFT_TYPE_NAMES.KT]: new AircraftType(AIRCRAFT_TYPE_NAMES.KT, 3, true),
    [AIRCRAFT_TYPE_NAMES.ST]: new AircraftType(AIRCRAFT_TYPE_NAMES.ST, 3, true),
    [AIRCRAFT_TYPE_NAMES.RT]: new AircraftType(AIRCRAFT_TYPE_NAMES.RT, 3, true)
};

/**
 * @private
 * @name CorrectionValue
 * @class
 * @description 改修による補正値と補正結果を扱うクラス
 */
class CorrectionValue {
    static defaultValue = new CorrectionValue();

    constructor({ correction = 0, 
        correctionFunc = (c, i) => c * i } = {}) {
        this.correction = correction;
        this.correctionFunc = correctionFunc;
    }

    getValue(implement) {
        return this.correctionFunc(this.correction, implement);
    }
}

/**
 * AircraftTypeの名前ではなくAircraftTypeオブジェクトをキーにしたい。
 * Mapを使って表現すれば可能だが，現在のMapは値取得時に渡されたキーを
 * 同値演算子(===)でしか既存のキーと比較できない。
 * 
 * 改修できない機種の場合，改修による補正値は0として扱う。
 */
const CORRECTION_VALUES = {
    [AIRCRAFT_TYPE_NAMES.KS]: new CorrectionValue({ correction: 0.2 }),
    [AIRCRAFT_TYPE_NAMES.BS]: new CorrectionValue({ correction: 0.25 }),
    [AIRCRAFT_TYPE_NAMES.SS]: new CorrectionValue({ correction: 0.2 }),
    [AIRCRAFT_TYPE_NAMES.KYS]: new CorrectionValue({ correction: 0.2 }),
    [AIRCRAFT_TYPE_NAMES.RS]: new CorrectionValue({ correction: 0.2 }),
    [AIRCRAFT_TYPE_NAMES.RK]: new CorrectionValue({ 
        correction: 0.5,
        correctionFunc: (c, i) => c * Math.sqrt(i)
    })
};

/**
 * 偵察機補正関数群
 * TODO: 複雑化してきたので整理したい。
 */
const scoutingRevisionFuncs = {
    // 艦上偵察機
    [AIRCRAFT_TYPE_NAMES.KT](aircraft, mode) {
        if (mode === MASTERYMODE.SOTRIE) {
            return 1;
        } else if (mode === MASTERYMODE.AIRDEFENCE) {
            if (aircraft.search >= 9) {
                return 1.3;
            } else {
                return 1.2;
            }
        }
        return 1;
    },
    // 陸上偵察機
    [AIRCRAFT_TYPE_NAMES.RT](aircraft, mode) {
        if (mode === MASTERYMODE.SOTRIE) {
            if (aircraft.search >= 9) {
                return 1.18;
            } else {
                return 1.15;
            }
        } else if (mode === MASTERYMODE.AIRDEFENCE) {
            // 今のところ防空時の陸偵補正は索敵値によらず一律同値としている。
            return 1.18;
        }
        return 1;
    },
    // 水上偵察機・大型飛行艇
    [AIRCRAFT_TYPE_NAMES.ST](aircraft, mode) {
        if (mode === MASTERYMODE.SOTRIE) {
            return 1;
        } else if (mode === MASTERYMODE.AIRDEFENCE) {
            if (aircraft.search >= 9) {
                return 1.16;
            } else if (aircraft.search >= 8) {
                return 1.13;
            } else {
                return 1.1;
            }
        }
        return 1;
    }
};

/**
 * 改修による制空値の補正がない機種は補正値0として扱われる。
 */
const getCorrectionValue = aircraftTypeName => {
    if (aircraftTypeName in CORRECTION_VALUES) {
        return CORRECTION_VALUES[aircraftTypeName];
    } else {
        // 補正なし(艦攻、水爆など)
        return CorrectionValue.defaultValue;
    }
};

const getSkillBonus = aircraft => {
    return aircraft.type.bonus;
};

const getValueByImprovement = aircraft => {
    const cv = getCorrectionValue(aircraft.type.name);
    return cv.getValue(aircraft.improvement);
};

class Aircraft {
    /**
     * Parameter Context Matchingのデフォルト値を[]や{}の右辺に書くことができる。
     */
    constructor({
        name,
        type,
        ack = 0, //対空
        intercept = 0, //迎撃
        antibomb = 0, //対爆
        search = 0, //索敵
        skill = 7, //内部熟練度
        improvement = IMPROVEMENT_VALUES.DEFAULT } = {}) {
        this.name = name;
        this.type = type;
        this.ack = ack;
        this.intercept = intercept;
        this.antibomb = antibomb;
        this.search = search;
        this.skill = skill;
        this.improvement = improvement;
    }

    /**
     * Function文をここに定義することはできない。 
     */
    //function fail(){}

    improve(value) {
        let impValue = parseInt(value);

        /**
         * Number.isNaNはグローバル関数のisNaNと異なり暗黙の型変換を行わない。
         * 引数の型がnumberでなければ常にfalseを返す。
         */
        if (Number.isNaN(value)) {
            impValue = IMPROVEMENT_VALUES.DEFAULT;
        } else if (impValue < IMPROVEMENT_VALUES.MIN) {
            impValue = IMPROVEMENT_VALUES.MIN;
        } else if (IMPROVEMENT_VALUES.MAX < impValue) {
            impValue = IMPROVEMENT_VALUES.MAX;
        } else {
            /* 範囲内の値はそのまま使用する。 */
        }

        this.improvement = impValue;
    }

    toString() {
        const s = [
            `name=${this.name}`,
            `ack=${this.ack}`,
            `intercept=${this.intercept}`,
            `antibomb=${this.antibomb}`,
            `search=${this.search}`,
            `skill=${this.skill}`,
            `improvement=${this.improvement}`
        ];

        return s.join(", ");
    }
}

const getAircraftType = typeName => AIRCRAFT_TYPES[typeName];

const AIRCRAFTS_FACTORY = {};

const setAircraftMaker = acData => {
    AIRCRAFTS_FACTORY[acData.name] = () => new Aircraft({
        name: acData.name,
        type: getAircraftType(AIRCRAFT_TYPE_NAMES[acData.type]),
        ack: acData.ack,
        intercept: acData.intercept,
        antibomb: acData.antibomb,
        search: acData.search,
        skill: acData.skill,
        improvement: acData.improvement
    });
};

const toAircraftsJSON = () => {
    let result = [];

    for (let name in AIRCRAFTS_FACTORY) {
        const ac = AIRCRAFTS_FACTORY[name]();
        result.push("\"" + ac.name + "\":" + JSON.stringify(ac));
    }

    return "{" + result.join(",") + "}";
};

class Slot {
    constructor(size, noSkillBonus = false) {
        this.size = size || 0;
        this.aircraft = null;
        this.noSkillBonus = noSkillBonus;
    }

    toString() {
        const msg = [
            `size=${this.size}`,
            `{${this.aircraft || "未装備"}}`,
            `熟練度ボーナス=${this.noSkillBonus ? "なし" : "あり"}`
        ];
        return msg.join(",");
    }

    // ここでtoJSONが定義されていなければ呼び出している箇所でエラーとなる。
    // ObjectにtoJSONは定義されていないので
    // toStringのように自動で呼び出されたりはしない。
    toJSON() {
        // Safariでエラーになる。(TPはOK)
        //return {...this};
        return {
            size: this.size,
            aircraft: this.aircraft,
            noSkillBonus: this.noSkillBonus
        };
    }
}

class InvalidSlotError extends Error {
    constructor(slotNo) {
        this.slotNo = slotNo;
    }

    get message() {
        return "Invalid slot number : " + this.slotNo;
    }
}

const MASTERYMODE = {
    SOTRIE: "sortie",
    AIRDEFENCE: "airDefence"
};

/**
 * @name calculateMasteryFuncs
 * @description 1スロットの制空値計算を行う関数群です。各モードごとに定義されています。
 */
const calculateMasteryFuncs = {
    [MASTERYMODE.SOTRIE]({ ac, slot, noSkillBonus = false } = {}) {
        const ack = ac.ack + getValueByImprovement(ac);
        const skillBonus = noSkillBonus ? 0 : getSkillBonus(ac);
        const mastery = (ack + (ac.intercept * 1.5)) *
            Math.sqrt(slot.size) + skillBonus;
        return parseInt(mastery);
    },
    [MASTERYMODE.AIRDEFENCE]({ ac, slot, noSkillBonus = false } = {}) {
        const ack = ac.ack + getValueByImprovement(ac);
        const skillBonus = noSkillBonus ? 0 : getSkillBonus(ac);
        const mastery = (ack + ac.intercept + (ac.antibomb * 2)) *
            Math.sqrt(slot.size) + skillBonus;
        return parseInt(mastery);
    }
};

/**
 * @name getHighAltitudeRevision
 * @function
 * @param {Array} 航空機を保持した艦船や基地の配列
 * @returns {Number} 高高度迎撃機の配備数に基づいて得られた補正値
 * @description 高高度迎撃機の配備数に基づく補正値を調べて返します。
 */
const getHighAltitudeRevision = (ships = []) => {
    const rosSize = ships.map(ship => ship.getRocketAircrafts())
        .reduce((acc, current) => acc.concat(current), [])
        .length;

    switch (rosSize) {
        case 0:
            return 0.5;
        case 1:
            return 0.8;
        case 2:
            return 1.1;
        default:
            return 1.2;
    }
};

/**
 * TODO:
 * 基地航空隊でも使うクラスなのでShipは不適当。
 */
class Ship {
    constructor(name, slotComposition, airbase) {
        this.name = name;
        this.slots = new Map([...slotComposition].map((size, idx) => {
            return [idx + 1, new Slot(size)];
        }));
        this.airbase = airbase;
    }

    get slotSize() {
        return this.slots.size;
    }

    getSlot(slotNo) {
        if (this.slots.has(slotNo)) {
            return this.slots.get(slotNo);
        } else {
            throw new InvalidSlotError(slotNo);
        }
    }

    setSlot(slotNo, slot) {
        if (this.slots.has(slotNo)) {
            this.slots.set(slotNo, slot);
        } else {
            throw new InvalidSlotError(slotNo);
        }
    }

    getAircraft(slotNo) {
        const slot = this.getSlot(slotNo);
        return slot.aircraft;
    }

    setAircraft(slotNo, aircraft) {
        const slot = this.getSlot(slotNo);
        slot.aircraft = aircraft;
        this.setSlot(slotNo, slot);
    }

    getNoSkillBonus(slotNo) {
        const slot = this.getSlot(slotNo);
        return slot.noSkillBonus;
    }

    setNoSkillBonus(slotNo, noSkillBonus = false) {
        const slot = this.getSlot(slotNo);
        slot.noSkillBonus = noSkillBonus;
        this.setSlot(slotNo, slot);
    }

    removeAircraft(slotNo) {
        this.setAircraft(slotNo, null);
    }

    getMasteryOneSlot({ slotNo, mode = MASTERYMODE.SOTRIE } = {}) {
        if (this.slots.has(slotNo)) {
            const ac = this.getAircraft(slotNo);
            if (ac) {
                const slot = this.getSlot(slotNo);
                const noSkillBonus = this.getNoSkillBonus(slotNo);
                const func = calculateMasteryFuncs[mode];
                if (typeof func === "function") {
                    return func({ ac, slot, noSkillBonus });
                } else {
                    throw new Error(`Unsupported mastery mode: ${mode}`);
                }
            } else {
                return 0;
            }
        } else {
            return 0;
        }
    }

    collectAircrafts(aircraftType) {
        const predicate = slot => {
            if (!slot.aircraft) {
                return false;
            }
            const typeName = slot.aircraft.type.name;
            return typeName === aircraftType;
        };

        return Array.from(this.slots.values())
            .filter(predicate)
            .map(slot => slot.aircraft);
    }

    // TODO: collectAircraftsを使うように修正する。
    getSearchAircrafts() {
        const isSearch = slot => {
            if (!slot.aircraft) {
                return false;
            }
            const typeName = slot.aircraft.type.name;
            return typeName === AIRCRAFT_TYPE_NAMES.KT ||
                typeName === AIRCRAFT_TYPE_NAMES.ST ||
                typeName === AIRCRAFT_TYPE_NAMES.RT;
        };

        return Array.from(this.slots.values())
            .filter(isSearch)
            .map(slot => slot.aircraft);
    }

    getRocketAircrafts() {
        return this.collectAircrafts(AIRCRAFT_TYPE_NAMES.ROS);
    }

    /**
     * @param {String} mode 出撃か防空かを示す文字列
     * @description 偵察機補正値を返します。
     */
    getScountingRevision(mode) {
        const searchAcs = this.getSearchAircrafts();

        const r = searchAcs.map(ac => {
            const revFunc = scoutingRevisionFuncs[ac.type.name];
            return revFunc(ac, mode);
        }).reduce((acc, current) => acc * current, 1);

        return r;
    }

    getMastery(mode) {
        const scountRev = this.getScountingRevision(mode);
        const masteries = [...this.slots.keys()]
            .map(slotNo => {
                const mastery = this.getMasteryOneSlot({ slotNo, mode });
                if (this.airbase) {
                    return parseInt(mastery * scountRev);
                } else {
                    return parseInt(mastery);
                }
            });

        return [...masteries].reduce((a, b) => a + b, 0);
    }

    toString() {
        const s = [this.name].concat([...this.slots.entries()].map(value => {
            const [slotNo, slot] = value;
            return `slot[${slotNo}]:${slot}`;
        }));

        return s.join("\n");
    }

    toJSON() {
        // Safariでエラーになる。(TPはOK)
        //const clonedObj = {...this};
        const clonedObj = Object.assign({}, this);
        const slots = {};
        for (let [key, value] of clonedObj.slots) {
            slots[key] = value.toJSON();
        }
        clonedObj.slots = slots;
        return clonedObj;
    }
}

class NoNameShip extends Ship {
    constructor() {
        super("", []);
    }

    setSlot() {
        // NoNameShipのスロットは空の状態から変更させない。
    }

    getMastery() {
        return 0;
    }
}

class Fleet {
    constructor(ships = []) {
        this.ships = ships;
    }

    getMastery({mode, highAltitude}) {
        const rev = highAltitude ? getHighAltitudeRevision(this.ships) : 1;
        const m = this.ships.map(ship => ship.getMastery(mode))
            .reduce((acc, current) => acc + current, 0);
        return parseInt(m * rev);
    }

    toString() {
        return this.ships.map(ship => ship.toString())
            .join(',');
    }

    toJSON() {
        return this.ships.map(ship => ship.toJSON());
    }
}

const SHIPS = {};

const getShipNames = () => Object.keys(SHIPS);

const setShipMaker = shipData => {
    SHIPS[shipData.name] = () =>
        new Ship(shipData.name, shipData.slotComposition, shipData.airbase);
};

const toShipsJSON = () => {
    let res = [];

    for (let name in SHIPS) {
        res.push("\"" + name + "\":" + JSON.stringify(SHIPS[name]()));
    }

    return "{" + res.join(",") + "}";
};

const getShip = name => {
    if (name in SHIPS) {
        return SHIPS[name]();
    } else {
        return new NoNameShip();
    }
};

const makeAircraft = (name, type, ack) => {
    return new Aircraft({ name, type, ack });
};

const testCalculateMasteryCaseSortie = () => {
    console.log("***** 出撃テスト *****");
    const ship1 = new Ship("ag", [20, 20, 32, 10]);

    ship1.setAircraft(1, makeAircraft("rp", getAircraftType(AIRCRAFT_TYPE_NAMES.KS), 10));
    ship1.setAircraft(2, makeAircraft("rp601", getAircraftType(AIRCRAFT_TYPE_NAMES.KS), 11));
    ship1.setAircraft(3, makeAircraft("rpk", getAircraftType(AIRCRAFT_TYPE_NAMES.KS), 12));
    ship1.setAircraft(4, makeAircraft("z62i", getAircraftType(AIRCRAFT_TYPE_NAMES.KB), 7));
    ship1.setNoSkillBonus(4, true);

    console.log(ship1.toString());
    console.log(ship1.getMastery());

    const ship2 = new Ship("kg", [20, 20, 46, 12]);

    ship2.setAircraft(1, makeAircraft("rp", getAircraftType(AIRCRAFT_TYPE_NAMES.KS), 10));
    ship2.setAircraft(2, makeAircraft("rp601", getAircraftType(AIRCRAFT_TYPE_NAMES.KS), 11));
    const z53i = makeAircraft("z53i", getAircraftType(AIRCRAFT_TYPE_NAMES.KS), 12);
    z53i.improve(5);
    ship2.setAircraft(3, z53i);
    const z62i = makeAircraft("z62i", getAircraftType(AIRCRAFT_TYPE_NAMES.KB), 7);
    z62i.improve(5);
    ship2.setAircraft(4, z62i);
    ship2.setNoSkillBonus(4, true);

    console.log(ship2.toString());
    console.log(ship2.getMastery());

    console.log(JSON.stringify(ship1));
    console.log(JSON.stringify(ship2));
};

const testCalculateMasteryCaseAirDefence = () => {
    console.log("***** 防空テスト *****");
    const base1 = new Ship("no1base", [4, 18, 18, 18], true);
    base1.setAircraft(1, new Aircraft({
        "name": "彩雲",
        "type": getAircraftType(AIRCRAFT_TYPE_NAMES.KT),
        "search": 9
    }));
    base1.setAircraft(2, new Aircraft({
        "name": "一式戦 隼Ⅱ型",
        "type": getAircraftType(AIRCRAFT_TYPE_NAMES.RS),
        "ack": 6,
        "intercept": 2
    }));
    base1.setAircraft(3, new Aircraft({
        "name": "雷電",
        "type": getAircraftType(AIRCRAFT_TYPE_NAMES.KYS),
        "ack": 6,
        "intercept": 2,
        "antibomb": 5
    }));
    base1.setAircraft(4, new Aircraft({
        "name": "三式戦 飛燕",
        "type": getAircraftType(AIRCRAFT_TYPE_NAMES.RS),
        "ack": 8,
        "intercept": 3,
        "antibomb": 1
    }));
    const mode = "airDefence";
    console.log(base1.toString());
    console.log(base1.getMastery(mode));
    console.log(JSON.stringify(base1));
};

const testCalculateMasteryCaseHighAltitude = () => {
    console.log("***** 防空テスト(高高度迎撃) *****");
    const airbase = new Ship("高高度迎撃基地航空隊1", [18, 18, 18, 18], true);
    airbase.setAircraft(1, new Aircraft({
        "name": "試製秋水",
        "type": getAircraftType(AIRCRAFT_TYPE_NAMES.ROS),
        "ack": 2,
        'antibomb': 8
    }));
    airbase.setAircraft(2, new Aircraft({
        "name": "Me163B",
        "type": getAircraftType(AIRCRAFT_TYPE_NAMES.ROS),
        "ack": 2,
        'antibomb': 9
    }));
    airbase.setAircraft(3, new Aircraft({
        "name": "秋水",
        "type": getAircraftType(AIRCRAFT_TYPE_NAMES.ROS),
        "ack": 3,
        'antibomb': 9
    }));
    airbase.setAircraft(4, new Aircraft({
        "name": "烈風改(三五二空/熟練)",
        "type": getAircraftType(AIRCRAFT_TYPE_NAMES.KYS),
        "ack": 11,
        "intercept": 3,
        "antibomb": 7
    }));
    const mode = "airDefence";
    const fleet = new Fleet([airbase]);
    console.log(fleet.toString());
    console.log(fleet.getMastery({mode, highAltitude: true}));
    console.log(JSON.stringify(fleet));
};

const testOneCompanyMastery = () => {
    console.log("***** 防空テスト(中隊1つ) *****");
    const airbase = new Ship("中隊1つの防空時制空値テスト", [4, 18, 18, 18], true);
    airbase.setAircraft(2, new Aircraft({
        "name": "紫電改(三四三空)戦闘301",
        "type": getAircraftType(AIRCRAFT_TYPE_NAMES.KYS),
		"ack": 11,
		"intercept": 4,
		"antibomb": 2
    }));
    const mode = "airDefence";
    const fleet = new Fleet([airbase]);
    console.log(fleet.toString());
    console.log(fleet.getMastery({mode, highAltitude: false}));
    console.log(JSON.stringify(fleet));
};

const testCalculateMastery = () => {
    testCalculateMasteryCaseSortie();
    testCalculateMasteryCaseAirDefence();
    testCalculateMasteryCaseHighAltitude();
    testOneCompanyMastery();
};

//testCalculateMastery();

const easycalculator = {
    getShipNames,
    getShip,
    Fleet,
    AIRCRAFTS_FACTORY,
    IMPROVEMENT_VALUES,
    setShipMaker,
    setAircraftMaker,
    NoNameShip
};

export default easycalculator;
