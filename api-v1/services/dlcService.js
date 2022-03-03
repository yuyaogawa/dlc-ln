const Buffer = require('safe-buffer').Buffer;
const schnorr = require('bip-schnorr');
const math = schnorr.math;
const convert = schnorr.convert;
const concat = Buffer.concat;
const ecurve = require('ecurve');
const curve = ecurve.getCurveByName('secp256k1');
const G = curve.G;
const crypto = require('crypto');
const eccrypto = require('eccrypto');

const dlcService = {
  async messageCommitment(m, R_, P_) {
    const tag = convert.hash('DLC/oracle/attestation/v0');
    const msg = Buffer.from(m, 'utf8');
    const hash = convert.hash(concat([tag, tag, msg]));
    const Rx = Buffer.from(R_, 'hex');
    const Px = Buffer.from(P_, 'hex');
    const P = math.liftX(Px);
    const R = math.liftX(Rx);
    const e = math.getE(Rx, Px, hash);
    const sG = R.add(P.multiply(e));
    const sGx = convert.intToBuffer(sG.affineX).toString('hex');
    return sGx;
  },
  async encrypto(x, sGx) {
    // FIXME sGx is x-only-pub-key?
    const pubkey = Buffer.from('03' + sGx, 'hex');
    // Encrypting the message for A.
    const Ex = await eccrypto.encrypt(pubkey, Buffer.from(x)).then(function (encrypted) {
      //console.log(encrypted)
      return encrypted;
    });
    console.log(Ex);
    return Ex;
  },
  async decrypto(Ex, s) {
    //const encrypted = Buffer.from(Ex, 'hex');
    const privkey = Buffer.from(s, 'hex').slice(32, 64);
    console.log(privkey);
    // A decrypting the message.
    const x = await eccrypto
      .decrypt(privkey, Ex)
      .then(function (plaintext) {
        return plaintext;
      })
      .catch(function (err) {
        console.log('[dlcService][err1]');
        console.log(err);
        return err;
      });
    return x;
  },
  async genHash(secret) {
    //console.log('secret:' + secret)
    const hash = crypto.createHash('sha256').update(secret).digest('hex');
    return hash;
  },
  async verify(s_, sG) {
    const sig = Buffer.from(s_, 'hex');
    const r = convert.bufferToInt(sig.slice(0, 32));
    const s = convert.bufferToInt(sig.slice(32, 64));
    const pubkey = G.multiply(s);
    if (pubkey == sG) {
      throw new Error('signature is invalid');
    } else {
      console.log('The signature is valid');
    }
    return Ex;
  },
};

module.exports = dlcService;
