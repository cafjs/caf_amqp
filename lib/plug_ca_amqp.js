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

"use strict";

/**
 * Plug for accessing a reliable message queue.
 *
 * @name caf_amqp/plug_ca_amqp
 * @namespace
 * @augments caf_components/gen_plug_ca
 *
 */
var caf_core =  require('caf_core');
var caf_comp = caf_core.caf_components;
var json_rpc = caf_core.caf_transport.json_rpc;
var myUtils = caf_comp.myUtils;
var genPlugCA = caf_comp.gen_plug_ca;

/**
 * Factory method for a reliable message queue plug for this CA.
 *
 * @see caf_components/supervisor
 */
exports.newInstance = function($, spec, cb) {
    try {

        var replyMethod = null;

        var that = genPlugCA.constructor($, spec);

        var queueName = $.ca.__ca_getName__() + '_reply';

        // transactional ops
        var target = {
            setHandleReplyMethodImpl: function(methodName, cb0) {
                replyMethod = methodName;
                if (methodName === null) {
                    $._.$.amqp.__ca_unsubscribe__(queueName, cb0);
                } else {
                    $._.$.amqp.__ca_subscribe__(queueName, function(id, msg) {
                        // TODO: Fix security hole
                        var m = json_rpc.systemRequest($.ca.__ca_getName__(),
                                                       methodName, id, msg);
                        $.ca.__ca_process__(m, function(err) {
                            if (err) {
                                $._.$.log &&
                                    $._.$.log.err('Got handler error ' +
                                                  myUtils.errToPrettyStr(err));
                            }
                        });
                    }, cb0);
                }
            },
            requestImpl: function(to, body, id,  cb0) {
                $._.$.amqp.__ca_request__(to, body, id, queueName, cb0);
            }
        };

        that.__ca_setLogActionsTarget__(target);

        that.setHandleReplyMethod = function(methodName) {
            that.__ca_lazyApply__("setHandleReplyMethodImpl", [methodName]);
        };

        that.request = function(to, body, id) {
            if (!replyMethod) {
                $._.$.log && $._.$.log.debug('No replyMethod');
                var err = new Error('No replyMethod set');
                throw err;
            } else {
                that.__ca_lazyApply__("requestImpl", [to, body, id]);
            }
        };

        // Framework methods
        var super__ca_resume__ = myUtils.superior(that, '__ca_resume__');
        that.__ca_resume__ = function(cp, cb0) {
            replyMethod = cp.replyMethod || null;
            super__ca_resume__(cp,  function(err) {
                if (err) {
                    cb0(err);
                } else {
                    if (replyMethod) {
                        target.setHandleReplyMethodImpl(replyMethod, cb0);
                    } else {
                        cb0(null);
                    }
                }
            });
        };

        var super__ca_prepare__ = myUtils.superior(that, '__ca_prepare__');
        that.__ca_prepare__ = function(cb0) {
            super__ca_prepare__(function(err, data) {
                                    if (err) {
                                        cb0(err, data);
                                    } else {
                                        data.replyMethod = replyMethod;
                                        cb0(err, data);
                                    }
                                });
        };

        var super__ca_shutdown__ = myUtils.superior(that, '__ca_shutdown__');
        that.__ca_shutdown__ = function(data, cb0) {
            if (replyMethod) {
                target.setHandleReplyMethodImpl(null, function(err) {
                    if (err) {
                        cb0(err);
                    } else {
                        super__ca_shutdown__(data, cb0);
                    }
                });
            } else {
                super__ca_shutdown__(data, cb0);
            }
        };


        cb(null, that);
    } catch (err) {
        cb(err);
    }
};
