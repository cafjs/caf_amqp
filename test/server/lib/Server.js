"use strict";


var amqp = require('amqp');
var async = require('caf_components').async;


var Server = exports.Server = function(config, processF) {
    this.config  = config;
    this.processF = processF;
    this.queue = async.queue(function(task, cb) {
        processF(task, cb);
    }, 1); // serialize
};

Server.prototype.start = function(cb) {
    var self = this;

    var reply = function(message, deliveryInfo) {
        if (deliveryInfo.correlationId && deliveryInfo.replyTo) {
            self.exc.publish(deliveryInfo.replyTo, {
                message: message,
                id :deliveryInfo.correlationId
            });
        }
    };

    var subscribe = function(q) {
        q.subscribe({
            ack: true,
            prefetchCount: 1
        }, function (message, headers, deliveryInfo, ack) {
            console.log(message);
            self.queue.push(message,
                            function(err, response) {
                                if (err) {
                                    reply(err, deliveryInfo);
                                } else {
                                    reply(response, deliveryInfo);
                                }
                                ack.acknowledge();
                            });
        });
    };

    this.con = amqp.createConnection({
        host: self.config.mqHost,
        heartbeat : 5
    }, {
        reconnect: false
    });

    this.con.on('ready', function () {
        async.series(
            [
                function(cb0) {
                    self.exc = self.con.exchange();
                    self.exc.on('open', cb0);
                }
            ], function(err, data) {
                if (err) {
                    console.log('Error with exchange');
                    self.con.close();
                } else {
                    self.con.queue(self.config.queue, {
                        durable: true,
                        autoDelete: false
                    }, subscribe);
                }
                cb(err, data);
            });
    });


    this.con.on('close', function(x) {
        console.log('closed'+x);
    });

    this.con.on('error', function(x) {
        console.log('error'+x);
    });
};

Server.prototype.stop = function() {
    this.con.disconnect();
};
