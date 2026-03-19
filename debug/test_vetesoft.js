const https = require('https');

const options = {
    hostname: 'developers.vetesoft.org',
    path: '/datosBasicos/',
    method: 'GET',
    headers: {
        'Auth-Token': 'd60a72b9-04a4-497e-8481-638d524d7a50'
    }
};

console.log("Starting request...");
const start = Date.now();

const req = https.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);

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
            console.log(`Is Array: ${Array.isArray(json)}`);
            if (Array.isArray(json)) {
                console.log(`Count: ${json.length}`);
                console.log(`First item:`, json[0]);
            } else {
                console.log(`Type: ${typeof json}`);
                console.log(`Keys: ${Object.keys(json)}`);
            }
        } catch (e) {
            console.error("Failed to parse JSON", e.message);
            console.log("First 100 chars:", data.substring(0, 100));
        }
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.end();
