const jwt = require('jsonwebtoken'); // Assumed available via @nestjs/jwt
const http = require('http');

const payload = {
    id: 123,
    email: 'verified@example.com',
    schoolId: 99,
    role: 'PRINCIPAL',
    permissions: ['MANAGE_ATTENDANCE']
};
const secret = 'secret'; // The fallback secret in our strategy
const token = jwt.sign(payload, secret);

console.log('Testing with token:', token.substring(0, 20) + '...');

const options = {
    hostname: 'localhost',
    port: 4005,
    path: '/test/profile',
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${token}`
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        console.log(`BODY: ${chunk}`);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.end();
