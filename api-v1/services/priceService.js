const volatility = process.env.volatility;
const interestrate = process.env.interestrate;
const riskfreerate = process.env.riskfreerate;

const priceService = {
  bs(S, K, T) {
    // https://quant.stackexchange.com/questions/40918/black-scholes-for-binary-option
    //const S = 21384;
    //const K = 21344;
    const v = 1.2;
    const r = 0.0;
    const rd = 0.5;
    //const T = 0.000003;

    const d2 = (Math.log(S / K) + (r - rd * v ** 2) * T) / (v * Math.sqrt(T));
    let c = Math.exp(-r * T) * priceService.normalcdf(0, 1, d2);
    let p = Math.exp(-r * T) * priceService.normalcdf(0, 1, -d2);
    c = isNaN(c) ? 0 : c;
    p = isNaN(p) ? 0 : p;
    return { c, p };
  },
  // https://stackoverflow.com/questions/5259421/cumulative-distribution-function-in-javascript
  normalcdf(mean, sigma, to) {
    const z = (to - mean) / Math.sqrt(2 * sigma * sigma);
    const t = 1 / (1 + 0.3275911 * Math.abs(z));
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const erf = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
    let sign = 1;
    if (z < 0) {
      sign = -1;
    }
    return (1 / 2) * (1 + sign * erf);
  },
};

module.exports = priceService;
