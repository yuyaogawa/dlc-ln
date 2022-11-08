const express = require('express');
const fs = require('fs');
var initialize = require('express-openapi').initialize;
var swaggerUi = require('swagger-ui-express');
const redoc = require('redoc-express');
const yaml = require('js-yaml');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const v1ApiDoc = yaml.load(fs.readFileSync('./api-v1/api-doc.yml', 'utf-8'));

const app = express();
app.use(cors({
  origin: process.env.FRONTEND_SERVER,
  credentials: true,
  optionsSuccessStatus: 200
}));
initialize({
  app,
  apiDoc: v1ApiDoc,
  paths: './api-v1/paths',
  consumesMiddleware: {
    'application/json': bodyParser.json(),
  }
});

app.use(((err, req, res, next) => {
  res.status(err.status).json(err);
}));

// Swagger UI
app.use(
  "/api-documentation",
  swaggerUi.serve,
  swaggerUi.setup(null, {
    swaggerOptions: {
      url: "/api-docs",
    },
  })
);
// Redoc UI
app.use(
  '/docs',
  redoc({
    title: 'API Docs',
    specUrl: '/api-docs'
  })
);

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

const ORACLE_SERVER = process.env.ORACLE_SERVER;
const BTCUSD_TICKER = process.env.BTCUSD_TICKER;
const PREMIUM_RATE = process.env.PREMIUM_RATE;
const PAYOUT = process.env.PAYOUT;
const axios = require('axios');
const priceService = require('./api-v1/services/priceService');
let currentPrice;
let strikePrice;
setInterval(async () => { 
  try {
    currentPrice = await axios(BTCUSD_TICKER);
  } catch (err){
    console.log(err);
  }
  try {
    strikePrice = await axios(ORACLE_SERVER + '/prices/latest');
  } catch (err){
    console.log(err);
  }
  const currenttime = new Date().getTime();
  const createdAt = Date.parse(strikePrice.data[0].createdAt) + 300 * 1000; // 5 mins
  let expiry = createdAt / 1000 - currenttime / 1000;
  const secondsRemaining = expiry * 0.00000003170979198;
  const {c, p} = priceService.bs(currentPrice.data.last, strikePrice.data[0].strikePrice, secondsRemaining);
  app.locals.secondsRemaining = secondsRemaining;
  app.locals.currentPrice = currentPrice.data.last;
  app.locals.strikePrice = strikePrice.data[0].strikePrice;
  app.locals.c = (c * PAYOUT / 1000 * PREMIUM_RATE).toFixed(0);
  app.locals.p = (p * PAYOUT / 1000 * PREMIUM_RATE).toFixed(0);
}, 3000);

module.exports = app;
