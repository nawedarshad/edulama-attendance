import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as AWS from 'aws-sdk';

@Injectable()
export class SpacesService {
  private s3: AWS.S3;
  private bucket: string;

  constructor() {
    this.s3 = new AWS.S3({
      endpoint: process.env.SPACES_ENDPOINT, // https://blr1.digitaloceanspaces.com
      region: process.env.SPACES_REGION, // blr1
      accessKeyId: process.env.SPACES_KEY,
      secretAccessKey: process.env.SPACES_SECRET,
      signatureVersion: 'v4',
    });

    this.bucket = process.env.SPACES_BUCKET!;
  }

  async uploadFile(
    file: Express.Multer.File,
    folder = 'emergency',
  ): Promise<string> {
    try {
      const key = `${folder}/${Date.now()}-${file.originalname}`;

      await this.s3
        .putObject({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ACL: 'public-read',
          ContentType: file.mimetype,
        })
        .promise();

      return `${process.env.SPACES_CDN}/${key}`;
    } catch (error) {
      console.error('Spaces Upload Error:', error);
      throw new InternalServerErrorException('Failed to upload file');
    }
  }
}
