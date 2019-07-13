var expect = require('chai').expect;
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var temp = require('temp').track();
var archiver = require('archiver');
var readline = require('readline');
var PassThrough = require('stream').PassThrough;
archiver.registerFormat('zip-encryptable', require('../'));

function slice(content, begin, size) {
  return content.slice(begin, begin + size);
}

function bytes(array) {
  return Buffer.from(array);
}

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
      // Local file header 1
      {
        // Signature
        expect(slice(content, 0, 4)).to.eql(bytes([0x50, 0x4b, 0x03, 0x04]));
        // Version needed to extract
        expect(slice(content, 4, 2)).to.eql(bytes([0x14, 0x00]));
        // General purpose bit flag: 9 = Bit 0 and Bit 3
        // Bit 0: the file is encrypted.
        // Bit 3: the fields crc-32, compressed size and
        // uncompressed size are set to zero in the local header.
        // The correct values are put in the data descriptor.
        expect(slice(content, 6, 2)).to.eql(bytes([0x09, 0x00]));
        // Compression method: 8 - The file is Deflated
        expect(slice(content, 8, 2)).to.eql(bytes([0x08, 0x00]));
        // Last mod file time: 2B
        // Last mod file date: 2B
        // Crc-32
        expect(slice(content, 14, 4).readUInt32LE()).to.equal(0);
        // Compressed size: 0 (because General purpose bit 3 is set)
        expect(slice(content, 18, 4).readUInt32LE()).to.equal(0);
        // Uncompressed size: 0 (because General purpose bit 3 is set)
        expect(slice(content, 22, 4).readUInt32LE()).to.equal(0);
        // File name length: 0 (because General purpose bit 3 is set)
        expect(slice(content, 26, 4).readUInt32LE()).to.equal(
          'test.txt'.length
        );
        // Extra field length
        expect(slice(content, 28, 2)).to.eql(bytes([0x00, 0x00]));
        // File name
        expect(slice(content, 30, 'test.txt'.length).toString('ascii')).to.eql(
          'test.txt'
        );
      }
      // Encryption header 1: 12B, 38 ~ 49
      // File data 1: 13B, 50 ~ 62
      // Data descriptor 1
      {
        // Signature
        expect(slice(content, 63, 4)).to.eql(bytes([0x50, 0x4b, 0x07, 0x08]));
        // Crc-32
        expect(slice(content, 67, 4)).to.eql(bytes([0x56, 0xb1, 0x17, 0x4a]));
        // Compressed size
        expect(slice(content, 71, 4).readUInt32LE()).to.equal(25);
        // Uncompressed size
        expect(slice(content, 75, 4).readUInt32LE()).to.equal(
          'Hello World'.length
        );
      }
      // Local file header 2
      // {
      // Encryption header 2
      // File data 2
      // Data descriptor 2
      {
        // Signature
        expect(slice(content, 140, 4)).to.eql(bytes([0x50, 0x4b, 0x07, 0x08]));
        // Crc-32
        expect(slice(content, 144, 4)).to.eql(bytes([0x6b, 0xe5, 0x9d, 0xbe]));
        // Compressed size
        expect(slice(content, 148, 4).readUInt32LE()).to.equal(22);
        // Uncompressed size
        expect(slice(content, 152, 4).readUInt32LE()).to.equal(
          'Good Bye'.length
        );
      }
      // Archive decription header
      // Archive extra data record
      // Central directory header 1
      // End of central directory record
      {
        // End of central dir signature
        expect(slice(content, 265, 4)).to.eql(bytes([0x50, 0x4b, 0x05, 0x06]));
        // Number of this disk
        expect(slice(content, 269, 2)).to.eql(bytes([0, 0]));
        // Number of the disk with the start of the central directory
        expect(slice(content, 271, 2)).to.eql(bytes([0, 0]));
        // Total number of entries in the central directory on this disk
        expect(slice(content, 273, 2)).to.eql(bytes([2, 0]));
        // Total number of entries in the central directory
        expect(slice(content, 275, 2)).to.eql(bytes([2, 0]));
        // Size of the central directory
        expect(slice(content, 277, 4).readUInt32LE()).to.equal(109);
        // Offset of start of central directory with respect to the starting disk number
        expect(slice(content, 281, 4).readUInt32LE()).to.equal(156);
        // .ZIP file comment length
        expect(slice(content, 285, 2)).to.eql(bytes([0, 0]));
        // .ZIP file comment       (variable size)
      }
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

  it('archives file by filename', function(done) {
    var tempDir = temp.mkdirSync('out');
    mkdirp.sync(path.join(tempDir, 'out'));
    var cwd = process.cwd();
    var ws = fs.createWriteStream(tempDir + '/out/loremipsum.txt');
    var fileContent =
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit.\n';
    ws.write(fileContent);
    ws.end();

    var output = fs.createWriteStream(tempDir + '/example.zip');
    output.on('close', function() {
      process.chdir(cwd);
      var content = fs.readFileSync(tempDir + '/example.zip');
      // Local header
      expect(content.slice(0, 4)).to.eql(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
      // File name length
      var entryName = 'out/loremipsum.txt';
      // File name
      expect(
        content.slice(0x1e, 0x1e + entryName.length).toString('ascii')
      ).to.eql(entryName);
      done();
    });
    var archive = archiver('zip-encryptable', {
      level: 9,
      forceLocalTime: true,
      password: 'test'
    });
    archive.pipe(output);
    process.chdir(temp.dir);
    archive.append('out/loremipsum.txt', { name: 'out/loremipsum.txt' });
    archive.finalize();
  });

  it('archives files without compression', function(done) {
    var tempDir = temp.mkdirSync('out');
    var output = fs.createWriteStream(tempDir + '/example.zip');
    output.on('close', function() {
      var content = fs.readFileSync(tempDir + '/example.zip');
      expect(content.slice(0, 4)).to.eql(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
      done();
    });

    var archive = archiver('zip-encryptable', {
      zlib: { level: 0 },
      forceLocalTime: true,
      comment: 'test comment',
      password: 'test'
    });
    archive.pipe(output);
    archive.append(Buffer.from('Hello World'), { name: 'test.txt' });
    archive.finalize();
  });

  it('abort and unpipe', function(done) {
    var tempDir = temp.mkdirSync('out');
    var output = fs.createWriteStream(tempDir + '/example.zip');
    output.on('close', function() {
      done();
    });

    var archive = archiver('zip-encryptable');
    archive.pipe(output);
    archive.append(Buffer.from('Hello World'), { name: 'test.txt' });
    archive.abort();
  });

  it('archive file with stream', function(done) {
    var tempDir = temp.mkdirSync('out');
    var output = fs.createWriteStream(tempDir + '/example.zip');
    output.on('close', function() {
      var content = fs.readFileSync(tempDir + '/example.zip');
      expect(content.slice(0, 4)).to.eql(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
      done();
    });

    var archive = archiver('zip-encryptable', {
      level: 9,
      password: 'test'
    });
    archive.pipe(output);

    // read file and write line by line
    var stream = fs.createReadStream('README.md', 'utf8');
    var reader = readline.createInterface({ input: stream });
    var pass = new PassThrough();
    reader.on('line', function(data) {
      pass.write(data + '\n');
    });
    reader.on('close', function() {
      pass.end();
    });
    archive.append(pass, { name: 'README.md' });
    archive.finalize();
  });
});
