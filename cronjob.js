const dlcService = require('./api-v1/services/dlcService');
const lndService = require('./api-v1/services/lndService');
const axios = require('axios');
let options = {
  method: 'GET',
  url: 'http://127.0.0.1:4000/',
};
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const events = await prisma.contract.findMany({
    where: { status: 'OPEN' },
    select: {
      id: true,
      eventName: true,
      hashX: true,
      encX: true,
    },
  });
  console.log(events[0].eventName);

  options.url = 'http://127.0.0.1:4000/signatures/' + events[0].eventName;
  const res = await axios(options);
  const signature = res.data
  console.log(signature);

  if(res.data.status == 'error'){
    return 1
  }
  let x;
  const data = events[0].encX
  const Ex = {
    iv: Buffer.from(data.substring(0, 32), 'hex'),
    ephemPublicKey: Buffer.from(data.substring(32, 162), 'hex'),
    ciphertext: Buffer.from(data.substring(162, data.length - 64), 'hex'),
    mac: Buffer.from(data.slice(data.length - 64), 'hex'),
  };
  try {
    x = await dlcService.decrypto(Ex, signature);
  } catch (err) {
    console.log(err);
    return 1;
  }

  if (x) {
    console.log('settleInvoice')
    try {
      const settled = await lndService.settleInvoice(x);
      console.log(settled);
      const update = await prisma.oracle.update({
        where: { id: events[0].id },
        data: { status: 'SETTLED' },
      });
    } catch (err) {
      console.log(err);
      console.log('invoice already canceled')
      const cannceled = await lndService.cancelInvoice(events[0].hashX);
      console.log(cannceled);
      try {
        const update = await prisma.contract.update({
          where: { id: events[0].id },
          data: { status: 'CANCELED' },
        });
      } catch (err) {
        console.log(err);
      }
    }
  } else {
    console.log('cancelInvoice')
    const cannceled = await lndService.cancelInvoice(events[0].hashX);
    console.log(cannceled);
    try {
      const update = await prisma.oracle.update({
        where: { id: events[0].id },
        data: { status: 'CANCELED' },
      });
    } catch (err) {
      console.log(err);
    }
  }
}

main();
