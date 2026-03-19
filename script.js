// PRO MAX: Proxy-enabled Script for BTC/ETH/Gold Signals

// Use a reliable free proxy
const proxy = "https://api.allorigins.win/raw?url=";

// Fetch candle data from Binance
async function getData(symbol, interval) {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=200`;
    try {
        const res = await fetch(proxy + encodeURIComponent(url));
        if (!res.ok) throw new Error("Network response not OK");
        const data = await res.json();
        return data;
    } catch (e) {
        console.error("Fetch failed for", symbol, interval, e);
        return null;
    }
}

// EMA calculation
function ema(data, period) {
    const closes = data.map(c => parseFloat(c[4]));
    const k = 2 / (period + 1);
    let emaArr = [];
    let sum = 0;
    for (let i = 0; i < period; i++) sum += closes[i];
    emaArr[period - 1] = sum / period;
    for (let i = period; i < closes.length; i++) {
        emaArr[i] = closes[i] * k + emaArr[i - 1] * (1 - k);
    }
    return emaArr;
}

// RSI calculation
function rsi(data, period = 14) {
    const closes = data.map(c => parseFloat(c[4]));
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
        const diff = closes[i] - closes[i - 1];
        if (diff >= 0) gains += diff;
        else losses -= diff;
    }
    const rs = gains / (losses || 1);
    return 100 - (100 / (1 + rs));
}

// Candle type: BULL or BEAR
function candleType(data) {
    const last = data[data.length - 1];
    return parseFloat(last[4]) > parseFloat(last[1]) ? "BULL" : "BEAR";
}

// Determine trend
function trend(data) {
    const e50 = ema(data, 50);
    const e200 = ema(data, 200);
    const last50 = e50[e50.length - 1];
    const last200 = e200[e200.length - 1];
    if (last50 > last200) return "UP";
    if (last50 < last200) return "DOWN";
    return "SIDE";
}

// Determine signal
function getSignal(t5, t15, r, candle) {
    if (t5 === "UP" && t15 === "UP" && r > 50 && r < 65 && candle === "BULL")
        return ["STRONG BUY 🚀", "buy"];
    if (t5 === "DOWN" && t15 === "DOWN" && r > 35 && r < 50 && candle === "BEAR")
        return ["STRONG SELL 🔻", "sell"];
    return ["WAIT ⏳", "wait"];
}

// Update symbol
async function updateSymbol(symbol, priceId, signalId) {
    const d5 = await getData(symbol, "5m");
    const d15 = await getData(symbol, "15m");

    if (!d5 || !d15) {
        document.getElementById(signalId).innerText = "ERROR ⚠️";
        document.getElementById(signalId).className = "signal error";
        return;
    }

    const t5 = trend(d5);
    const t15 = trend(d15);
    const r = rsi(d5);
    const candle = candleType(d5);

    const [text, cls] = getSignal(t5, t15, r, candle);

    document.getElementById(priceId).innerText =
        "Price: $" + parseFloat(d5[d5.length - 1][4]);
    const el = document.getElementById(signalId);
    el.innerText = text;
    el.className = "signal " + cls;
}

// Update all symbols
async function updateAll() {
    updateSymbol("BTCUSDT", "price_btc", "signal_btc");
    updateSymbol("ETHUSDT", "price_eth", "signal_eth");
    updateSymbol("BTCUSDT", "price_gold", "signal_gold"); // proxy for Gold chart
}

// Auto update every 10 seconds
setInterval(updateAll, 10000);
updateAll();
