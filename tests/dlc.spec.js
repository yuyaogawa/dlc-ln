const request = require("supertest");
const app = require("../app");
const axios = require('axios');
const lndService = require("../api-v1/services/lndService");

describe('/dlc', () => {
  let oracle_info;
  let event;
  let events;
  let eventName;
  let m;
  let R;
  let P;
  let invoice;
  let hashX;
  let req;
  const ORACLE_SERVER = process.env.ORACLE_SERVER;
  const oracle_list = [process.env.ORACLE_PUBKEY];
  let options = {
    method: 'GET',
    url: ORACLE_SERVER,
  };
  beforeAll(async () => {

    invoice = await lndService.addInvoice(1000);
    //console.log(invoice.payment_request);
    options.url = ORACLE_SERVER + '/info';
    oracle_info = await axios(options);
    oracle_info = oracle_info.data;
    //console.log(oracle_info)
    options.url = ORACLE_SERVER + '/events';
    events = await axios(options);
    events = events.data;
    //console.log(events);
    options.url = ORACLE_SERVER + '/events/' + events[0];
    event = await axios(options);
    event = event.data;
    //console.log(event);
    req = {
      eventName: event.eventName,
      m: event.outcomes[0],
      R: event.nonces[0],
      P: oracle_info.pubkey,
      invoice: invoice.payment_request,
    }
    //console.log(req);
  });

  afterAll(async () => {
  });

  it('should create a contract', async () => {
    const res = await request(app)
      .post('/dlc')
      .send(req);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('hashX');
    hashX = res.body.hashX;
    console.log(hashX)
  });

  it('should get contract data by hash x', async () => {
    const res = await request(app)
      .get('/dlc?hashX=' + hashX)
      .send();
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('holdinvoiceHash');
    expect(res.body).toHaveProperty('encX');
  });

});