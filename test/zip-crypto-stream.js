var expect = require('chai').expect;
var ZipCryptoStream = require('../lib/zip-crypto-stream');

describe('zip-crypto-stream', function() {
  describe('#initialize()', function() {
    it('without options', function() {
      var engine = new ZipCryptoStream();
      expect(engine.options).to.not.be.null;
    });
  });
});
