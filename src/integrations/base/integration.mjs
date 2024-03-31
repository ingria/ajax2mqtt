import { A2M_MQTT_BASE_TOPIC } from '#src/config.mjs';
import { AjaxBridge } from '#src/ajax/devices/index.mjs';
import { MqttMessage } from '#src/mqtt/message.mjs';

export class BaseWrapper {
    #device = undefined;

    constructor(device) {
        this.#device = device;
    }

    /**
     * https://github.com/mqttjs/MQTT.js#mqttclientpublishtopic-message-options-callback
     * @return {Object}
     */
    static #getMqttPublishOptions() {
        return {
            qos: 1,
        };
    }

    /**
     * Creates device MQTT topic base name (~).
     * @param  {?String} suffix
     * @return {String}
     */
    static #buildMqttDeviceTopicByDeviceId(deviceId, suffix) {
        return [
            A2M_MQTT_BASE_TOPIC,
            deviceId,
            suffix,
        ].filter(Boolean).join('/');
    }

    /**
     * @param  {String} action
     * @return {String}
     */
    #getMqttSensorCommandTopic(action) {
        return BaseWrapper.#buildMqttDeviceTopicByDeviceId(this.#device.deviceId, action);
    }

    static getMqttSensorStateTopicByDeviceId(deviceId) {
        return BaseWrapper.#buildMqttDeviceTopicByDeviceId(deviceId, 'state');
    }

    #getMqttSensorStateTopic() {
        return BaseWrapper.getMqttSensorStateTopicByDeviceId(this.#device.deviceId);
    }

    /**
     * @return {Map<String, Function>}
     */
    getDeviceActions() {
        let actions = new Map();

        if (this.#device.constructor === AjaxBridge) {
            const device = this.#device;

            actions = new Map([
                [this.#getMqttSensorCommandTopic('arm'), () => device.arm()],
                [this.#getMqttSensorCommandTopic('disarm'), () => device.disarm()],
                [this.#getMqttSensorCommandTopic('allow_join'), () => device.enterPairingMode()],
                [this.#getMqttSensorCommandTopic('disallow_join'), () => device.exitPairingMode()],
                [this.#getMqttSensorCommandTopic('unpair'), id => device.unpairDevice(id)],
                [this.#getMqttSensorCommandTopic('set_offline_threshold'), value => device.setOfflineThreshold(value)],
            ]);
        }

        return actions;
    }

    /**
     * @return {MqttMessage[]}
     */
    getStateUpdateMessages() {
        const message = new MqttMessage({
            topic: this.#getMqttSensorStateTopic(),
            payload: { ...this.#device.state },
            options: BaseWrapper.#getMqttPublishOptions(),
        });

        return Array.of(message);
    }
}
