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
        expect(slice(content, 0, 4).readUInt32LE()).to.equal(0x04034b50);
        // Version needed to extract
        expect(slice(content, 4, 2).readUInt16LE()).to.equal(20);
        // General purpose bit flag: 9 = Bit 0 and Bit 3
        // Bit 0: the file is encrypted.
        // Bit 3: the fields crc-32, compressed size and
        // uncompressed size are set to zero in the local header.
        // The correct values are put in the data descriptor.
        expect(slice(content, 6, 2).readUInt16LE()).to.equal(9);
        // Compression method: 8 - The file is Deflated
        expect(slice(content, 8, 2).readUInt16LE()).to.equal(8);
        // Last mod file time: 2B
        // Last mod file date: 2B
        // Crc-32
        expect(slice(content, 14, 4).readUInt32LE()).to.equal(0);
        // Compressed size: 0 (because General purpose bit 3 is set)
        expect(slice(content, 18, 4).readUInt32LE()).to.equal(0);
        // Uncompressed size: 0 (because General purpose bit 3 is set)
        expect(slice(content, 22, 4).readUInt32LE()).to.equal(0);
        // File name length: 0 (because General purpose bit 3 is set)
        expect(slice(content, 26, 4).readUInt16LE()).to.equal(
          'test.txt'.length
        );
        // Extra field length
        expect(slice(content, 28, 2).readUInt16LE()).to.equal(0);
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
        expect(slice(content, 63, 4).readUInt32LE()).to.equal(0x08074b50);
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
      {
        // Signature
        expect(slice(content, 79, 4).readUInt32LE()).to.equal(0x04034b50);
        // Version needed to extract
        expect(slice(content, 83, 2).readUInt16LE()).to.equal(20);
        // General purpose bit flag: 9 = Bit 0 and Bit 3
        // Bit 0: the file is encrypted.
        // Bit 3: the fields crc-32, compressed size and
        // uncompressed size are set to zero in the local header.
        // The correct values are put in the data descriptor.
        expect(slice(content, 85, 2).readUInt16LE()).equal(9);
        // Compression method: 8 - The file is Deflated
        expect(slice(content, 87, 2).readUInt16LE()).equal(8);
        // Last mod file time: 2B
        // Last mod file date: 2B
        // Crc-32
        expect(slice(content, 93, 4).readUInt32LE()).to.equal(0);
        // Compressed size: 0 (because General purpose bit 3 is set)
        expect(slice(content, 97, 4).readUInt32LE()).to.equal(0);
        // Uncompressed size: 0 (because General purpose bit 3 is set)
        expect(slice(content, 101, 4).readUInt32LE()).to.equal(0);
        // File name length: 0 (because General purpose bit 3 is set)
        expect(slice(content, 105, 2).readUInt16LE()).to.equal(
          'test2.txt'.length
        );
        // Extra field length
        expect(slice(content, 107, 2).readUInt16LE()).equal(0);
        // File name
        expect(
          slice(content, 109, 'test2.txt'.length).toString('ascii')
        ).to.eql('test2.txt');
      }
      // Encryption header 2: 12B, 118 ~ 129
      // File data 2: 10B, 130 ~ 139
      // Data descriptor 2
      {
        // Signature
        expect(slice(content, 140, 4).readUInt32LE()).to.equal(0x08074b50);
        // Crc-32
        expect(slice(content, 144, 4)).to.eql(bytes([0x6b, 0xe5, 0x9d, 0xbe]));
        // Compressed size
        expect(slice(content, 148, 4).readUInt32LE()).to.equal(22);
        // Uncompressed size
        expect(slice(content, 152, 4).readUInt32LE()).to.equal(
          'Good Bye'.length
        );
      }
      // Archive decryption header: does not exist
      // Archive extra data record: does not exist
      // Central directory header 1
      {
        // Central file header signature
        expect(slice(content, 156, 4).readUInt32LE()).to.equal(0x02014b50);
        // Version made by
        expect(slice(content, 160, 1).readInt8()).to.equal(45); // 4.5
        // expect(slice(content, 161, 1)).to.eql(bytes([0x03])); // UNIX
        // Version needed to extract
        expect(slice(content, 162, 2).readUInt16LE()).equal(20);
        // General purpose bit flag
        expect(slice(content, 164, 2).readUInt16LE()).equal(9);
        // Compression method
        expect(slice(content, 166, 2).readUInt16LE()).equal(8);
        // Last mod file time: 2B
        // Last mod file date: 2B
        // Crc-32
        expect(slice(content, 172, 4)).to.eql(bytes([0x56, 0xb1, 0x17, 0x4a]));
        // Compressed size
        expect(slice(content, 176, 4).readUInt32LE()).equal(25);
        // Uncompressed size
        expect(slice(content, 180, 4).readUInt32LE()).equal(
          'Hello World'.length
        );
        // File name length
        expect(slice(content, 184, 2).readUInt16LE()).to.equal(
          'test.txt'.length
        );
        // Extra field length
        expect(slice(content, 186, 2).readUInt16LE()).equal(0);
        // File comment length
        expect(slice(content, 188, 2).readUInt16LE()).equal(0);
        // Disk number start
        expect(slice(content, 190, 2).readUInt16LE()).equal(0);
        // Internal file attributes
        expect(slice(content, 192, 2).readUInt16LE()).equal(0);
        // External file attributes: host-system dependent
        // expect(slice(content, 194, 4).readUInt32LE()).equal(0);
        // Relative offset of local header 4 bytes
        expect(slice(content, 198, 4).readUInt32LE()).equal(0);
        // File name
        expect(slice(content, 202, 'test.txt'.length).toString('ascii')).to.eql(
          'test.txt'
        );
        // Extra field: does not exists
        // File comment: does not exists
      }
      // Central directory header 2
      {
        // Central file header signature
        expect(slice(content, 210, 4).readUInt32LE()).to.equal(0x02014b50);
        // Version made by
        expect(slice(content, 214, 1).readInt8()).to.equal(45); // 4.5
        // expect(slice(content, 215, 1)).to.eql(bytes([0x03])); // UNIX
        // Version needed to extract
        expect(slice(content, 216, 2).readUInt16LE()).equal(20);
        // General purpose bit flag
        expect(slice(content, 218, 2).readUInt16LE()).equal(9);
        // Compression method
        expect(slice(content, 220, 2).readUInt16LE()).equal(8);
        // Last mod file time: 2B
        // Last mod file date: 2B
        // Crc-32
        expect(slice(content, 226, 4)).to.eql(bytes([0x6b, 0xe5, 0x9d, 0xbe]));
        // Compressed size
        expect(slice(content, 230, 4).readUInt32LE()).equal(22);
        // Uncompressed size
        expect(slice(content, 234, 4).readUInt32LE()).equal('Good Bye'.length);
        // File name length
        expect(slice(content, 238, 2).readUInt16LE()).to.equal(
          'test2.txt'.length
        );
        // Extra field length
        expect(slice(content, 240, 2).readUInt16LE()).equal(0);
        // File comment length
        expect(slice(content, 242, 2).readUInt16LE()).equal(0);
        // Disk number start
        expect(slice(content, 244, 2).readUInt16LE()).equal(0);
        // Internal file attributes
        expect(slice(content, 246, 2).readUInt16LE()).equal(0);
        // External file attributes: host-system dependent
        // expect(slice(content, 248, 4).readUInt32LE()).equal(0);
        // Relative offset of local header 4 bytes
        expect(slice(content, 252, 4).readUInt32LE()).equal(79);
        // File name
        expect(
          slice(content, 256, 'test2.txt'.length).toString('ascii')
        ).to.eql('test2.txt');
        // Extra field: does not exists
        // File comment: does not exists
      }
      // End of central directory record
      {
        // End of central dir signature
        expect(slice(content, 265, 4).readUInt32LE()).to.equal(0x06054b50);
        // Number of this disk
        expect(slice(content, 269, 2).readUInt16LE()).to.equal(0);
        // Number of the disk with the start of the central directory
        expect(slice(content, 271, 2).readUInt16LE()).to.equal(0);
        // Total number of entries in the central directory on this disk
        expect(slice(content, 273, 2).readUInt16LE()).to.equal(2);
        // Total number of entries in the central directory
        expect(slice(content, 275, 2).readUInt16LE()).to.equal(2);
        // Size of the central directory
        expect(slice(content, 277, 4).readUInt32LE()).to.equal(109);
        // Offset of start of central directory with respect to the starting disk number
        expect(slice(content, 281, 4).readUInt32LE()).to.equal(156);
        // .ZIP file comment length
        expect(slice(content, 285, 2).readUInt16LE()).to.equal(0);
        // .ZIP file comment: does not exist
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

  it('archive empty file', function(done) {
    var tempDir = temp.mkdirSync('out');
    var output = fs.createWriteStream(tempDir + '/example.zip');
    output.on('close', function() {
      var content = fs.readFileSync(tempDir + '/example.zip');
      // Encrypted file size
      expect(content.length).to.equal(144);
      // Local file header 1
      {
        // Signature
        expect(slice(content, 0, 4).readUInt32LE()).to.equal(0x04034b50);
        // Version needed to extract
        expect(slice(content, 4, 2).readUInt16LE()).to.equal(20);
        // General purpose bit flag: 9 = Bit 0 and Bit 3
        // Bit 0: the file is encrypted.
        // Bit 3: the fields crc-32, compressed size and
        // uncompressed size are set to zero in the local header.
        // The correct values are put in the data descriptor.
        expect(slice(content, 6, 2).readUInt16LE()).to.equal(9);
        // Compression method: 0 - The file is stored (no compression)
        expect(slice(content, 8, 2).readUInt16LE()).to.equal(0);
        // Last mod file time: 2B
        // Last mod file date: 2B
        // Crc-32
        expect(slice(content, 14, 4).readUInt32LE()).to.equal(0);
        // Compressed size: 0 (because General purpose bit 3 is set)
        expect(slice(content, 18, 4).readUInt32LE()).to.equal(0);
        // Uncompressed size: 0 (because General purpose bit 3 is set)
        expect(slice(content, 22, 4).readUInt32LE()).to.equal(0);
        // File name length: 0 (because General purpose bit 3 is set)
        expect(slice(content, 26, 4).readUInt16LE()).to.equal(
          'blank.txt'.length
        );
        // Extra field length
        expect(slice(content, 28, 2).readUInt16LE()).to.equal(0);
        // File name
        expect(slice(content, 30, 'blank.txt'.length).toString('ascii')).to.eql(
          'blank.txt'
        );
      }
      // Encryption header 1: 12B, 39 ~ 50
      // File data 1: does not exist
      // Data descriptor 1
      {
        // Signature
        expect(slice(content, 51, 4).readUInt32LE()).to.equal(0x08074b50);
        // Crc-32
        expect(slice(content, 55, 4)).to.eql(bytes([0, 0, 0, 0]));
        // Compressed size
        expect(slice(content, 59, 4).readUInt32LE()).to.equal(12);
        // Uncompressed size
        expect(slice(content, 63, 4).readUInt32LE()).to.equal(0);
      }
      // Archive decryption header: does not exist
      // Archive extra data record: does not exist
      // Central directory header 1
      {
        // Central file header signature
        expect(slice(content, 67, 4).readUInt32LE()).to.equal(0x02014b50);
        // Version made by
        expect(slice(content, 71, 1).readInt8()).to.equal(45); // 4.5
        // expect(slice(content, 72, 1)).to.eql(bytes([0x03])); // UNIX
        // Version needed to extract
        expect(slice(content, 73, 2).readUInt16LE()).equal(20);
        // General purpose bit flag
        expect(slice(content, 75, 2).readUInt16LE()).equal(9);
        // Compression method
        expect(slice(content, 77, 2).readUInt16LE()).equal(0);
        // Last mod file time: 2B
        // Last mod file date: 2B
        // Crc-32
        expect(slice(content, 83, 4)).to.eql(bytes([0, 0, 0, 0]));
        // Compressed size
        expect(slice(content, 87, 4).readUInt32LE()).equal(12);
        // Uncompressed size
        expect(slice(content, 91, 4).readUInt32LE()).equal(0);
        // File name length
        expect(slice(content, 95, 2).readUInt16LE()).to.equal(
          'blank.txt'.length
        );
        // Extra field length
        expect(slice(content, 97, 2).readUInt16LE()).equal(0);
        // File comment length
        expect(slice(content, 99, 2).readUInt16LE()).equal(0);
        // Disk number start
        expect(slice(content, 101, 2).readUInt16LE()).equal(0);
        // Internal file attributes
        expect(slice(content, 103, 2).readUInt16LE()).equal(0);
        // External file attributes: host-system dependent
        // expect(slice(content, 105, 4).readUInt32LE()).equal(0);
        // Relative offset of local header 4 bytes
        expect(slice(content, 109, 4).readUInt32LE()).equal(0);
        // File name
        expect(
          slice(content, 113, 'blank.txt'.length).toString('ascii')
        ).to.eql('blank.txt');
        // Extra field: does not exists
        // File comment: does not exists
      }
      // End of central directory record
      {
        // End of central dir signature
        expect(slice(content, 122, 4).readUInt32LE()).to.equal(0x06054b50);
        // Number of this disk
        expect(slice(content, 126, 2).readUInt16LE()).to.equal(0);
        // Number of the disk with the start of the central directory
        expect(slice(content, 128, 2).readUInt16LE()).to.equal(0);
        // Total number of entries in the central directory on this disk
        expect(slice(content, 130, 2).readUInt16LE()).to.equal(1);
        // Total number of entries in the central directory
        expect(slice(content, 132, 2).readUInt16LE()).to.equal(1);
        // Size of the central directory
        expect(slice(content, 134, 4).readUInt32LE()).to.equal(55);
        // Offset of start of central directory with respect to the starting disk number
        expect(slice(content, 138, 4).readUInt32LE()).to.equal(67);
        // .ZIP file comment length
        expect(slice(content, 142, 2).readUInt16LE()).to.equal(0);
        // .ZIP file comment: does not exist
      }
      done();
    });

    var archive = archiver('zip-encryptable', {
      zlib: { level: 9 },

      forceLocalTime: true,
      password: 'test'
    });
    archive.pipe(output);
    archive.append(Buffer.from(''), { name: 'blank.txt' });
    archive.finalize();
  });
});
