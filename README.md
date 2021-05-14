# archiver-zip-encryptable

> An extension for archiver to zip with password encryption.

[![GitHub Actions master](https://img.shields.io/github/workflow/status/ksoichiro/node-archiver-zip-encryptable/main/master.svg?logo=github&style=flat-square)](https://travis-ci.org/ksoichiro/node-archiver-zip-encryptable)
[![AppVeyor master](https://img.shields.io/appveyor/ci/ksoichiro/node-archiver-zip-encryptable/master.svg?logo=appveyor&style=flat-square)](https://ci.appveyor.com/project/ksoichiro/node-archiver-zip-encryptable)
[![Coveralls master](https://img.shields.io/coveralls/ksoichiro/node-archiver-zip-encryptable/master.svg?style=flat-square&maxAge=2592000)](https://coveralls.io/github/ksoichiro/node-archiver-zip-encryptable)
[![npm](https://img.shields.io/npm/v/archiver-zip-encryptable.svg?style=flat-square)](https://www.npmjs.com/package/archiver-zip-encryptable)
[![GitHub license](https://img.shields.io/github/license/ksoichiro/node-archiver-zip-encryptable.svg?style=flat-square)](https://github.com/ksoichiro/node-archiver-zip-encryptable/blob/master/LICENSE)

This extension adds some formats to handle encryption to [archiver](https://github.com/archiverjs/node-archiver).  
Currently this package supports only creating zip with traditional PKWARE encryption.

## Install

```sh
npm install archiver-zip-encryptable --save
```

## Usage

Call `archiver.registerFormat()` to register this module to `archiver`, then archive with password.

```js
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
```

## Credits

- [yeka/zip](https://github.com/yeka/zip) - password protected zip, Golang implementation
- [.ZIP File Format Specification](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT)

## License

MIT
