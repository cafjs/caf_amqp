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
 * Proxy to access a reliable message queue.
 *
 * @name caf_react/proxy_amqp
 * @namespace
 * @augments gen_proxy
 *
 */
const caf_core = require('caf_core');
const caf_comp = caf_core.caf_components;
const genProxy = caf_comp.gen_proxy;
const uuid = require('node-uuid').v4;

/**
 * Factory method to interact with a external message queue.
 *
 * @see sup_main
 */
exports.newInstance = async function($, spec) {
    try {
        const that = genProxy.create($, spec);

        /**
         * Sets the name of the method in this CA that will process reply
         * messages in this CA's queue.
         *
         * The name of the reply queue is always this CA's name + '_reply'.
         *
         * Until this method is called the CA will not receive any replies.
         *
         * To stop receiving replies, just set it to 'null'
         *
         * The type of the method should be 'function(messageId, body, cb)'
         *
         * where 'messageId' is an unique identifier to match the request.
         *       'body' is the JSON-parsed response
         *       'cb' is just the usual callback to notify completion.
         *
         * @param {string| null} methodName The name of this CA's method that
         *  process reply messages.
         *
         * @name caf_amqp/setHandleReplyMethod
         * @function
         *
         */
        that.setHandleReplyMethod = function(methodName) {
            $._.setHandleReplyMethod(methodName);
        };


        /**
         * Queues a message. The return message id can be used to match
         * requests/responses.
         *
         *
         * @param {string} to Destination queue name (or CA name).
         * @param {Object} body A JSON serializable object to queue.
         *
         * @return {string} A unique ID for this request.
         * @name caf_amqp/request
         * @function
         *
         */
        that.request = function(to, body) {
            const uuidVal = uuid();
            $._.request(to, body, uuidVal);
            return uuidVal;
        };

        Object.freeze(that);
        return [null, that];
    } catch (err) {
        return [err];
    }
};
