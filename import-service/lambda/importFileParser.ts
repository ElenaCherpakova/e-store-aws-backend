import * as AWS from 'aws-sdk';
import { S3Event, S3Handler } from 'aws-lambda';
import csvParser from 'csv-parser';

const s3 = new AWS.S3();

export const handler: S3Handler = async (event: S3Event): Promise<void> => {
  console.log('Received S3 event:', JSON.stringify(event, null, 2));

  try {
    const record = event.Records[0];
    const bucketName = record.s3.bucket.name;
    const objectKey = record.s3.object.key;

    console.log(`File ${objectKey} has been uploaded to ${bucketName}`);

    if (!objectKey.startsWith('uploaded/')) {
      console.log(`File ${objectKey} is not in the 'uploaded/' folder. Skipping processing.`);
      return;
    }

    const getObjectParams = {
      Bucket: bucketName,
      Key: objectKey,
    };

    console.log('Getting object from S3...');
    const s3Stream = s3.getObject(getObjectParams).createReadStream();

    const records: any[] = [];
    console.log('Starting CSV parsing...');

    await new Promise<void>((resolve, reject) => {
      s3Stream
        .pipe(csvParser())
        .on('data', (data: any) => {
          console.log('Parsed record:', data);
          records.push(data);
        })
        .on('end', async () => {
          console.log('CSV parsing finished.');
          console.log('Records:', records);

          const newKey = objectKey.replace('uploaded/', 'parsed/');
          console.log(`Moving file to ${newKey}...`);

          const copyParams = {
            Bucket: bucketName,
            CopySource: `${bucketName}/${objectKey}`,
            Key: newKey,
          };

          const deleteParams = {
            Bucket: bucketName,
            Key: objectKey,
          };

          try {
            await s3.copyObject(copyParams).promise();
            console.log(`File ${objectKey} has been copied to ${newKey}`);
            await s3.deleteObject(deleteParams).promise();
            console.log(`File ${objectKey} has been deleted from 'uploaded/' folder.`);
            resolve();
          } catch (error) {
            console.error('Error during file move operation:', error);
            reject(error);
          }
        })
        .on('error', (error: Error) => {
          console.error('Error during CSV parsing:', error);
          reject(error);
        });
    });

    console.log('Lambda function execution finished successfully.');
  } catch (error) {
    console.error('Error processing S3 event:', error);
    throw error;
  }
};
