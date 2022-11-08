require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ORACLE_SERVER = process.env.ORACLE_SERVER;
let options = {
  method: 'GET',
  url: ORACLE_SERVER,
};

module.exports = function () {
  const operations = {
    GET,
  };
  async function GET(req, res, next) {
    let now = new Date();
    let yesterday = new Date(now.getTime());
    yesterday.setDate(now.getDate() - 2);
    const stats = await prisma.$queryRaw`SELECT SUM(CAST(premium AS INTEGER)) AS dailyVolume FROM Contract WHERE createdAt >= ${yesterday} ;`
    console.log("dailyVolume: " + stats[0].dailyVolume);
    if (!stats) {
      const error = {
        status: 'error',
        message: 'This stats is not found.',
      };
      return res.status(200).json(error);
    }
    res.status(200).json(stats[0]);
  }
  // NOTE: We could also use a YAML string here.
  GET.apiDoc = {
    summary: 'Get Stats',
    operationId: 'getStatsData',
    parameters: [],
    responses: {
      200: {
        description: 'Return stats data',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/StatsData' },
          },
        },
      },
    },
  };
  return operations;
};
