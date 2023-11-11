const dlcService = require('./api-v1/services/dlcService');
const lndService = require('./api-v1/services/lndService');
const axios = require('axios');
let options = {
  method: 'GET',
  url: process.env.ORACLE_SERVER,
};
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const ORACLE_SERVER = process.env.ORACLE_SERVER;

async function main() {
  const events = await prisma.contract.findMany({
    //where: { status: 'OPEN' },
    where: {
      OR: [
        {
          status: {
            contains: 'OPEN',
          },
        },
        {
          status: {
            contains: 'ACCEPTED',
          },
        },
      ],
    },
    select: {
      id: true,
      eventName: true,
      hashX: true,
      encX: true,
    },
  });
  //console.log(events[0].eventName);

  for (const event of events) {
    console.log(event.eventName);
    options.url = ORACLE_SERVER + '/signatures/' + event.eventName;
    const res = await axios(options);
    const signature = res.data.signatures
    console.log(signature);

    options.url = ORACLE_SERVER + '/prices/' + event.eventName;
    const res2 = await axios(options);
    //console.log(res2.data[0])
    const price = res2.data[0]

    // Skep this event if a signature is not yet provided.
    // This event is probably a new valid one.
    if(res.data.status == 'error'){
      console.log(res.data.status)
      console.log("continue for: " + event)
      continue;
    }

    let x;
    const data = event.encX
    const encX = {
      iv: Buffer.from(data.substring(0, 32), 'hex'),
      ephemPublicKey: Buffer.from(data.substring(32, 162), 'hex'),
      ciphertext: Buffer.from(data.substring(162, data.length - 64), 'hex'),
      mac: Buffer.from(data.slice(data.length - 64), 'hex'),
    };
    try {
      x = await dlcService.decrypto(encX, signature[0]);
    } catch (err) {
      console.log(err);
      //return 1;
    }

    if (x) {
      console.log('settleInvoice')
      try {
        const settled = await lndService.settleInvoice(x);
        console.log(settled +" by cronjob1");
        const update = await prisma.contract.update({
          where: { id: event.id },
          data: { status: 'SETTLED', closedPrice: price.closedPrice },
        });
      } catch (err) {
        console.log(err);
        console.log('invoice already canceled')
        const cannceled = await lndService.cancelInvoice(event.hashX);
        console.log('payment of hash ' + event.hashX + ' canceled by cronjob1');
        try {
          const update = await prisma.contract.update({
            where: { id: event.id },
            data: { status: 'CANCELED', closedPrice: price.closedPrice },
          });
        } catch (err) {
          console.log(err);
          console.log('#################')
        }
      }
    } else {
      console.log('cancelInvoice' +" by cronjob2")
      const cannceled = await lndService.cancelInvoice(event.hashX);
      console.log(cannceled);
      console.log('*********************')
      try {
        const update = await prisma.contract.update({
          where: { id: event.id },
          data: { status: 'CANCELED', closedPrice: price.closedPrice },
        });
      } catch (err) {
        console.log(err);
      }
    }
  };
}

main();
