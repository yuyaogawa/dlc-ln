let clients = [];
let facts = [];
const lndService = require('../services/lndService');
module.exports = function () {
  const operations = {
    GET,
  };
  async function GET(req, res, next) {
    const headers = {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    };
    res.writeHead(200, headers);

    const data = `data: ${JSON.stringify(facts)}\n\n`;
    res.write(data);

    const clientId = Date.now();

    const newClient = {
      id: clientId,
      res,
    };
    clients.push(newClient);

    // SubscribeSingleInvoice and streaming update
    const payment_hash = req.query.payment_hash;
    console.log('payment_hash: ' + payment_hash);
    lndService.subscribeSingleInvoice(Buffer.from(payment_hash, 'hex'), res);

    req.on('close', () => {
      console.log(`${clientId} Connection closed`);
      clients = clients.filter((client) => client.id !== clientId);
    });
  }
  // NOTE: We could also use a YAML string here.
  GET.apiDoc = {
    summary: 'Subscribe payment to holdinvoice',
    operationId: 'subscribePayment',
    parameters: [
      {
        in: 'query',
        name: 'payment_hash',
        required: true,
        schema: { $ref: '#/components/schemas/hashX' },
      },
    ],
    responses: {
      200: {
        description: 'Return 200 for subscription',
      },
    },
  };
  return operations;
};
