const jwt = require('jsonwebtoken');

const payload = {
    id: 1,
    email: 'test@example.com',
    schoolId: 1,
    role: 'TEACHER',
    permissions: []
};
const secret = 'secret'; // Fallback used in strategy
const token = jwt.sign(payload, secret);
console.log(token);
