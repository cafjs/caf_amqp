var Server = require('./index.js').Server;

var config = {};

// address of the reliable queue
config.mqHost = 'localhost';

// name of the queue this server listens to
config.queue = 'foo';


var processMessage = function(msg, cb) {
    cb(null, {test:true, value: msg.value + 1});
};

var s = new Server(config, processMessage);

s.start(function(err) {
            if (err) {
                console.log(err);
            } else {
                console.log('Started...');
            }
        });
