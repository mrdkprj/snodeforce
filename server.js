    const http = require('http');
    const fs = require('fs');
    const path = require('path');
    const handleRequest = require('./app.js');

    const mime = {
        html: 'text/html',
        css: 'text/css',
        gif: 'image/gif',
        jpg: 'image/jpeg',
        png: 'image/png',
        js: 'application/javascript'
    };

    // サーバーを生成
    const myServer = http.createServer(requestListener = (req, res) => {

        const reqPath = req.url.toString().split('?')[0];
        const type = mime[path.extname(reqPath).slice(1)] || 'text/html';

        switch(type){
            case "text/html":
                handleRequest.handleRequest(req, res);
                break;
            default:
                if (req.method !== 'GET') {
                    res.statusCode = 501;
                    res.setHeader('Content-Type', 'text/plain');
                    return res.end('Method not implemented');
                }
                const file = path.join(__dirname, reqPath)
                const stream = fs.createReadStream(file);
                stream.on('open', function () {
                    res.setHeader('Content-Type', type);
                    stream.pipe(res);
                });
                stream.on('error', function () {
                    res.setHeader('Content-Type', 'text/plain');
                    res.statusCode = 404;
                    res.end('Not found');
                });
                break;
        }
    });

    // ポート番号:8081で受け付け開始
    console.log("Server listening on port 8081");
    myServer.listen(port = 8081);