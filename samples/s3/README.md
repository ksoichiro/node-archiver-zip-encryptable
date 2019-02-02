# AWS S3 sample

Compress files on S3 into a zip file and put it on to S3 again.

## Create dummy text files

```sh
sh generate.sh test1.txt
```

This will create `test1.txt` which size is about 24MB.  
Upload `test1.txt` to your S3 bucket.

## Create Lambda module

```sh
npm install
sh archive.sh
```

## Set up Lambda function and execute

1. Create a Lambda function
1. Upload `lambda.zip` to the function

   - Tested runtime is `Node.js 8.10`.

1. Set environment variables

   - `BUCKET`: your S3 bucket name
   - `PASSWORD`: password to encrypt zip file

1. Set role with S3 write permission
1. Set appropriate memory and timeout.

   - Tested with 1024MB and 30 sec.

1. Click test button to run

   Execution results example:

   ```
   Response:
   null
   Request ID:
   "76d755ab-d4b1-43aa-9869-59cbec9e23a2"
   Function Logs:
   START RequestId: 76d755ab-d4b1-43aa-9869-59cbec9e23a2 Version: \$LATEST
   END RequestId: 76d755ab-d4b1-43aa-9869-59cbec9e23a2
   REPORT RequestId: 76d755ab-d4b1-43aa-9869-59cbec9e23a2 Duration: 22321.15 ms Billed Duration: 22400 ms Memory Size: 1024 MB Max Memory Used: 238 MB
   ```

1. A zip file like `result-1549077941879.zip` should be created on your bucket.
