const axios = require('axios');
/*
const options = {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Basic Yml0Y29pbnM6cGFzc3dvcmQ=",
  },
  url: "http://127.0.0.1:9998/",
};
*/

const utils = {
  async curl(options) {
    try {
      const res = await axios(options);
      if (res.status == 200) {
        return res;
      } else {
        console.log(res);
      }
    } catch (err) {
      console.log(err.status);
      console.log(err.response);
    }
  },
};

module.exports = utils;
