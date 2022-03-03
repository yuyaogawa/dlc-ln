const lndService = require('../api-v1/services/lndService');
const dlcService = require('../api-v1/services/dlcService');
const crypto = require('crypto');

async function test(){
  const invoice = 'lntb1u1p3psg9vpp59aysq8fajy6yxuqpjf97dz8awp6nk6pum0sfll606ku7dckhaa0sdqqcqzpgxqyz5vqsp5la2aw7nl734023d42qu9j7g02s9ke75qqgejharlyy9qx4j4negs9qyyssqa3dfg7zx7fm8q5wzcrt28cfngfp6dun54dzzqyz3n78ayalxl27zr2yd5969n2xuh4mzlw4zv6m4ryks5rqlgrj6f7qpdhurchd6dsgqamahxu'
  const pay_req = await lndService.decodePayReq(invoice);
  console.log(pay_req);

  const payment_hash = dlcService.genHash(crypto.randomBytes(32));
  let route = await lndService.prePayProbe(pay_req.destination, pay_req.num_satoshis, pay_req.cltv_expiry, Buffer.from(payment_hash, 'hex'));
  //console.log(route.hops)
  //console.log(route);
  if(route !== undefined) {
    const mpp_record = {
      payment_addr: pay_req.payment_addr,
      total_amt_msat: pay_req.num_msat,
    };
    route.hops[route.hops.length - 1].mpp_record = mpp_record;
    console.log(route.hops)
    const payment = await lndService.sendToRouteV2(Buffer.from(pay_req.payment_hash, 'hex'), route)
    console.log(payment.route.hops);
    console.log(payment.status);
    console.log('Fin');
  }
}

test();
