const crypto = require('crypto');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const S3_ENDPOINT = process.env.S3_ENDPOINT;
const S3_BUCKET = process.env.S3_BUCKET;
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY;
const S3_SECRET_KEY = process.env.S3_SECRET_KEY;
const S3_REGION = process.env.S3_REGION || 'us-east-1';

function hmac(key, data, encoding) {
  return crypto.createHmac('sha256', key).update(data).digest(encoding);
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function getSignatureKey(key, dateStamp, region, service) {
  const kDate = hmac('AWS4' + key, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, 'aws4_request');
}

async function uploadToS3(bucket, key, body, contentType) {
  const url = new URL(`${S3_ENDPOINT}/${bucket}/${key}`);
  const now = new Date();
  const dateStamp = now.toISOString().replace(/[-:T]/g, '').slice(0, 8);
  const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  
  const payloadHash = sha256(body);
  const method = 'PUT';
  const canonicalUri = `/${bucket}/${key}`;
  const canonicalQuerystring = '';
  
  const headers = {
    'host': url.host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
    'content-type': contentType || 'application/octet-stream',
    'content-length': body.length.toString(),
  };
  
  const signedHeaders = Object.keys(headers).sort().join(';');
  const canonicalHeaders = Object.keys(headers).sort().map(k => `${k}:${headers[k]}\n`).join('');
  
  const canonicalRequest = [
    method, canonicalUri, canonicalQuerystring,
    canonicalHeaders, signedHeaders, payloadHash
  ].join('\n');
  
  const credentialScope = `${dateStamp}/${S3_REGION}/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256', amzDate, credentialScope, sha256(canonicalRequest)
  ].join('\n');
  
  const signingKey = getSignatureKey(S3_SECRET_KEY, dateStamp, S3_REGION, 's3');
  const signature = hmac(signingKey, stringToSign, 'hex');
  
  const authHeader = `AWS4-HMAC-SHA256 Credential=${S3_ACCESS_KEY}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  
  return new Promise((resolve, reject) => {
    const proto = url.protocol === 'https:' ? https : http;
    const req = proto.request({
      hostname: url.hostname,
      port: url.port,
      path: canonicalUri,
      method: 'PUT',
      headers: {
        ...headers,
        'Authorization': authHeader,
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: 'ok', url: `${S3_ENDPOINT}/${bucket}/${key}` });
        } else {
          reject(new Error(`S3 upload failed: ${res.statusCode} ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

module.exports = { uploadToS3 };
