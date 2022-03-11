const dlcService = require('../services/dlcService');
const lndService = require('../services/lndService');
const crypto = require('crypto');
const axios = require('axios');
require('dotenv').config();
const Buffer = require('safe-buffer').Buffer;
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PREMIUM = process.env.PREMIUM
const PAYOUT = process.env.PAYOUT
//const EXPIRY = 3600; // Default is 3600(1hour)
const DIFFTIME = 60; // seconds
let EXPIRY;
const CLTV_EXPIRY = 144; // Minimun is 18
const ORACLE_SERVER = process.env.ORACLE_SERVER;
const oracle_list = [process.env.ORACLE_PUBKEY];
let options = {
  method: 'GET',
  url: ORACLE_SERVER,
};

module.exports = function () {
  const operations = {
    GET,
    PUT,
    POST,
  };
  async function GET(req, res, next) {
    const hashX = req.query.hashX;
    const contract = await prisma.contract.findFirst({
      where: { hashX: hashX },
    });
    if (!contract) {
      const error = {
        status: 'error',
        message: 'This hashX is not found.',
      };
      return res.status(200).json(error);
    }
    res.status(200).json(contract);
  }
  async function POST(req, res, next) {
    const eventName = req.body.eventName;
    const m = req.body.m;
    const R = req.body.R;
    const P = req.body.P;
    const invoice = req.body.invoice;
    const currenttime = new Date().getTime();
    console.log(currenttime);

    // Check if the requested event is valid and still opened
    options.url = ORACLE_SERVER + '/events/' + eventName;
    const event = await axios(options);
    console.log(event);
    if (!event.data) {
      const error = {
        status: 'error',
        message: 'This event is invalid.',
      };
      return res.status(200).json(error);
    }
    if (
      event.data.nonces != R ||
      !event.data.outcomes.includes(m) ||
      event.data.maturationTimeEpoch * 1000 < currenttime
    ) {
      const error = {
        status: 'error',
        message: 'This event is invalid.',
      };
      return res.status(200).json(error);
    }

    if (!oracle_list.includes(P)) {
      const error = {
        status: 'error',
        message: 'This Oracle pubkey is invalid.',
      };
      return res.status(200).json(error);
    }

    let invoice_req;
    try {
      invoice_req = await lndService.decodePayReq(invoice);
    } catch (err) {
      const error = {
        status: 'error',
        message: 'Invoice is invalid.',
      };
      return res.status(400).json(error);
    }

    if (invoice_req.num_msat !== PREMIUM) {
      const error = {
        status: 'error',
        message: 'Amount is invalid.',
      };
      return res.status(200).json(error);
    }
    const payment_hash = await dlcService.genHash(crypto.randomBytes(32));
    const route = await lndService.prePayProbe(
      invoice_req.destination,
      invoice_req.num_satoshis,
      invoice_req.cltv_expiry,
      Buffer.from(payment_hash, 'hex'),
    );
    if (route === undefined) {
      const error = {
        status: 'error',
        message: 'The destination is not reachable.',
      };
      return res.status(200).json(error);
    }

    const sGx = await dlcService.messageCommitment(m, R, P);
    const x = crypto.randomBytes(32);
    const hashX = await dlcService.genHash(x);
    const Ex = await dlcService.encrypto(x, sGx);
    const data = Buffer.concat([Ex.iv, Ex.ephemPublicKey, Ex.ciphertext, Ex.mac]).toString('hex');

    // expiry and cltv_expiry must be longer than Orcale expiration
    EXPIRY = event.data.maturationTimeEpoch - currenttime / 1000 - DIFFTIME;
    console.log(EXPIRY);
    if (EXPIRY < 0) {
      const error = {
        status: 'error',
        message: 'Expiration time has passed',
      };
      return res.status(200).json(error);
    }
    const holdinvoice = await lndService.addHoldInvoice(
      'eventName: ' + eventName,
      Buffer.from(hashX, 'hex'),
      PAYOUT,
      EXPIRY,
      CLTV_EXPIRY,
    );
    const pay_req = await lndService.decodePayReq(holdinvoice.payment_request);

    if (holdinvoice !== undefined) {
      try {
        const contract = await prisma.contract.create({
          data: {
            invoice: invoice,
            holdinvoiceHash: pay_req.payment_hash,
            addIndex: holdinvoice.add_index,
            eventName: eventName,
            m: m,
            R: R,
            P: P,
            sG: sGx,
            hashX: hashX,
            encX: data,
          },
        });
      } catch (err) {
        console.log(err);
        const error = {
          status: 'error',
          message: 'Internal Server Error',
        };
        return res.status(500).json(error);
      }
    } else {
      const error = {
        status: 'error',
        message: 'Internal Server Error',
      };
      return res.status(500).json(error);
    }

    const result = {
      eventName: eventName,
      m: m,
      R: R,
      P: P,
      sG: sGx,
      x: 'THIS_VALUE_IS_SAFEGUARDED',
      hashX,
      Ex: data,
      invoice: holdinvoice.payment_request,
    };

    res.status(200).json(result);
  }
  async function PUT(req, res, next) {
    const data = req.body.Ex;
    const s = req.body.s;
    const Ex = {
      iv: Buffer.from(data.substring(0, 32), 'hex'),
      ephemPublicKey: Buffer.from(data.substring(32, 162), 'hex'),
      ciphertext: Buffer.from(data.substring(162, data.length - 64), 'hex'),
      mac: Buffer.from(data.slice(data.length - 64), 'hex'),
    };

    try {
      const x = await dlcService.decrypto(Ex, s);
      res.status(200).json(x.toString('hex'));
    } catch (err) {
      res.status(400).json(err);
    }
  }
  // NOTE: We could also use a YAML string here.
  GET.apiDoc = {
    summary: 'Get data',
    operationId: 'GetData',
    parameters: [
      {
        in: 'query',
        name: 'hashX',
        required: true,
        schema: { $ref: '#/components/schemas/hashX' },
      },
    ],
    responses: {
      200: {
        description: 'Return data',
      },
    },
  };
  POST.apiDoc = {
    summary: 'Create a contract',
    operationId: 'CreateContract',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/CreateContract' },
        },
      },
    },
    responses: {
      200: {
        description: 'Encrypted preimage and hodlinvoice',
      },
    },
  };
  PUT.apiDoc = {
    summary: 'Decrypt data',
    operationId: 'DecryptData',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/DecryptData' },
        },
      },
    },
    responses: {
      200: {
        description: 'Decrypted data',
      },
    },
  };
  return operations;
};
