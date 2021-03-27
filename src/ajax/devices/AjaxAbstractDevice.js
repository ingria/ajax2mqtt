import { objdiff } from '../../utils.js';
import { SENSOR_TYPE_SENSOR, SENSOR_TYPE_BINARY_SENSOR } from '../../hass';
import { MqttMessage } from '../../mqtt';
import {
    MessageStatus,
    MessageStatusLong,
    MessageAlarm,
    MessageEvent,
    MessageDevinfo,
    MessageRstate,
} from '../schema.js';

/**
 * This class represents an abstract device that has a state and capable of receiving
 * messages from UART via the event bus.
 */
export default class AjaxAbstractDevice {
    /**
     * Device model name.
     */
    deviceModel = 'Unknown Ajax device';

    /**
     * Device software version or name.
     * @type {String}
     */
    deviceName = null;

    /**
     * Configuration for the current device.
     * @type {Object}
     */
    config = null;

    /**
     * @param  {String} device_id
     * @param  {Object} platform
     */
    constructor(device_id, platform) {
        this.device_id = device_id;
        this.platform = platform;
        this.config = platform.config.bridge.devices[device_id];
        this.state = this.getInitialState();

        platform.log.info(`${device_id}: Created new device`);

        platform.bus.input.on(this.device_id, msg => this._handleIncomingMessage(msg));
    }

    /**
     * Chooses the appropriate handler function for the message.
     * @param  {String} options.type
     * @param  {Object} options.payload
     * @return {Mixed}
     */
    _handleIncomingMessage({ type, payload }) {
        const oldState = { ...this.state };

        switch (type) {
            case MessageStatus:
            case MessageStatusLong:
                this.platform.log.info(`${this.device_id}: Handling STATUS update`);
                this.handleStatusUpdate(payload);
                break;

            case MessageAlarm:
                this.platform.log.warn(`${this.device_id}: Handling ALARM update`);
                this.handleAlarmUpdate(payload);
                break;

            case MessageEvent:
                this.platform.log.info(`${this.device_id}: Handling EVENT update`);
                this.handleEventUpdate(payload);
                break;

            case MessageDevinfo:
                this.platform.log.info(`${this.device_id}: Handling DEVINFO update`);
                this.handleDevinfoUpdate(payload);
                break;

            case MessageRstate:
                this.platform.log.info(`${this.device_id}: Handling RSTATE update`);
                this.handleRstateUpdate(payload);
                break;

            default:
                return false;
                break;
        }

        const diff = objdiff(oldState, this.state);

        if (diff) {
            this.platform.bus.output.emit('deviceStateChange', this, diff);
        }
    }

    /**
     * Attributes that are common to all devices.
     * Important: this object must have only one dimension.
     * @return {Object}
     */
    getInitialState() {
        return {
            online: false,
        };
    }

    /**
     * Setter for current state.
     * @param {String} key
     * @param {Mixed}  value
     */
    setStateAttribute(key, value) {
        this.state[key] = value;
    }

    /**
     * Setter for current device name.
     * @param {String} value
     */
    setDeviceName(value) {
        if (! this.deviceName) {
            this.deviceName = value;
            this.platform.bus.output.emit('deviceReady', this);
        }
    }

    /**
     * If the current device is a bridge.
     * @return {Boolean}
     */
    isBridge() {
        return this.getBridgeDevice().device_id === this.device_id;
    }

    /**
     * Returns a bridge that the current device is connected to.
     * @return {Object}
     */
    getBridgeDevice() {
        return this.platform.bridgeDevice;
    }

    /**
     * Generates an MQTT topic name for given sensor name.
     * E.g. ajax/smoke_sensor/tamper
     * @param  {String} key
     * @return {String}
     */
    getMqttSensorStateTopic(key) {
        const { namespace } = this.platform.config.mqtt;
        const topic = this.config.mqtt_state_topic;

        return `${namespace}/${topic}/${key}`;
    }

    /**
     * Prepares the value to be posted on MQTT.
     * @param  {Mixed}  value
     * @return {?Object}
     */
    getMqttSensorStateValue(key) {
        const value = this.state[key];

        if (key === 'online') {
            return value ? 'online' : 'offline';
        }

        // Do not send messages with empty values:
        return value !== null && value !== undefined
            ? { value }
            : null;
    }

    /**
     * Returns the MQTT options for the given sensor.
     * @param  {String}  key
     * @return {?Object}
     */
    getMqttSensorPublishOptions(key) {
        return key === 'online' ? null : {
            retain: true,
            properties: {
                messageExpiryInterval: 86400, // One day
            },
        };
    }

    /**
     * Generates the unique id for given sensor name.
     * @param  {String} key
     * @return {String}
     */
    getMqttSensorUniqueId(key) {
        return `${this.device_id}_${key}_ajax_security`;
    }

    /**
     * Generates a list of payloads to be published via MQTT.
     * If argument is null, returns list of all values in the current state.
     * @param  {Object}  values  Publish only this values
     * @return {Array}
     */
    getMqttStateMessages(values = null) {
        const publishedValues = values || this.state;

        return Object.entries(publishedValues).map(([key, value]) => new MqttMessage({
            topic: this.getMqttSensorStateTopic(key),
            payload: this.getMqttSensorStateValue(key),
            options: this.getMqttSensorPublishOptions(key),
        }));
    }

    /**
     * Return entries of the current state. Filter out the entries that we don't want
     * to be autodiscovered.
     * @return {Array<SensorName, SensorValue>}
     */
    getHassObservableSensors() {
        return Object.entries(this.state).filter(([key, value]) => {
            return key !== 'online';
        });
    }

    /**
     * Generates sensor readable name to be displayed in HASS.
     * @param  {String} key
     * @return {String}
     */
    getHassSensorName(key) {
        return `${this.config.mqtt_state_topic}_${key}`;
    }

    /**
     * Config object for available sensors. Key is sensor name, value is an
     * object with sensor configuration (device_class, name, icon, etc).
     * @return {Object}
     */
    getHassSensorConfig() {
        return {};
    }

    /**
     * Common sensor config that is used in MQTT auto-discovery.
     * @return {Object}
     */
    getHassSensorCommonConfig() {
        return {
            platform: 'mqtt',
            value_template: '{{ value_json.value }}',
            device: {
                manufacturer: 'Ajax Systems',
                model: this.deviceModel,
                sw_version: this.deviceName,
                identifiers: [this.getHassDeviceIdentifier()],
                name: this.isBridge() ? this.platform.config.bridge.name : this.config.name,
            },
            availability_topic: this.getMqttSensorStateTopic('online'),
        };
    }

    /**
     * Generates HASS autoconfig payload for MQTT.
     * @return {Object} topic:payload
     */
    getHassConfig() {
        const commonConfig = this.getHassSensorCommonConfig();

        // Each device except the bridge itself works via the bridge:
        if (!this.isBridge()) {
            commonConfig.device.via_device = this.getBridgeDevice().getHassDeviceIdentifier();
        }

        // Convert sensor config object to array of MQTT autoconfig messages:
        return Object.entries(this.getHassSensorConfig()).map(([key, sensorConfig]) => {
            const payload = { ...commonConfig, ...sensorConfig,
                unique_id: this.getMqttSensorUniqueId(key),
                state_topic: this.getMqttSensorStateTopic(key),
                name: this.getHassSensorName(key),
            };

            return new MqttMessage({ payload,
                topic: this.getHassAutodiscoveryTopic(key),
            });
        });
    }

    /**
     * Generates HASS unique identifier.
     * @return {String}
     */
    getHassDeviceIdentifier() {
        return `ajax_security_${this.device_id}`;
    }

    /**
     * Get sensor type by attribute name.
     * @param  {String} key
     * @return {String}
     */
    getHassSensorType(key) {
        return typeof(this.state[key]) === 'boolean'
            ? SENSOR_TYPE_BINARY_SENSOR
            : SENSOR_TYPE_SENSOR;
    }

    /**
     * HASS MQTT discovery topic for the sensor.
     * @see https://home-assistant.io/docs/mqtt/discovery
     * @param  {String} key
     * @return {String}
     */
    getHassAutodiscoveryTopic(key) {
        const prefix = this.platform.config.hass.autodiscovery_prefix;
        const component = this.getHassSensorType(key);
        const node_id = this.getHassDeviceIdentifier();

        return `${prefix}/${component}/${node_id}/${key}/config`;
    }

    /**
     * Exposes the list of actions of the current device.
     * @return {Object} topic:handler_function(payload)
     */
    getHassActions() {
        return {};
    }

    /**
     * Helpers for setting device online and offline state.
     */
    setOnline() {
        !this.state.online && this.platform.log.debug(`${this.device_id}: device is now ONLINE`);

        this.setStateAttribute('online', true);

        if (! this.isBridge()) {
            this.platform.log.debug('Setting parent bridge to ONLINE as well');
            this.getBridgeDevice().setOnline();
        }

        this.platform.bus.output.emit('deviceStateChange', this, { online: true });
    }

    setOffline() {
        this.state.online && this.platform.log.debug(`${this.device_id}: device is now OFFLINE`);
        this.setStateAttribute('online', false);
        this.platform.bus.output.emit('deviceStateChange', this, { online: false });
    }

    /**
     * Handles periodic PING messages with device status.
     * @param {Object} SCHEMA_STATUS_SHORT.fields
     */
    handleStatusUpdate(fields) {
        this.platform.log.debug('STATUS handler not implemented');
    }

    /**
     * @param {Object} SCHEMA_ALARM.fields
     */
    handleAlarmUpdate() {
        this.platform.log.debug('ALARM handler not implemented');
    }

    /**
     * @param {Object} SCHEMA_DEVINFO.fields
     */
    handleDevinfoUpdate() {
        this.platform.log.debug('DEVINFO handler not implemented');
    }

    /**
     * @param {Object} SCHEMA_EVENT.fields
     */
    handleEventUpdate() {
        this.platform.log.debug('EVENT handler not implemented');
    }

    /**
     * @param {Object} SCHEMA_RSTATE.fields
     */
    handleRstateUpdate() {
        this.platform.log.debug('EVENT handler not implemented');
    }
}
