exports.handler = async (event) => {
  const bucket = process.env['BUCKET'];
  const password = process.env['PASSWORD'];
  if (!bucket || !password) {
    console.log('bucket and password is required');
    return;
  }

  var aws = require('aws-sdk');
  var s3 = new aws.S3();
  var archiver = require('archiver');
  var PassThrough = require('stream').PassThrough;
  archiver.registerFormat(
    'zip-encryptable',
    require('archiver-zip-encryptable')
  );

  var getObject = function(key) {
    return s3.getObject({ Bucket: bucket, Key: key }).promise();
  };

  var passThrough = new PassThrough();
  var archive = archiver('zip-encryptable', {
    password: password
  });
  archive.pipe(passThrough);
  for (var i = 1; i <= 20; i++) {
    archive.append((await getObject('test1.txt')).Body.toString(), {
      name: `test${i}.txt`
    });
  }
  archive.finalize();

  var params = {
    Bucket: bucket,
    Key: `result-${Date.now()}.zip`,
    Body: passThrough
  };
  await s3.upload(params).promise();
};
