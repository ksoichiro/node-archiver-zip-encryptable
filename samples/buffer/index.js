var archiver = require('archiver');
var passThrough = require('stream').PassThrough();

archiver.registerFormat('zip-encryptable', require('archiver-zip-encryptable'));

var archive = archiver('zip-encryptable', {
  zlib: { level: 9 },
  forceLocalTime: true,
  password: 'test'
});
archive.pipe(passThrough);

archive.append(Buffer.from('Hello World'), { name: 'test.txt' });

var zip = Buffer.alloc(0);
passThrough.on('readable', function() {
  var data;
  while ((data = this.read())) {
    zip = Buffer.concat([zip, data], zip.length + data.length);
  }
});

archive.finalize().then(function() {
  passThrough.end();
  console.log(zip.length);
});
