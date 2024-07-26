import { AjaxFireProtect, AjaxFireProtectPlus, AjaxBridge } from '#src/ajax/devices/index.mjs';
import { MqttMessage } from '#src/integrations/hass/message.mjs';
import { schema } from '#src/integrations/hass/common.mjs';
import { BaseWrapper } from '#src/integrations/base/integration.mjs';
import createLogger from '#src/log.mjs';
import {
    A2M_APP_NAME,
    A2M_APP_SUPPORT_URL,
    A2M_APP_VERSION,
    A2M_MQTT_BASE_TOPIC,
    A2M_HASS_BASE_TOPIC,
    A2M_HASS_USE_SHARED_STATE_TOPIC,
} from '#src/config.mjs';

/**
 * This class enables homeassistant mqtt integration with ajax devices.
 */
export class HassWrapper {
    #device = undefined;
    #log = undefined;

    constructor(device) {
        this.#device = device;
        this.#log = createLogger({ tag: 'hass' });
    }

    /**
     * @return {String}
     */
    #makeHassDeviceIdentifier(deviceId) {
        return `ajax2mqtt_${deviceId}`;
    }

    /**
     * @return {String}
     */
    #makeHassDeviceName() {
        const className = this.#device.constructor.name;
        const deviceName = className.replace('Ajax', '');

        return `${deviceName}#${this.#device.deviceId}`;
    }

    /**
     * @return {Object}
     */
    #getHassDeviceConfig() {
        const config = {
            manufacturer: 'Ajax Systems',
            model: this.#device.deviceModel,
            sw_version: this.#device.deviceName,
            serial_number: this.#device.deviceId,
            name: this.#makeHassDeviceName(),
            via_device: undefined,
            identifiers: [
                this.#makeHassDeviceIdentifier(this.#device.deviceId),
            ],
        };

        if (!this.#device.isBridge()) {
            config.via_device = this.#makeHassDeviceIdentifier(
                this.#device.getBridgeDevice().deviceId,
            );
        }

        return config;
    }

    /**
     * Creates HASS sensor configuration (sensor name, icon, unit, etc).
     * @return {Object}
     */
    #getDeviceExposedSensors() {
        const importFromSchema = (...keys) => Object.fromEntries(keys.map(key => [key, schema[key]]));
        const commonSensors = ['noise', 'rssi', 'temperature', 'voltage', 'battery_low'];

        switch (this.#device.constructor) {
            case AjaxFireProtect: {
                return importFromSchema(
                    ...commonSensors,
                    'tamper',
                    'backup_battery_voltage',
                    'backup_battery_low',
                    'battery',
                    'smoke',
                    'smoke_chamber_malfunction',
                    'chamber_dust_percent',
                );
            }

            case AjaxFireProtectPlus: {
                return importFromSchema(
                    ...commonSensors,
                    'tamper',
                    'backup_battery_voltage',
                    'backup_battery_low',
                    'battery',
                    'smoke',
                    'smoke_chamber_malfunction',
                    'chamber_dust_percent',
                    'co',
                    'co_chamber_malfunction',
                );
            }

            case AjaxBridge: {
                return {
                    permit_join: {
                        '@type': 'switch',
                        'icon': 'mdi:human-greeting-proximity',
                        'command_topic': this.#getMqttSensorCommandTopic('permit_join'),
                        'payload_off': false,
                        'payload_on': true,
                        'name': 'Permit join',
                    },
                    is_armed: {
                        '@type': 'switch',
                        'name': 'Arm',
                        'icon': 'mdi:shield',
                        'command_topic': this.#getMqttSensorCommandTopic('arm'),
                        'payload_off': false,
                        'payload_on': true,
                    },
                };
            }
        }

        return {};
    }

    /**
     * https://github.com/mqttjs/MQTT.js#mqttclientpublishtopic-message-options-callback
     * @return {Object}
     */
    #getMqttPublishOptions() {
        return {
            qos: 1,
        };
    }

    /**
     * @param  {String} key
     * @return {String}
     */
    #getHassSensorUniqueId(key) {
        return `ajax2mqtt_${this.#device.deviceId}_${key}`;
    }

    /**
     * Creates device MQTT topic base name (~).
     * @param  {?String} suffix
     * @return {String}
     */
    #buildMqttDeviceTopic(suffix) {
        const prefix = 'hass';

        return [
            A2M_MQTT_BASE_TOPIC,
            this.#device.deviceId,
            prefix,
            suffix,
        ].filter(Boolean).join('/');
    }

    /**
     * @param  {String} action
     * @return {String}
     */
    #getMqttSensorCommandTopic(action) {
        return this.#buildMqttDeviceTopic(action);
    }

    /**
     * @return {String}
     */
    #getMqttSensorStateTopic() {
        return A2M_HASS_USE_SHARED_STATE_TOPIC
            ? BaseWrapper.getMqttSensorStateTopicByDeviceId(this.#device.deviceId) // Hooking to base integration state topic
            : this.#buildMqttDeviceTopic('state'); // Use separate topics for hass and base integration
    }

    /**
     * @return {String}
     */
    #getMqttSensorAvailabilityTopic() {
        return this.#buildMqttDeviceTopic('availability');
    }

    /**
     * Returns MQTT autodiscovery messages to be broadcasted on integration startup.
     * @return {MqttMessage[]}
     */
    getHassAutodiscoveryMessages() {
        const deviceSensors = this.#getDeviceExposedSensors();
        const deviceConfig = this.#getHassDeviceConfig();

        return Object.entries(deviceSensors).map(([sensorName, sensorInfo], idx) => {
            const { '@type': sensorType, ...sensorConfig } = sensorInfo;

            const payload = {
                platform: 'mqtt',
                origin: {
                    name: A2M_APP_NAME,
                    support_url: A2M_APP_SUPPORT_URL,
                    sw_version: A2M_APP_VERSION,
                },
                device: deviceConfig,
                value_template: `{{ value_json.${sensorName} }}`,
                unique_id: this.#getHassSensorUniqueId(sensorName),
                state_topic: this.#getMqttSensorStateTopic(),
                availability_topic: this.#getMqttSensorAvailabilityTopic(),
                ...sensorConfig,
            };

            // Include full device config only on the first discovery message:
            if (idx > 0) {
                payload.device = { identifiers: deviceConfig.identifiers };
            }

            return new MqttMessage({
                topic: `${A2M_HASS_BASE_TOPIC}/${sensorType}/${this.#getHassSensorUniqueId(sensorName)}/config`,
                options: this.#getMqttPublishOptions(),
                payload,
            });
        });
    }

    /**
     * @param {?String[]}  changedKeys  Empty to publish the whole state
     * @return {MqttMessage[]}
     */
    #getHassStateUpdateMessages(changedKeys) {
        const deviceSensorNames = Object.keys(this.#getDeviceExposedSensors());

        // Don't return any messages if the device changed some value that is not visible in hass:
        if (changedKeys && !changedKeys.some(key => deviceSensorNames.includes(key))) {
            return [];
        }

        const payload = {};

        deviceSensorNames.forEach((key) => {
            payload[key] = this.#device.state[key];
        });

        const message = new MqttMessage({
            topic: this.#getMqttSensorStateTopic(),
            options: this.#getMqttPublishOptions(),
            payload,
        });

        return Array.of(message);
    }

    /**
     * This method generates MQTT messages to be broadcasted on device state change.
     * @param {?String[]}  changedKeys  Empty to publish the whole state
     * @return {MqttMessage[]}
     */
    getStateUpdateMessages(changedKeys) {
        return A2M_HASS_USE_SHARED_STATE_TOPIC
            ? [] // Don't post anything, since we're hooked to the base integration topic
            : this.#getHassStateUpdateMessages(changedKeys); // Otherwise post updates to separate hass topic
    }

    /**
     * Returns device actions with mqtt command topics.
     * @return {Map<String, Promise>}
     */
    getHassDeviceActions() {
        const actions = new Map();

        if (this.#device.constructor === AjaxBridge) {
            const { is_armed, permit_join } = this.#getDeviceExposedSensors();

            // Define actions for alarm:
            actions.set(is_armed.command_topic, async (payloadRaw) => {
                // convert hass python boolean to js boolean:
                const payload = payloadRaw.toString().toLowerCase() === 'true';

                const armActions = new Map([
                    [is_armed.payload_off, () => this.#device.disarm()],
                    [is_armed.payload_on, () => this.#device.arm()],
                ]);

                return armActions.has(payload)
                    ? await armActions.get(payload)()
                    : this.#log.error(`Invalid payload for arm action: ${payload}`);
            });

            // Define actions for pairing mode switch:
            actions.set(permit_join.command_topic, async (payloadRaw) => {
                // convert hass python boolean to js boolean:
                const payload = payloadRaw.toString().toLowerCase() === 'true';

                const joinActions = new Map([
                    [permit_join.payload_off, () => this.#device.exitPairingMode()],
                    [permit_join.payload_on, () => this.#device.enterPairingMode()],
                ]);

                return joinActions.has(payload)
                    ? await joinActions.get(payload)()
                    : this.#log.error(`Invalid payload for arm action: ${payload}`);
            });
        }

        return actions;
    }

    /**
     * @return {MqttMessage[]}
     */
    getDeviceAvailabilityMessages() {
        const message = new MqttMessage({
            topic: this.#getMqttSensorAvailabilityTopic(),
            options: this.#getMqttPublishOptions(),
            payload: this.#device.isOnline ? 'online' : 'offline',
        });

        return Array.of(message);
    }

    /**
     * @return {String}
     */
    static getHassBirthTopic() {
        return `${A2M_HASS_BASE_TOPIC}/status`;
    }
}
