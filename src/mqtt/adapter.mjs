import mqtt from 'mqtt';
import createLogger from '#src/log.mjs';
import { A2M_MQTT_ADDRESS, A2M_MQTT_PASSWORD, A2M_MQTT_USERNAME, A2M_MQTT_BASE_TOPIC } from '#src/config.mjs';

export class MqttAdapter {
    /**
     * @type {MqttClient}
     */
    #client = undefined;

    /**
     * @param  {Object} config
     */
    constructor() {
        this.log = createLogger({ tag: 'mqtt' });
    }

    /**
     * @return {Promise<undefined>}
     */
    async connect() {
        this.#client = await mqtt.connect(A2M_MQTT_ADDRESS, {
            username: A2M_MQTT_USERNAME,
            password: A2M_MQTT_PASSWORD,
        });

        this.log.info(`Connected to ${A2M_MQTT_ADDRESS}`);

        await this.#client.publishAsync(`${A2M_MQTT_BASE_TOPIC}/hello`, 'hello');
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
    async publishMessage(message) {
        if (message.isEmpty()) {
            this.log.debug('Dropping empty payload', message.topic);
            return undefined;
        }

        this.log.debug(`Publishing ${message.topic}`);
        this.log.verbose(message.payload);

        return await this.#client.publishAsync(
            message.topic,
            message.serialize(),
            message.options,
        );
    }

    /**
     * Publishes many messages.
     * @param  {MqttMessage[]} messages
     * @return {Promise<Array>}
     */
    async publishBatch(messages) {
        return await Promise.all(messages.map(msg => this.publishMessage(msg)));
    }

    /**
     * Subscribes to topic and executes the handler function
     * on every message with that topic.
     * @param  {String}   topic
     * @param  {Function} handle
     * @return {Void}
     */
    async subscribe(topic, handle) {
        this.log.info(`Subscribing on topic ${topic}`);

        const granted = await this.#client.subscribeAsync(topic);

        this.log.verbose(`Subscribed to topics: ${granted.map(JSON.stringify).join(', ')}`);

        this.#client.on('message', (msgTopic, message) => {
            if (msgTopic === topic) {
                return handle(message.toString());
            }

            return true;
        });
    }
}
