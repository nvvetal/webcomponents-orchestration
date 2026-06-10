const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.md': 'text/plain',
};

function createServer(root, port) {
    return new Promise((resolve, reject) => {
        const server = http.createServer((req, res) => {
            let urlPath = decodeURIComponent(req.url.split('?')[0]);
            if (urlPath === '/') urlPath = '/index.html';
            const filePath = path.join(root, urlPath);
            const ext = path.extname(filePath);

            fs.readFile(filePath, (err, data) => {
                if (err) {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('Not Found: ' + urlPath);
                    return;
                }
                res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
                res.end(data);
            });
        });

        server.listen(port, '127.0.0.1', () => {
            console.log(`Static server running at http://127.0.0.1:${port}`);
            resolve(server);
        });
        server.on('error', reject);
    });
}

module.exports = { createServer };
