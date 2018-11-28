var expect = require('chai').expect;
var fs = require('fs');
var temp = require('temp').track();
var archiver = require('archiver');
archiver.registerFormat('zip-encryptable', require('../'));

describe('archive', function() {
  before(function() {
    temp.track();
  });

  it('archives flies with password', function(done) {
    var tempDir = temp.mkdirSync('out');
    var output = fs.createWriteStream(tempDir + '/example.zip');
    output.on('close', function() {
      var content = fs.readFileSync(tempDir + '/example.zip');
      // Encrypted file size
      expect(content.length).to.equal(287);
      // Local header
      expect(content.slice(0, 4)).to.eql(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
      // File name length
      expect(content.slice(0x1a, 0x1a + 4).readUInt32LE()).to.equal(0x08);
      // File name
      expect(content.slice(0x1e, 0x1e + 8).toString('ascii')).to.eql('test.txt');
      // Data descripter
      expect(content.indexOf(Buffer.from([0x50, 0x4b, 0x07, 0x08]))).to.equal(0x3f);
      // File data size
      expect(content.slice(0x47, 0x47 + 4).readUInt32LE()).to.equal(0x19);
      // File data compressed size
      expect(content.slice(0x4b, 0x4b + 4).readUInt32LE()).to.equal(0x0b);
      done();
    });

    var archive = archiver('zip-encryptable', {
        zlib: { level: 9 },
        forceLocalTime: true,
        password: 'test'
    });
    archive.pipe(output);
    archive.append(Buffer.from('Hello World'), { name: 'test.txt' });
    archive.append(Buffer.from('Good Bye'), { name: 'test2.txt' });
    archive.finalize();
  });
});
