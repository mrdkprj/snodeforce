    const http = require('http');
    const fs = require('fs');
    const path = require('path');
    const handleRequest = require('./app.js');

    var mime = {
        html: 'text/html',
        css: 'text/css',
        gif: 'image/gif',
        jpg: 'image/jpeg',
        png: 'image/png',
        js: 'application/javascript'
    };

    // サーバーを生成
    const myServer = http.createServer(requestListener = (req, res) => {

        var reqpath = req.url.toString().split('?')[0];
        var type = mime[path.extname(reqpath).slice(1)] || 'text/html';

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
                var file = path.join(__dirname, reqpath)
                var s = fs.createReadStream(file);
                s.on('open', function () {
                    res.setHeader('Content-Type', type);
                    s.pipe(res);
                });
                s.on('error', function () {
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