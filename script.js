// PRO MAX Exness Script (Proxy Required)

// Backend proxy URL setup
// Replace this URL with your own backend proxy that fetches Exness candle data
const backendProxy = "https://YOUR_PROXY_URL/fetch_exness_candles?";

// Symbols
const symbols = [
  { symbol: "BTCUSDm", priceId: "price_btc", signalId: "signal_btc" },
  { symbol: "ETHUSDm", priceId: "price_eth", signalId: "signal_eth" },
  { symbol: "XAUUSD", priceId: "price_gold", signalId: "signal_gold" }
];

// Fetch candle data via proxy
async function getData(symbol, interval) {
    try {
        const res = await fetch(`${backendProxy}symbol=${symbol}&interval=${interval}&limit=200`);
        if(!res.ok) throw new Error("Network error");
        const data = await res.json(); // Expected: array of candles [open, high, low, close, volume, timestamp]
        return data;
    } catch(e) {
        console.error(`Fetch failed for ${symbol} ${interval}`, e);
        return null;
    }
}

// EMA calculation
function ema(data, period) {
    const closes = data.map(c => parseFloat(c[3])); // assuming index 3 is close price
    const k = 2/(period+1);
    let emaArr = [];
    let sum = 0;
    for(let i=0;i<period;i++) sum += closes[i];
    emaArr[period-1] = sum/period;
    for(let i=period;i<closes.length;i++){
        emaArr[i] = closes[i]*k + emaArr[i-1]*(1-k);
    }
    return emaArr;
}

// RSI calculation
function rsi(data, period=14){
    const closes = data.map(c=>parseFloat(c[3]));
    let gains=0, losses=0;
    for(let i=1;i<=period;i++){
        let diff = closes[i]-closes[i-1];
        if(diff>=0) gains+=diff;
        else losses-=diff;
    }
    const rs = gains/(losses||1);
    return 100 - (100/(1+rs));
}

// Candle type
function candleType(data){
    let last = data[data.length-1];
    return parseFloat(last[3])>parseFloat(last[0])?"BULL":"BEAR"; // close>open
}

// Trend
function trend(data){
    const e50 = ema(data,50);
    const e200 = ema(data,200);
    const last50 = e50[e50.length-1];
    const last200 = e200[e200.length-1];
    if(last50>last200) return "UP";
    if(last50<last200) return "DOWN";
    return "SIDE";
}

// Signal logic
function getSignal(t5,t15,r,candle){
    if(t5==="UP" && t15==="UP" && r>50 && r<65 && candle==="BULL") return ["STRONG BUY 🚀","buy"];
    if(t5==="DOWN" && t15==="DOWN" && r>35 && r<50 && candle==="BEAR") return ["STRONG SELL 🔻","sell"];
    return ["WAIT ⏳","wait"];
}

// Update each symbol
async function updateSymbol(symbolObj){
    const d5 = await getData(symbolObj.symbol,"5m");
    const d15 = await getData(symbolObj.symbol,"15m");
    if(!d5 || !d15){
        document.getElementById(symbolObj.signalId).innerText="ERROR ⚠️";
        document.getElementById(symbolObj.signalId).className="signal error";
        return;
    }

    const t5 = trend(d5);
    const t15 = trend(d15);
    const r = rsi(d5);
    const candle = candleType(d5);

    const [text,cls] = getSignal(t5,t15,r,candle);

    document.getElementById(symbolObj.priceId).innerText="Price: $"+parseFloat(d5[d5.length-1][3]);
    const el = document.getElementById(symbolObj.signalId);
    el.innerText = text;
    el.className = "signal "+cls;
}

// Update all
function updateAll(){
    symbols.forEach(s=>updateSymbol(s));
}

// Auto update every 10 seconds
setInterval(updateAll,10000);
updateAll();
