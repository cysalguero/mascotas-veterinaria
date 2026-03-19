const https = require('https');

const options = {
    hostname: 'developers.vetesoft.org',
    path: '/datosBasicos/',
    method: 'GET',
    headers: {
        'Auth-Token': 'd60a72b9-04a4-497e-8481-638d524d7a50'
    },
    rejectUnauthorized: false // Ignore SSL error
};

console.log("Starting request...");
const start = Date.now();

const req = https.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        const end = Date.now();
        console.log(`Request took ${end - start}ms`);
        console.log(`Data length: ${data.length} characters`);
        try {
            const json = JSON.parse(data);
            if (Array.isArray(json)) {
                console.log(`Count: ${json.length}`);
                console.log(`First item:`, json[0]);
            }
        } catch (e) {
            console.error("Failed to parse JSON", e.message);
        }
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.end();
