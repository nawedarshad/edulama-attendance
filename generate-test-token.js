const jwt = require('jsonwebtoken'); // uses the installed @nestjs/jwt dependency's underlying lib or you can install jsonwebtoken if missing.
// Actually nestjs/jwt wraps it, but 'passport-jwt' might need it. 
// Let's assume 'jsonwebtoken' might not be directly callable if not installed, 
// but we installed `passport-jwt` which usually depends on `jsonwebtoken`.
// If not, we will see.

// Mock Payload
const payload = {
    id: 1,
    email: 'test@example.com',
    schoolId: 101,
    role: 'TEACHER',
    permissions: ['VIEW_ANNOUNCEMENT']
};

// Secret MUST match what is in .env or the fallback 'secret'
const secret = 'secret';

const token = jwt.sign(payload, secret);
console.log('\nCopy this token for your headers:\n');
console.log(token);
console.log('\n\nTest Command:');
console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:4005/test/profile`);
