let clients = [];
const facts = [];

const PAYOUT = process.env.PAYOUT;
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

    // Streaming update
    const refreshIntervalId = setInterval(function () {
      const c = req.app.locals.c;
      const p = req.app.locals.p;
      res.write(`data: ${JSON.stringify({ status: 'ok', message: { c, p } })}\n\n`);
    }, 3000);

    req.on('close', () => {
      console.log(`${clientId} Connection closed`);
      clearInterval(refreshIntervalId);
      clients = clients.filter((client) => client.id !== clientId);
    });
  }
  // NOTE: We could also use a YAML string here.
  GET.apiDoc = {
    summary: 'Subscribe quotes',
    operationId: '',
    parameters: [],
    responses: {
      200: {
        description: 'Return 200 for subscription',
      },
    },
  };
  return operations;
};
