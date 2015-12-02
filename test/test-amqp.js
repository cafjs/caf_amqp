"use strict"

var hello = require('./hello/main.js');
var app = hello;
var caf_core = require('caf_core');
var myUtils = caf_core.caf_components.myUtils;
var async = caf_core.async;
var cli = caf_core.caf_cli;

var CA_OWNER_1='amqpother1';
var CA_LOCAL_NAME_1='bar1';
var FROM_1 =  CA_OWNER_1 + '-' + CA_LOCAL_NAME_1;

var TO_QUEUE='foo';

var BODY = {test: true, value: 0};
var BODY_REPLY = {test: true, value: 1};

var Server = require('./server/index.js').Server;

var config = {};

// address of the reliable queue
config.mqHost = 'localhost';

// name of the queue this server listens to
config.queue = 'foo';


var processMessage = function(msg, cb) {
    cb(null, {test:true, value: msg.value + 1});
};

var s = new Server(config, processMessage);

process.on('uncaughtException', function (err) {
               console.log("Uncaught Exception: " + err);
               console.log(myUtils.errToPrettyStr(err));
               process.exit(1);

});

module.exports = {
    setUp: function (cb) {
       var self = this;
        app.init( {name: 'top'}, 'framework.json', null,
                      function(err, $) {
                          if (err) {
                              console.log('setUP Error' + err);
                              console.log('setUP Error $' + $);
                              // ignore errors here, check in method
                              cb(null);
                          } else {
                              self.$ = $;
			      s.start(function(err) {
				  if (err) {
				      console.log(err);
				  } else {
				      console.log('Started...');
				  }
				  cb(err, $);
			      });
                          }
                      });
    },
    tearDown: function (cb) {
        var self = this;
	s.stop();
        if (!this.$) {
            cb(null);
        } else {
	    console.log('********');
            this.$.top.__ca_graceful_shutdown__(null, cb);
        }
    },
    amqp: function (test) {
        test.expect(6);
        var s1;
        var from1 = FROM_1;
        var id;

        async.series(
            [
                function(cb) {
                    s1 = new cli.Session('ws://foo-xx.vcap.me:3000', from1, {
                        from : from1
                    });
                    s1.onopen = function() {
                        var cb1 = function(err, reqId) {
                            test.ifError(err);
                            id = reqId;
                            test.equal(typeof reqId, 'string');
                            cb(null);
                        };
                        s1.request(TO_QUEUE, BODY,  cb1);
                    };
                },
                function(cb) {
                    // give time to server to reply
                    setTimeout(function() {cb(null);}, 2000);
                },
                function(cb) {
                    var cb1 = function(err, reply) {
                        test.ifError(err);
                        test.deepEqual(reply, BODY_REPLY);
                        cb(null);
                    };
                    s1.getReply(id, cb1);
                },
                function(cb) {
                    s1.onclose = function(err) {
                        test.ifError(err);
                        cb(null, null);
                    };
                    s1.close();
                }
            ], function(err, res) {
                test.ifError(err);
                test.done();
            });
    }
};
