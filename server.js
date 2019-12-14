const http = require('http');
const fs = require('fs');
const handleRequest = require('./app.js');

// サーバーを生成
const myServer = http.createServer(requestListener = (req, res) => {
    // アクセス情報をターミナルに出力
    //console.log(`url:${req.url}`);
    //console.log(`method:${req.method}`);
    // http ヘッダーを出力
  var url = req.url; //リクエストからURLを取得
  var tmp = url.split('.'); //splitで . で区切られた配列にする 
  var ext = tmp[tmp.length - 1]; //tmp配列の最後の要素(外部ファイルの拡張子)を取得
  var path = '.' + url; //リクエストされたURLをサーバの相対パスへ変換する

  switch(ext){
    case 'js': //拡張子がjsならContent-Typeをtext/javascriptにする
       fs.readFile(path,function(err,data){
         res.writeHead(200,{"Content-Type":"text/javascript"});
         res.end(data,'utf-8');
       });
       break;
     case 'css':
       fs.readFile(path,function(err,data){
         res.writeHead(200,{"Content-Type":"text/css"});
         res.end(data,'utf-8');
       });
       break;     
     default:
      handleRequest.handleRequest(req, res);
     /*
       fs.readFile('main.html',function(err,data){
         res.writeHead(200,{"Content-Type":"text/html"});
         res.end(data,'utf-8');
       })
       */
       break;
  }  
});

// ポート番号:8081で受け付け開始
console.log("Server listening on port 8081");
myServer.listen(port = 8081);