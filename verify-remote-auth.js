const axios = require('axios'); // Requires axios, or we can use http/https standard libs if axios not installed.
// We installed @nestjs/axios which depends on axios, so we might need to require it from node_modules if not global.
// Or just use plain http for fewer deps issues in this script.

const http = require('http');

const AUTH_MS_URL = 'http://localhost:4000/auth'; // Based on .env
const LOCAL_APP_URL = 'http://localhost:4005';

const credentials = {
    email: 'principal@gmail.com',
    password: '12345678',
    schoolCode: 'DEMO'
};

function loginToAuthMs() {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(credentials);
        const url = new URL(`${AUTH_MS_URL}/login`);

        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        const parsed = JSON.parse(body);
                        console.log('Login Successful!');
                        resolve(parsed.accessToken);
                    } catch (e) { reject('Failed to parse login response'); }
                } else {
                    reject(`Login Failed: ${res.statusCode} - ${body}`);
                }
            });
        });

        req.on('error', (e) => reject(e.message));
        req.write(data);
        req.end();
    });
}

function verifyLocalService(token) {
    return new Promise((resolve, reject) => {
        const url = new URL(`${LOCAL_APP_URL}/test/profile`);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                console.log(`\nLocal Service Response (${res.statusCode}):`);
                console.log(body);
                resolve();
            });
        });

        req.on('error', (e) => reject(e.message));
        req.end();
    });
}

async function run() {
    try {
        console.log('1. Attempting login to Auth MS...');
        const token = await loginToAuthMs();
        console.log('   Token received (truncated):', token.substring(0, 30) + '...');

        console.log('\n2. Testing Local Service with this token...');
        await verifyLocalService(token);

    } catch (error) {
        console.error('Error:', error);
    }
}

run();
