var inherits = require('util').inherits;

var Writable = require('stream').Writable;
var ZipArchiveOutputStream = require('compress-commons').ZipArchiveOutputStream;
var cryptoRandomString = require('crypto-random-string');
var CRC32Stream = require('crc32-stream');
var DeflateCRC32Stream = CRC32Stream.DeflateCRC32Stream;
var constants = require('compress-commons/lib/archivers/zip/constants');
var ZipCrypto = require('./zip-crypto');

var ZipStream = require('zip-stream');

var ZipCryptoStream = (module.exports = function(options) {
  if (!(this instanceof ZipCryptoStream)) {
    return new ZipCryptoStream(options);
  }

  options = this.options = options || {};
  options.zlib = options.zlib || {};

  ZipArchiveOutputStream.call(this, options);

  if (typeof options.level === 'number' && options.level >= 0) {
    options.zlib.level = options.level;
    delete options.level;
  }

  if (typeof options.zlib.level === 'number' && options.zlib.level === 0) {
    options.store = true;
  }

  if (options.comment && options.comment.length > 0) {
    this.setComment(options.comment);
  }
});

inherits(ZipCryptoStream, ZipStream);

ZipCryptoStream.prototype._normalizeFileData = function(data) {
  return ZipStream.prototype._normalizeFileData.call(this, data);
};

ZipCryptoStream.prototype.entry = function(source, data, callback) {
  return ZipStream.prototype.entry.call(this, source, data, callback);
};

ZipCryptoStream.prototype.finalize = function() {
  this.finish();
};

ZipCryptoStream.prototype._appendBuffer = function(ae, source, callback) {
  ae.gpb.useEncryption(true);
  ZipStream.prototype._appendBuffer.call(this, ae, source, callback);
};

ZipCryptoStream.prototype._appendStream = function(ae, source, callback) {
  ae.gpb.useEncryption(true);
  ZipStream.prototype._appendStream.call(this, ae, source, callback);
};

ZipCryptoStream.prototype._smartStream = function(ae, callback) {
  var zipCrypto = new ZipCrypto(this.options);
  zipCrypto.init();
  var encryptionHeader = Buffer.from(cryptoRandomString(24), 'hex');
  var encryptedHeader = zipCrypto.encrypt(encryptionHeader);
  var crc = ae.getTimeDos();
  encryptedHeader[10] = crc & 0xff;
  encryptedHeader[11] = (crc >> 8) & 0xff;
  zipCrypto.init();
  var encryptedHeader2 = zipCrypto.encrypt(encryptedHeader);
  this.write(encryptedHeader2);

  var deflate = ae.getMethod() === constants.METHOD_DEFLATED;
  var process = deflate
    ? new DeflateCRC32Stream(this.options.zlib)
    : new CRC32Stream();
  var error = null;

  var buffer = Buffer.alloc(0);
  function handleStuff() {
    buffer = zipCrypto.encrypt(buffer);
    this.write(buffer);
    buffer = Buffer.alloc(0);
    var digest = process.digest().readUInt32BE(0);
    ae.setCrc(digest);
    ae.setSize(process.size());
    ae.setCompressedSize(process.size(true) + encryptionHeader.length);
    this._afterAppend(ae);
    callback(error, ae);
  }
  var outStream = new Writable({
    write: function(chunk, encoding, callback) {
      buffer = Buffer.concat([buffer, chunk]);
      callback();
    }
  });

  process.once('end', handleStuff.bind(this));
  process.once('error', function(err) {
    error = err;
  });

  process.pipe(
    outStream,
    { end: false }
  );

  return process;
};
