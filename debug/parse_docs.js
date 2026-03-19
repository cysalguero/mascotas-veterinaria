const fs = require('fs');
const data = JSON.parse(fs.readFileSync('vetesoft_docs.json', 'utf8'));

function printItems(items, depth = 0) {
    items.forEach(item => {
        console.log('  '.repeat(depth) + item.name);
        if (item.request && item.request.url) {
            let url = item.request.url;
            if (typeof url === 'object' && url.raw) url = url.raw;
            console.log('  '.repeat(depth + 1) + 'URL: ' + url);
        }
        if (item.item) {
            printItems(item.item, depth + 1);
        }
    });
}

printItems(data.item);
