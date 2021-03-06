// Modifications copyright 2020 Caf.js Labs and contributors
/*!
Copyright 2013 Hewlett-Packard Development Company, L.P.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

'use strict';
/**
 * React.js plug for background rendering.
 *
 *
 * @name caf_react/plug_react
 * @namespace
 * @augments gen_plug
 *
 */
const assert = require('assert');
const amqp = require('amqp');
const caf_comp = require('caf_core').caf_components;
const myUtils = caf_comp.myUtils;
const genPlug = caf_comp.gen_plug;
const async = caf_comp.async;

const HEARTBEAT = 5; // check connection interval (in seconds)

/**
 * Factory method to connect to AMQP queues.
 *
 * @see caf_components/supervisor
 */
exports.newInstance = async function($, spec) {
    try {
        const that = genPlug.create($, spec);

        $._.$.log && $._.$.log.debug('New amqp plug');

        assert.equal(typeof spec.env.host, 'string',
                     "'spec.env.host' is not a string");
        const host = spec.env.host;

        assert.equal(typeof spec.env.port, 'number',
                     "'spec.env.port' is not a number");
        const port = spec.env.port;

        // optional authentication
        let login = typeof spec.env.login === 'string' ?
            spec.env.login :
            null;

        let password = typeof spec.env.password === 'string' ?
            spec.env.password :
            null;

        let authMechanism = typeof spec.env.authMechanism === 'string' ?
            spec.env.authMechanism :
            null;

        const options = {
            host: host,
            port: port,
            heartbeat: HEARTBEAT
        };

        if (login && password && authMechanism) {
            options.login = login;
            options.password = password;
            options.authMechanism = authMechanism;
        }

        let con = null;
        let exc = null;

        const allQueues = {};

        that.__ca_unsubscribe__ = function(queueName, cb0) {
            var q = allQueues[queueName];
            if (q) {
                delete allQueues[queueName];
                q.queue.unsubscribe(q.tag)
                    .addCallback(function() {
                        cb0(null);
                    });
            } else {
                cb0(null);
            }
        };

        that.__ca_subscribe__ = function(queueName, msgHandlerF, cb0) {
            if (allQueues[queueName]) {
                $._.$.log && $._.$.log.warn('Ignoring subscribe for ' +
                                            queueName);
                cb0(null);
            } else {
                con.queue(queueName, {
                    durable: true,
                    autoDelete: false
                }, function(q) {
                    q.subscribe(function (message) {
                        msgHandlerF(message.id, message.message);
                    }).addCallback(function(ok) {
                        allQueues[queueName] = {tag: ok.consumerTag, queue: q};
                        cb0(null);
                    });
                });
            }
        };

        that.__ca_request__ = function(to, body, id, replyQueue, cb0) {
            if (exc) {
                exc.publish(to, body, {
                    contentType: 'application/json',
                    correlationId: id,
                    replyTo: replyQueue,
                    durable: true
                }, cb0);
            } else {
                cb0(new Error('No exchange'));
            }
        };

        const super__ca_shutdown__ = myUtils.superior(that, '__ca_shutdown__');
        that.__ca_shutdown__ = function(data, cb0) {
            const unsubscribeAll = function(cb1) {
                async.map(Object.keys(allQueues), function(queueName, cb2) {
                    that.__ca_unsubscribe__(queueName, cb2);
                }, cb1);
            };
            if (that.__ca_isShutdown__) {
                cb0(null);
            } else {
                super__ca_shutdown__(data, function(err) {
                    if (err) {
                        cb0(err);
                    } else {
                        unsubscribeAll(function(err) {
                            if (err) {
                                cb0(err);
                            } else {
                                try {
                                    con && con.disconnect();
                                } catch (ex) {
                                    $._.$.log && $._.$.log.debug(
                                        'Error closing AMQP:' +
                                            myUtils.errToPrettyStr(ex)
                                    );
                                }
                                con = null;
                                exc = null;
                                cb0(null);
                            }
                        });
                    }
                });
            }
        };

        con = amqp.createConnection(options, {
            reconnect: false // rabbitmq only, with retries node doesn't exit
        });

        const p = new Promise(
            (resolve) => {
                con.on('ready', () => {
                    try {
                        exc = con.exchange(undefined, {confirm: true}, () => {
                            resolve([null, that]);
                        });
                    } catch (err) {
                        resolve([err]);
                    }
                });

                con.on('error', (err) => {
                    $._.$.log && $._.$.log.error('Lost AMQP connection:' +
                                                 myUtils.errToPrettyStr(err));
                    that.__ca_shutdown__(null, (err) => resolve([err]));
                });
            }
        );

        return p;
    } catch (err) {
        return [err];
    }
};
