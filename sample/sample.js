var fs = require('fs');
var archiver = require('archiver');

archiver.registerFormat('zip-encryptable', require('archiver-zip-encryptable'));

var output = fs.createWriteStream(__dirname + '/example.zip');

var archive = archiver('zip-encryptable', {
    zlib: { level: 9 },
    forceLocalTime: true,
    password: 'test'
});
archive.pipe(output);

archive.append(Buffer.from('Hello World'), { name: 'test.txt' });
archive.append(Buffer.from('Good Bye'), { name: 'test2.txt' });

archive.finalize();
