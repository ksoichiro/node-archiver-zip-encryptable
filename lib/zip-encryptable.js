var engine = require('./zip-crypto-stream');
var util = require('archiver-utils');

var ZipEncryptable = function(options) {
  if (!(this instanceof ZipEncryptable)) {
    return new ZipEncryptable(options);
  }

  options = this.options = util.defaults(options, {
    comment: '',
    forceUTC: false,
    store: false
  });

  this.supports = {
    directory: true,
    symlink: true
  };

  this.engine = new engine(options);
};

ZipEncryptable.prototype.append = function(source, data, callback) {
  this.engine.entry(source, data, callback);
};

ZipEncryptable.prototype.finalize = function() {
  this.engine.finalize();
};

ZipEncryptable.prototype.on = function() {
  return this.engine.on.apply(this.engine, arguments);
};

ZipEncryptable.prototype.pipe = function() {
  return this.engine.pipe.apply(this.engine, arguments);
};

ZipEncryptable.prototype.unpipe = function() {
  return this.engine.unpipe.apply(this.engine, arguments);
};

module.exports = ZipEncryptable;
