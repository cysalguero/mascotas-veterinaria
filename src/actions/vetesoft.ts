'use server'

import https from 'https';

export interface VetesoftPatient {
    id_animal: number
    paciente: string
    especie: string
    raza: string
    nacido: string
    sexo: string
    color: string
    propietario: string
    documento: string
    direccion: string
    telefono: string
    email: string
    fec_crea: string
}

const VETESOFT_HOSTNAME = 'developers.vetesoft.org'
const VETESOFT_PATH = '/datosBasicos/'
const AUTH_TOKEN = 'd60a72b9-04a4-497e-8481-638d524d7a50'

function fetchVetesoftPatients(): Promise<VetesoftPatient[]> {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: VETESOFT_HOSTNAME,
            path: VETESOFT_PATH,
            method: 'GET',
            headers: {
                'Auth-Token': AUTH_TOKEN
            },
            rejectUnauthorized: false // Fix for SSL Error
        };

        const req = https.request(options, (res) => {
            if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
                return reject(new Error(`Status Code: ${res.statusCode}`));
            }

            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (Array.isArray(json)) {
                        resolve(json);
                    } else {
                        // Sometimes APIs wrap arrays in data object
                        // @ts-ignore
                        if (json.data && Array.isArray(json.data)) resolve(json.data);
                        else reject(new Error('API response is not an array'));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        req.end();
    });
}

export async function searchPatients(term: string): Promise<VetesoftPatient[]> {
    try {
        // Note: We are fetching ALL patients because the API does not document server-side search.
        // This is expensive (approx 1.2MB download).
        // We use a custom https request to bypass SSL certificate validation errors from the API.
        const allPatients = await fetchVetesoftPatients();

        if (!term.trim()) {
            return allPatients.slice(0, 50)
        }

        const lowerTerm = term.toLowerCase()
        return allPatients.filter(p =>
            (p.paciente && p.paciente.toLowerCase().includes(lowerTerm)) ||
            (p.propietario && p.propietario.toLowerCase().includes(lowerTerm)) ||
            (p.id_animal && p.id_animal.toString().includes(lowerTerm))
        ).slice(0, 50)

    } catch (error) {
        console.error('Error fetching patients:', error)
        return []
    }
}
