var http = require('http');

var options = {
    hostname: 'oa.starc.com.cn',
    port: 80,
    path: '/storage/api/service/status',
    method: 'GET',
};

var req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
    res.setEncoding('utf8');
    //must have listend to 'data' 
    res.on('data', (chunk) => {
        console.log(`BODY: ${chunk}`);
    });
    //or else there will be no 'end' event
    res.on('end', () => {
        console.log('No more data in response.');
    });
});

req.on('error', (e) => {
    console.log(`problem with request: ${e.message}`);
});

// write data to request body
// req.write(postData);
req.end();