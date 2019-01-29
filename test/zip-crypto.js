var expect = require('chai').expect;
var ZipCrypto = require('../lib/zip-crypto');

describe('zip-crypto', function() {
  describe('#init()', function() {
    it('successfully initializes with password', function() {
      var zipCrypto = new ZipCrypto({ password: 's3cret' });
      zipCrypto.init();
      expect(zipCrypto.keys[0]).to.eql(Buffer.from([0x6a, 0xfa, 0xde, 0x02]));
      expect(zipCrypto.keys[1]).to.eql(Buffer.from([0x9f, 0xea, 0xa3, 0x73]));
      expect(zipCrypto.keys[2]).to.eql(Buffer.from([0x21, 0xf8, 0x63, 0x44]));
    });
  });

  describe('#_updateKeys()', function() {
    // https://github.com/ksoichiro/node-archiver-zip-encryptable/issues/1
    it('throws error with big number', function() {
      var zipCrypto = new ZipCrypto({ password: 's3cret' });
      zipCrypto.init();
      zipCrypto.keys[1] = Buffer.from([0xff, 0xff, 0xff, 0xff]);
      expect(function() {
        zipCrypto._updateKeys(Buffer.from([0x1]));
      }).to.throw();
    });
  });
});
