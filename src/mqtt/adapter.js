import mqtt from 'async-mqtt';

export class MqttAdapter {
    /**
     * @param  {Object} config
     * @param  {Object} logger
     */
    constructor(config, logger) {
        const { host, username, password } = config.mqtt;

        this.log = logger.withTag('MQTT');

        this.client = mqtt.connect(host, { username, password });
    }

    /**
     * Sends either a single message, or an array of messages.
     * @param  {Array|Object}  something
     * @return {Promise<undefined>}
     */
    publish(something) {
        return Array.isArray(something)
            ? this.publishBatch(something)
            : this.publishMessage(something);
    }

    /**
     * Publishes a single message.
     * @param  {MqttMessage} message
     * @return {Promise<undefined>}
     */
    publishMessage(message) {
        if (message.isEmpty()) {
            this.log.debug('Dropping empty payload', message.topic);
            return Promise.resolve();
        }

        this.log.debug(`Publishing ${message.topic}`);
        this.log.verbose(message.payload);

        return this.client.publish(message.topic, message.serialize(), message.options);
    }

    /**
     * Publishes many messages.
     * @param  {Array} messages
     * @return {Promise<undefined>}
     */
    publishBatch(messages) {
        return Promise.all(messages.map(msg => this.publishMessage(msg)));
    }

    /**
     * Subscribes to topic and executes the handler function
     * on every message with that topic.
     * @param  {String}   topic
     * @param  {Function} handle
     * @return {Void}
     */
    subscribe(topic, handle) {
        this.log.info(`Subscribing on topic ${topic}`);

        this.client.subscribe(topic);

        this.client.on('message', (msgTopic, message) => {
            return msgTopic === topic && handle(message.toString());
        });
    }
}
