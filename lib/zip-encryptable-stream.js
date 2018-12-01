var inherits = require('util').inherits;
var ZipArchiveEntry = require('compress-commons').ZipArchiveEntry;
var util = require('archiver-utils');
var ZipEncryptableArchiveOutputStream = require('./zip-encryptable-archive-output-stream');

var ZipEncryptableStream = module.exports = function(options) {
  if (!(this instanceof ZipEncryptableStream)) {
    return new ZipEncryptableStream(options);
  }

  options = this.options = options || {};
  options.zlib = options.zlib || {};

  ZipEncryptableArchiveOutputStream.call(this, options);

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
};

inherits(ZipEncryptableStream, ZipEncryptableArchiveOutputStream);

ZipEncryptableStream.prototype._normalizeFileData = function(data) {
  data = util.defaults(data, {
    type: 'file',
    name: null,
    linkname: null,
    date: null,
    mode: null,
    store: this.options.store,
    comment: ''
  });

  var isDir = data.type === 'directory';
  var isSymlink = data.type === 'symlink';

  if (data.name) {
    data.name = util.sanitizePath(data.name);

    if (!isSymlink && data.name.slice(-1) === '/') {
      isDir = true;
      data.type = 'directory';
    } else if (isDir) {
      data.name += '/';
    }
  }

  if (isDir || isSymlink) {
    data.store = true;
  }

  data.date = util.dateify(data.date);

  return data;
};

ZipEncryptableStream.prototype.entry = function(source, data, callback) {
  data = this._normalizeFileData(data);

  if (data.type !== 'file' && data.type !== 'directory' && data.type !== 'symlink') {
    callback(new Error(data.type + ' entries not currently supported'));
    return;
  }

  if (typeof data.name !== 'string' || data.name.length === 0) {
    callback(new Error('entry name must be a non-empty string value'));
    return;
  }

  if (data.type === 'symlink' && typeof data.linkname !== 'string') {
    callback(new Error('entry linkname must be a non-empty string value when type equals symlink'));
    return;
  }

  var entry = new ZipArchiveEntry(data.name);
  entry.setTime(data.date, this.options.forceLocalTime);

  if (data.store) {
    entry.setMethod(0);
  }

  if (data.comment.length > 0) {
    entry.setComment(data.comment);
  }

  if (data.type === 'symlink' && typeof data.mode !== 'number') {
    data.mode = 40960; // 0120000
  }

  if (typeof data.mode === 'number') {
    if (data.type === 'symlink') {
      data.mode |= 40960;
    }

    entry.setUnixMode(data.mode);
  }

  if (data.type === 'symlink' && typeof data.linkname === 'string') {
    source = new Buffer(data.linkname);
  }

  return ZipEncryptableArchiveOutputStream.prototype.entry.call(this, entry, source, callback);
};

ZipEncryptableStream.prototype.finalize = function() {
  this.finish();
};
