import { A2M_MQTT_BASE_TOPIC, A2M_HASS_BASE_TOPIC } from '#src/config.mjs';
import { AjaxFireProtect, AjaxFireProtectPlus, AjaxBridge } from '#src/ajax/devices/index.mjs';
import { MqttMessage } from '#src/hass/message.mjs';
import { schema } from '#src/hass/common.mjs';

/**
 * This class enables homeassistant mqtt integration with ajax devices.
 */
export class HassWrapper {
    #device = undefined;

    constructor(device) {
        this.#device = device;
    }

    /**
     * @return {String}
     */
    #makeHassDeviceIdentifier(deviceId) {
        return `ajax2mqtt_${deviceId}`;
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

        const commonSensors = [
            'tamper', 'noise', 'rssi', 'temperature', 'voltage',
            'battery', 'battery_low', 'backup_battery_voltage', 'backup_battery_low',
        ];

        switch (this.#device.constructor) {
            case AjaxFireProtect: {
                return importFromSchema(...commonSensors,
                    'smoke',
                    'smoke_chamber_malfunction',
                    'chamber_dust_percent',
                );
            }

            case AjaxFireProtectPlus: {
                return importFromSchema(...commonSensors,
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
                    arm: {
                        '@type': 'alarm_control_panel',
                        'code_arm_required': false,
                        'code_disarm_required': false,
                        'command_topic': this.#getMqttSensorCommandTopic('arm'),
                        'payload_disarm': 'DISARM',
                        'payload_arm_home': 'ARM_HOME',
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
    #getMqttSensorUniqueId(key) {
        return `ajax2mqtt_${this.#device.deviceId}_${key}`;
    }

    /**
     * Creates device MQTT topic base name (~).
     * @param  {?String} suffix
     * @return {String}
     */
    #buildMqttDeviceTopic(suffix) {
        return [
            A2M_MQTT_BASE_TOPIC,
            this.#device.deviceId,
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
        return this.#buildMqttDeviceTopic('state');
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
                device: deviceConfig,
                value_template: `{{ value_json.${sensorName} }}`,
                unique_id: this.#getMqttSensorUniqueId(sensorName),
                state_topic: this.#getMqttSensorStateTopic(),
                availability_topic: this.#getMqttSensorAvailabilityTopic(),
                ...sensorConfig,
            };

            // Include full device config only on the first discovery message:
            if (idx > 0) {
                payload.device = { identifiers: deviceConfig.identifiers };
            }

            return new MqttMessage({
                topic: `${A2M_HASS_BASE_TOPIC}/${sensorType}/${this.#getMqttSensorUniqueId(sensorName)}/config`,
                options: this.#getMqttPublishOptions(),
                payload,
            });
        });
    }

    /**
     * This method generates MQTT messages to be broadcasted on device state change.
     * @param {?String[]}  changedKeys  Empty to publish the whole state
     * @return {MqttMessage[]}
     */
    getHassStateUpdateMessages(changedKeys) {
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
     * Returns device actions with mqtt command topics.
     * @return {Map<String, Promise>}
     */
    getHassDeviceActions() {
        const actions = new Map;

        if (this.#device.constructor === AjaxBridge) {
            const { arm, permit_join } = this.#getDeviceExposedSensors();

            // Define actions for alarm control panel:
            actions.set(arm.command_topic, async (payload) => {
                const armActions = new Map([
                    [arm.payload_disarm, this.#device.disarm],
                    [arm.payload_arm_home, this.#device.arm],
                ]);

                return armActions.has(payload)
                    ? await armActions.get(payload)()
                    : this.log.error(`Invalid payload for arm action: ${payload}`);
            });

            // Define actions for pairing mode switch:
            actions.set(permit_join.command_topic, async (payload) => {
                const joinActions = new Map([
                    [permit_join.payload_off, this.#device.enterPairingMode],
                    [permit_join.payload, this.#device.exitPairingMode],
                ]);

                return joinActions.has(payload)
                    ? await joinActions.get(payload)()
                    : this.log.error(`Invalid payload for arm action: ${payload}`);
            });
        }

        return actions;
    }

    /**
     * @return {MqttMessage[]}
     */
    getHassDeviceAvailabilityMessages() {
        const message = new MqttMessage({
            topic: this.#getMqttSensorAvailabilityTopic(),
            options: this.#getMqttPublishOptions(),
            payload: this.#device.state.online ? 'online' : 'offline',
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
