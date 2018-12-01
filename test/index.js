var expect = require('chai').expect;
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var temp = require('temp').track();
var archiver = require('archiver');
var readline = require("readline");
var PassThrough = require('stream').PassThrough;
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
      expect(content.slice(0x1a, 0x1a + 4).readUInt32LE()).to.equal('test.txt'.length);
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

  it('archives file by filename', function(done) {
    var tempDir = temp.mkdirSync('out');
    mkdirp.sync(path.join(tempDir, 'out'));
    var cwd = process.cwd();
    var ws = fs.createWriteStream(tempDir + '/out/loremipsum.txt');
    var fileContent = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.\n';
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
      expect(content.slice(0x1e, 0x1e + entryName.length).toString('ascii')).to.eql(entryName);
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
        leve: 9,
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
