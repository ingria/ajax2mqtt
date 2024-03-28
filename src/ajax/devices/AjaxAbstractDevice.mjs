import createLogger from '#src/log.mjs';
import AjaxBus from '#src/ajax/bus.mjs';
import {
    MessageStatus,
    MessageStatusLong,
    MessageAlarm,
    MessageEvent,
    MessageDevinfo,
    MessageRstate,
} from '#src/ajax/schema.mjs';

/**
 * This class represents an abstract device that has a state and capable of receiving
 * messages from UART via the event bus.
 */
export default class AjaxAbstractDevice {
    /**
     * Device serial number.
     * @type {String}
     */
    deviceId = undefined;

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
     * @type {Object}
     */
    #deviceState = {};

    /**
     * @param  {String} deviceId
     * @param  {Object} platform
     */
    constructor(deviceId, platform) {
        this.deviceId = deviceId;
        this.platform = platform;
        this.log = createLogger('ajax');

        this.#initState();

        AjaxBus.on(deviceId, (msg) => {
            this.#handleIncomingMessage(msg);
        });

        this.log.info(`${deviceId}: Created new device`);
    }

    /**
     * Creates state listener.
     * @return {undefined}
     */
    #initState() {
        this.#deviceState = this.getInitialState();

        let changes = {};
        let debounceTimer = undefined;

        // Broadcast event to bus on state change:
        const set = (currentState, prop, newValue) => {
            if (currentState[prop] === newValue) {
                return true;
            }

            currentState[prop] = newValue; // eslint-disable-line no-param-reassign
            changes[prop] = newValue;

            clearTimeout(debounceTimer);

            debounceTimer = setTimeout(() => {
                this.platform.emit('deviceStateChange', this, changes);
                changes = {};
            }, 800);

            // Publish availability without debouncer:
            if ('online' in changes) {
                this.platform.emit('deviceAvailabilityChange', this, newValue);
            }

            return true;
        };

        this.state = new Proxy(this.#deviceState, { set });
    }

    /**
     * Chooses the appropriate handler function for the message.
     * @param  {String} options.type
     * @param  {Object} options.payload
     * @return {undefined}
     */
    #handleIncomingMessage({ type, payload }) {
        switch (type) {
            case MessageStatus:
            case MessageStatusLong: {
                this.log.info(`${this.deviceId}: Handling STATUS update`);
                this.handleStatusUpdate(payload);
                break;
            }

            case MessageAlarm: {
                this.log.warn(`${this.deviceId}: Handling ALARM update`);
                this.handleAlarmUpdate(payload);
                break;
            }

            case MessageEvent: {
                this.log.info(`${this.deviceId}: Handling EVENT update`);
                this.handleEventUpdate(payload);
                break;
            }

            case MessageDevinfo: {
                this.log.info(`${this.deviceId}: Handling DEVINFO update`);
                this.handleDevinfoUpdate(payload);
                break;
            }

            case MessageRstate: {
                this.log.info(`${this.deviceId}: Handling RSTATE update`);
                this.handleRstateUpdate(payload);
                break;
            }
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
        if (!this.deviceName) {
            this.deviceName = value;
            this.platform.emit('deviceReady', this);
        }
    }

    /**
     * If the current device is a bridge.
     * @return {Boolean}
     */
    isBridge() {
        return this.getBridgeDevice().deviceId === this.deviceId;
    }

    /**
     * Returns a bridge that the current device is connected to.
     * @return {Object}
     */
    getBridgeDevice() {
        return this.platform.bridgeDevice;
    }

    /**
     * Helpers for setting device online and offline state.
     */
    setOnline() {
        this.setStateAttribute('online', true);

        this.log.debug(`${this.deviceId}: device is now ONLINE`);

        if (!this.isBridge()) {
            this.log.debug('Setting parent bridge to ONLINE as well');
            this.getBridgeDevice().setOnline();
        }
    }

    setOffline() {
        this.setStateAttribute('online', false);
        this.log.debug(`${this.deviceId}: device is now OFFLINE`);
    }

    /**
     * Handles periodic PING messages with device status.
     * @param {Object} SCHEMA_STATUS_SHORT.fields
     */
    handleStatusUpdate() {
        this.log.debug('STATUS handler not implemented');
    }

    /**
     * @param {Object} SCHEMA_ALARM.fields
     */
    handleAlarmUpdate() {
        this.log.debug('ALARM handler not implemented');
    }

    /**
     * @param {Object} SCHEMA_DEVINFO.fields
     */
    handleDevinfoUpdate() {
        this.log.debug('DEVINFO handler not implemented');
    }

    /**
     * @param {Object} SCHEMA_EVENT.fields
     */
    handleEventUpdate() {
        this.log.debug('EVENT handler not implemented');
    }

    /**
     * @param {Object} SCHEMA_RSTATE.fields
     */
    handleRstateUpdate() {
        this.log.debug('EVENT handler not implemented');
    }
}
