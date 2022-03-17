const request = require("supertest");
const app = require("../app");
const axios = require('axios');
const lndService = require("../api-v1/services/lndService");

describe('/dlc', () => {
  let oracle_info;
  let event0;
  let event1;
  let req0;
  let req1;
  let events;
  let invoice;
  let hashX;
  const ORACLE_SERVER = process.env.ORACLE_SERVER;
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
    event0 = await axios(options);
    event0 = event0.data;
    options.url = ORACLE_SERVER + '/events/' + events[1];
    event1 = await axios(options);
    event1 = event1.data;
    //console.log(event);
    req0 = {
      eventName: event0.eventName,
      m: event0.outcomes[0],
      R: event0.nonces[0],
      P: oracle_info.pubkey,
      invoice: invoice.payment_request,
    }
    req1 = {
      eventName: event1.eventName,
      m: event1.outcomes[0],
      R: event1.nonces[0],
      P: oracle_info.pubkey,
      invoice: invoice.payment_request,
    }
    //console.log(req);
  });

  afterAll(async () => {
  });

  it('should return an error due to the event is not found', async () => {
    const req = {
      eventName: 'hoge',
      m: 'm',
      R: 'R',
      P: 'P',
      invoice: 'invoice',
    }
    const res = await request(app)
      .post('/dlc')
      .send(req);
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      status: 'error',
      message: expect.anything(),
    });
  });

  it('should return an error due to the oracle pubkey is invalid', async () => {
    const req = {
      eventName: event0.eventName,
      m: event0.outcomes[0],
      R: event0.nonces[0],
      P: 'oracle_pubkey_dummy',
      invoice: 'invoice',
    }
    const res = await request(app)
      .post('/dlc')
      .send(req);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      status: 'error',
      message: 'This Oracle pubkey is invalid.',
    });
  });

  it('should return an error due to the event is expired', async () => {
    const res = await request(app)
      .post('/dlc')
      .send(req1);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      status: 'error',
      message: 'This event is invalid.',
    });
  });

  it('should create a contract', async () => {
    const res = await request(app)
      .post('/dlc')
      .send(req0);
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