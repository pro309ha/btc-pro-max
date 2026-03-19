const proxy = "https://api.allorigins.win/raw?url=";

// fetch data
async function getData(symbol, interval) {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=200`;
    const res = await fetch(proxy + encodeURIComponent(url));
    const data = await res.json();
    return data;
}

// EMA
function ema(data, period) {
    let closes = data.map(c => parseFloat(c[4]));
    let k = 2 / (period + 1);
    let emaArr = [];

    let sum = 0;
    for (let i = 0; i < period; i++) sum += closes[i];
    emaArr[period - 1] = sum / period;

    for (let i = period; i < closes.length; i++) {
        emaArr[i] = closes[i] * k + emaArr[i - 1] * (1 - k);
    }

    return emaArr;
}

// RSI
function rsi(data, period = 14) {
    let closes = data.map(c => parseFloat(c[4]));
    let gains = 0, losses = 0;

    for (let i = 1; i <= period; i++) {
        let diff = closes[i] - closes[i - 1];
        if (diff >= 0) gains += diff;
        else losses -= diff;
    }

    let rs = gains / losses;
    return 100 - (100 / (1 + rs));
}

// Candle
function candleType(data) {
    let last = data[data.length - 1];
    return parseFloat(last[4]) > parseFloat(last[1]) ? "BULL" : "BEAR";
}

// Trend
function trend(data) {
    let e50 = ema(data, 50);
    let e200 = ema(data, 200);

    let last50 = e50[e50.length - 1];
    let last200 = e200[e200.length - 1];

    if (last50 > last200) return "UP";
    if (last50 < last200) return "DOWN";
    return "SIDE";
}

// SIGNAL LOGIC (PRO MAX)
function getSignal(t5, t15, r, candle) {
    if (t5 === "UP" && t15 === "UP" && r > 50 && r < 65 && candle === "BULL") {
        return ["STRONG BUY 🚀", "buy"];
    }

    if (t5 === "DOWN" && t15 === "DOWN" && r > 35 && r < 50 && candle === "BEAR") {
        return ["STRONG SELL 🔻", "sell"];
    }

    return ["WAIT ⏳", "wait"];
}

// update symbol
async function updateSymbol(symbol, priceId, signalId) {
    try {
        let d5 = await getData(symbol, "5m");
        let d15 = await getData(symbol, "15m");

        let t5 = trend(d5);
        let t15 = trend(d15);
        let r = rsi(d5);
        let candle = candleType(d5);

        let [text, cls] = getSignal(t5, t15, r, candle);

        document.getElementById(priceId).innerText =
            "Price: $" + parseFloat(d5[d5.length - 1][4]);

        let el = document.getElementById(signalId);
        el.innerText = text;
        el.className = "signal " + cls;

    } catch (e) {
        document.getElementById(signalId).innerText = "ERROR ⚠️";
    }
}

// run all
function run() {
    updateSymbol("BTCUSDT", "price_btc", "signal_btc");
    updateSymbol("ETHUSDT", "price_eth", "signal_eth");
    updateSymbol("BTCUSDT", "price_gold", "signal_gold");
}

setInterval(run, 10000);
run();
