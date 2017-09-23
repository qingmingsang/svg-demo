var express = require('express');
var app = express();

app.use(express.static('./'));

app.get('/', function (req, res) {
    res.send('Hello World!');
});


var setPort = process.env.PORT || 3000;
var server = app.listen(setPort, function () {
    var host = server.address().address;
    var port = server.address().port;

    console.log(`Example app listening at ${port}`);
});
