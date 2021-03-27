/**
 * This class represents a MQTT message.
 */
export class MqttMessage {
    /**
     * @param  {String} options.topic
     * @param  {Object} options.payload
     * @param  {Object} options.options
     */
    constructor({ topic, payload, options = {} }) {
        this.topic = topic;
        this.payload = payload;
        this.options = options;
    }

    /**
     * Whether the current payload is empty.
     * @return {Boolean}
     */
    isEmpty() {
        return this.payload === null || this.payload === undefined;
    }

    /**
     * Prepares the values for publishing.
     * @return {Mixed}
     */
    serialize() {
        return typeof(this.payload) === "object"
            ? JSON.stringify(this.payload)
            : this.payload;
    }
}
