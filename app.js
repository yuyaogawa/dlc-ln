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
      url: "http://localhost:3000/api-docs",
    },
  })
);
// Redoc UI
app.use(
  '/docs',
  redoc({
    title: 'API Docs',
    specUrl: 'http://localhost:3000/api-docs'
  })
);

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

module.exports = app;
