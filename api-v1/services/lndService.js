const dlcService = require('./dlcService');
const crypto = require('crypto');
const fs = require('fs');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const loaderOptions = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
};
const packageDefinition = protoLoader.loadSync(
  [
    './lnd_grpc/proto/lightning.proto',
    './lnd_grpc/proto/invoices.proto',
    './lnd_grpc/proto/router.proto',
  ],
  loaderOptions,
);
require('dotenv').config();
const lnrpc = grpc.loadPackageDefinition(packageDefinition).lnrpc;
const invoicesrpc = grpc.loadPackageDefinition(packageDefinition).invoicesrpc;
const routerrpc = grpc.loadPackageDefinition(packageDefinition).routerrpc;
const macaroon = fs.readFileSync(process.env.LND_GRPC_MACAROON).toString('hex');
process.env.GRPC_SSL_CIPHER_SUITES = 'HIGH+ECDSA';
const lndCert = fs.readFileSync(process.env.LND_GRPC_CERT);
const sslCreds = grpc.credentials.createSsl(lndCert);
const macaroonCreds = grpc.credentials.createFromMetadataGenerator(function (args, callback) {
  const metadata = new grpc.Metadata();
  metadata.add('macaroon', macaroon);
  callback(null, metadata);
});
const creds = grpc.credentials.combineChannelCredentials(sslCreds, macaroonCreds);
const lightning = new lnrpc.Lightning(
  `${process.env.LND_GRPC_ENDPOINT}:${process.env.LND_GRPC_PORT}`,
  creds,
);
const invoices = new invoicesrpc.Invoices(
  `${process.env.LND_GRPC_ENDPOINT}:${process.env.LND_GRPC_PORT}`,
  creds,
);
const router = new routerrpc.Router(
  `${process.env.LND_GRPC_ENDPOINT}:${process.env.LND_GRPC_PORT}`,
  creds,
);

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const lndService = {
  getInfo() {
    const request = {};
    return new Promise((resolve, reject) => {
      lightning.getInfo(request, (error, response) => {
        if (error) {
          return reject(error);
        }
        return resolve(response);
      });
    });
  },
  decodePayReq(pay_req) {
    const request = {
      pay_req,
    };
    return new Promise((resolve, reject) => {
      lightning.decodePayReq(request, (error, response) => {
        if (error) {
          return reject(error);
        }
        return resolve(response);
      });
    });
  },
  addInvoice(value, memo) {
    const request = {
      memo,
      value,
    };
    return new Promise((resolve, reject) => {
      lightning.addInvoice(request, (error, response) => {
        if (error) {
          return reject(error);
        }
        return resolve(response);
      });
    });
  },
  addHoldInvoice(memo, hash, value, expiry, cltv_expiry) {
    const request = {
      memo: memo,
      hash: hash,
      value_msat: value,
      expiry: expiry,
      cltv_expiry: cltv_expiry,
    };
    return new Promise((resolve, reject) => {
      invoices.addHoldInvoice(request, (error, response) => {
        if (error) {
          return reject(error);
        }
        return resolve(response);
      });
    });
  },
  lookupInvoiceV2(payment_hash) {
    const request = {
      payment_hash,
    };
    return new Promise((resolve, reject) => {
      invoices.lookupInvoiceV2(request, (error, response) => {
        if (error) {
          return reject(error);
        }
        return resolve(response);
      });
    });
  },
  cancelInvoice(payment_hash) {
    const request = {
      payment_hash: Buffer.from(payment_hash, 'hex'),
    };
    return new Promise((resolve, reject) => {
      invoices.cancelInvoice(request, (error, response) => {
        if (error) {
          return reject(error);
        }
        return resolve(response);
      });
    });
  },
  settleInvoice(preimage) {
    const request = {
      preimage: Buffer.from(preimage, 'hex'),
    };
    return new Promise((resolve, reject) => {
      invoices.settleInvoice(request, (error, response) => {
        if (error) {
          return reject(error);
        }
        return resolve(response);
      });
    });
  },
  queryRoutes(pub_key, amt, final_cltv_delta, route_hints) {
    const request = {
      pub_key,
      amt,
      final_cltv_delta,
      use_mission_control: true,
      route_hints,
    };
    return new Promise((resolve, reject) => {
      lightning.queryRoutes(request, (error, response) => {
        if (error) {
          return reject(error);
        }
        return resolve(response);
      });
    });
  },
  buildRoute(hop_pubkeys, payment_addr) {
    const request = {
      hop_pubkeys,
      payment_addr,
    };
    return new Promise((resolve, reject) => {
      router.buildRoute(request, (error, response) => {
        if (error) {
          return reject(error);
        }
        return resolve(response);
      });
    });
  },
  sendToRouteV2(payment_hash, route, final_cltv_delta) {
    const request = {
      payment_hash,
      route,
      final_cltv_delta,
    };
    return new Promise((resolve, reject) => {
      router.sendToRouteV2(request, (error, response) => {
        if (error) {
          return reject(error);
        }
        return resolve(response);
      });
    });
  },
  sendPaymentV2(payment_request) {
    const request = {
      payment_request,
      timeout_seconds: 10,
    };
    const call = router.sendPaymentV2(request);
    console.log('dispatchPayment');
    call.on('data', function (response) {
      // A response was received from the server.
      console.log(response);
    });
    call.on('end', function () {
      // The server has closed the stream.
      console.log('The server has closed the stream. [sendPaymentV2]');
    });
  },
  // Customize modules comes below
  // FIXME: subscribeSingleInvoice is currently called from client side.
  // But this should be called from server side. Or current logic is ok
  // if it validates the expiry.
  subscribeSingleInvoice(r_hash, res) {
    const request = {
      r_hash,
    };
    const call = invoices.subscribeSingleInvoice(request);
    console.log('SubscribeSingleInvoice');
    call.on('data', async function (response) {
      // A response was received from the server.
      console.log(response.state);
      if (response.state == 'SETTLED') {
        const contract = await prisma.contract.findFirst({
          where: { addIndex: response.add_index },
          select: {
            id: true,
          },
        });
        try {
          // Update database
          await prisma.contract.update({
            where: { id: contract.id },
            data: { status: 'SETTLED' },
          });
        } catch (err) {
          console.log(err);
        }
      }
      if (response.state == 'ACCEPTED') {
        console.log('Find a contract with add_index:' + response.add_index);
        // Pay premium to the user!
        // Find the corresponding an invoice that was recieved from the user.
        // Then, call payinvoice rpc with the invoice.
        const contract = await prisma.contract.findFirst({
          where: { addIndex: response.add_index },
          select: {
            id: true,
            invoice: true,
            hashX: true,
          },
        });
        console.log(contract);
        // TODO: Check if this payment is accepted before the expiry.
        try {
          const update = await prisma.contract.update({
            where: { id: contract.id },
            data: { status: 'ACCEPTED' },
          });
        } catch (err) {
          console.log(err);
        }
        const invoice = contract.invoice;
        const pay_req = await lndService.decodePayReq(invoice);

        const payment_hash = await dlcService.genHash(crypto.randomBytes(32));
        const route = await lndService.prePayProbe(
          pay_req.destination,
          pay_req.num_satoshis,
          pay_req.cltv_expiry,
          Buffer.from(payment_hash, 'hex'),
          pay_req.route_hints,
        );
        if (route !== undefined) {
          const mpp_record = {
            payment_addr: pay_req.payment_addr,
            total_amt_msat: pay_req.num_msat,
          };
          route.hops[route.hops.length - 1].mpp_record = mpp_record;
          route.hops[route.hops.length - 1].tlv_payload = true;
          //console.log(route.hops);
          try {
            const payment = await lndService.sendToRouteV2(
              Buffer.from(pay_req.payment_hash, 'hex'),
              route,
            );
            console.log(payment.status);
            //console.log(payment.failure);
            console.log('Fin');
            if (payment.status === 'SUCCEEDED') {
              // Update database
              await prisma.contract.update({
                where: { id: contract.id },
                data: { paid: true },
              });
              // Notify to the user that position is opened!
              console.log('Position is opened');
              res.write(
                `data: ${JSON.stringify({ status: 'ok', message: 'Position is opened' })}\n\n`,
              );
              res.end(); // terminates SSE session
            } else {
              // In case payment failed, holdinvoice needs to be canceled.
              console.log('Payment failed, holdinvoice needs to be canceled.[1]');
              const cannceled = await lndService.cancelInvoice(contract.hashX);
              console.log(cannceled);
              res.write(
                `data: ${JSON.stringify({ status: 'ok', message: 'Payment failed[1]' })}\n\n`,
              );
              res.end();
            }
          } catch (err) {
            // Something went wrong so that holdinvoice needs to be canceled.
            // Or just wait until holdinvoice is expired then cancel it.
            console.log(err);
            console.log('Payment failed, holdinvoice needs to be canceled.[2]');
            const cannceled = await lndService.cancelInvoice(contract.hashX);
            console.log(cannceled);
            res.write(
              `data: ${JSON.stringify({ status: 'ok', message: 'Payment failed[2]' })}\n\n`,
            );
            res.end();
          }
        }
      }
    });
    call.on('end', async function () {
      // The server has closed the stream.
      console.log('The server has closed the stream. [subscribeSingleInvoice]');
    });
  },
  async prePayProbe(pub_key, amount, final_cltv_delta, payment_hash, route_hints) {
    const MAX_ROUTES_TO_REQUEST = 10;
    const all_routes = [];
    let num_requested_routes = 0;
    while (true) {
      //console.log(route_hints);
      let routes = await lndService.queryRoutes(pub_key, amount, final_cltv_delta, route_hints);
      routes = routes.routes;
      //console.log(routes[0])
      if (routes == undefined) {
        console.log('Could not find any suitable route ${pub_key}');
        break;
      } else {
        num_requested_routes += 1;
        if (!all_routes.includes(routes[0])) {
          all_routes.push(routes[0]);
          const response = await lndService.sendToRouteV2(payment_hash, routes[0]);
          //console.log(response);
          // 1 : INCORRECT_OR_UNKNOWN_PAYMENT_DETAILS
          // 15: TEMPORARY_CHANNEL_FAILURE
          if (response.failure.code == 'INCORRECT_OR_UNKNOWN_PAYMENT_DETAILS') {
            console.log(response.failure.code);
            console.log('SUCCESS');
            return routes[0];
          } else {
            console.log(response.failure.code);
          }
        }
      }

      if (num_requested_routes >= MAX_ROUTES_TO_REQUEST) {
        console.log('Max probing request attemped');
        break;
      }
    }
  },
};

module.exports = lndService;
