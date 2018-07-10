# CAF (Cloud Assistant Framework)

Co-design permanent, active, stateful, reliable cloud proxies with your web app or gadget.

See http://www.cafjs.com

## CAF AMQP
[![Build Status](https://travis-ci.org/cafjs/caf_amqp.svg?branch=master)](https://travis-ci.org/cafjs/caf_amqp)


This library provides components to access reliable message queues, such as RabbitMQ.

## API

    lib/proxy_amqp.js

## Configuration Example

### framework.json

        {
            "module": "caf_amqp/plug",
            "name": "amqp",
            "description": "Access to a reliable message queue\n Properties: <host> Queue hostname\n <port> Queue port",
             "env": {
                        "host": "localhost",
                        "port" : 5672,
                        "login": "guest",
                        "password": "guest",
                        "authMechanism": "AMQPLAIN"
                    }
        }

### ca.json

    {
            "module": "caf_amqp#plug_ca",
            "name": "amqp",
            "description": "Message queue access for this CA.",
            "env" : {
                "maxRetries" : "$._.env.maxRetries",
                "retryDelay" : "$._.env.retryDelay"
            },
            "components" : [
                {
                    "module": "caf_amqp#proxy",
                    "name": "proxy",
                    "description": "Proxy to amqp services for this CA",
                    "env" : {
                    }
                }
            ]
    }
