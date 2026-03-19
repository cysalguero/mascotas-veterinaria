const https = require('https');

const options = {
    hostname: 'developers.vetesoft.org',
    path: '/historiaClinica/?id_animal=1166', // Using an ID from previous results
    method: 'GET',
    headers: {
        'Auth-Token': 'd60a72b9-04a4-497e-8481-638d524d7a50'
    },
    rejectUnauthorized: false
};

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log(JSON.stringify(json, null, 2).substring(0, 2000));
        } catch (e) {
            console.error("Error", e);
            console.log(data);
        }
    });
});

req.on('error', (e) => console.error(e));
req.end();
