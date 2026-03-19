const https = require('https');

const options = {
    hostname: 'developers.vetesoft.org',
    path: '/datosBasicos/',
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
            if (Array.isArray(json)) {
                // Find a patient with a likely photo field or just print all keys of the first few
                const sample = json.slice(0, 3);
                console.log("Sample Keys:", Object.keys(sample[0]));

                // Look for any field resembling 'foto', 'img', 'url', 'picture'
                const possiblePhotoFields = json.filter(p => {
                    const keys = Object.keys(p).join(',').toLowerCase();
                    return keys.includes('foto') || keys.includes('img') || keys.includes('pic') || keys.includes('url');
                }).slice(0, 1);

                if (possiblePhotoFields.length > 0) {
                    console.log("Found record with possible photo:", possiblePhotoFields[0]);
                } else {
                    console.log("No obvious photo fields found in keys.");
                }

                // Check specific vaccine fields
                console.log("Vaccine Sample:", sample.map(p => ({
                    paciente: p.paciente,
                    es_vacunal: p.es_vacunal,
                    es_antipara: p.es_antipara,
                    alert_info: p.alert_info
                })));
            }
        } catch (e) {
            console.error(e);
        }
    });
});

req.on('error', (e) => console.error(e));
req.end();
