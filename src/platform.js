import SerialPort from 'serialport';
import Readline from '@serialport/parser-readline';
import { EventEmitter } from 'events';
import { MessageStatus, MessageStatusLong, MessageRstate, MessageRallstate } from './ajax/schema.js';
import { BRIDGE_BAUDRATE, BRIDGE_DELIMITER, CMD_SHOW_VERSION } from './ajax/constants';
import { getDeviceByType, AjaxBridge } from './ajax/devices';
import parseMessage from './ajax/parser.js';

export default class AjaxUartBridgePlatform {
    /**
     * @type {AjaxBridge}
     */
    bridgeDevice = null;

    /**
     * Holds the sensor list. This should be renamed some day.
     * @type {Array}
     */
    accessories = [];

    /**
     * @param  {Object} config
     * @param  {Object} logger
     */
    constructor(config, logger) {
        this.config = config;
        this.log = logger.withTag('bridge');

        // Input bus is used by devices to receive commands and messages from bridge.
        // Output bus is used by devices to broadcast events and statuses. 
        this.bus = {
            input: new EventEmitter(),
            output: new EventEmitter(),
        };

        this.port = new SerialPort(config.bridge.port, {
            baudRate: BRIDGE_BAUDRATE,
        });

        this.parser = this.port.pipe(new Readline({
            delimiter: BRIDGE_DELIMITER,
        }))

        this.port.on('close', () => this.reconnect());
        this.parser.on('data', (data) => this.handleMessage(data));

        this.pingBridge();
    }

    /**
     * Trying to reconnect to usbttl.
     * @param  {Number} timeout  Wait until next connection attempt (ms).
     */
    reconnect(timeout = 250) {
        if (this.port.isOpen) {
            this.log.info('Port is already open');
            return this.pingBridge();
        }

        this.log.info('Trying to reconnect now');

        this.port.open((error) => {
            if (! error) {
                this.log.info('Port reconnected!');
                return this.port.resume();
            }

            this.log.error('Cannot open port', error);

            timeout *= 2;
            this.log.info(`Waiting ${timeout}ms till the next attempt...`);

            setTimeout(() => this.reconnect(timeout), timeout);
        });
    }

    /**
     * Send the message to the UART and acknowlendge receive.
     * TODO: wait for RESPONSE event.
     * @param  {String} command
     * @return {Promise<String>}
     */
    sendCommand(command) {
        this.log.debug(`<<< Sending ${command}`);

        return new Promise((resolve, reject) => {
            // Wait for a limited amount of time:
            const timeoutHandle = setTimeout(() => {
                this.log.error(`>>> Command "${command}" was not handled: TIMEOUT`);
                this.bus.input.removeListener('_internal_', handler);
                return reject();
            }, 2000);

            // Wait until the bridge echoes our command (ECH=1):
            const handler = ({ raw }) => {
                if (raw !== command) return;

                this.log.debug(`>>> Command "${command}" was ingested successfuly!`);
                this.bus.input.removeListener('_internal_', handler);
                clearTimeout(timeoutHandle);
    
                return resolve(command);
            };

            this.port.write(command + BRIDGE_DELIMITER);
            this.bus.input.on('_internal_', handler);
        });
    }

    /**
     * Execute command list.
     * Waits until previous command is ingested before sending the next one.
     * @param  {Array} commands
     * @return {Void}
     */
    sendCommands(commands) {
        const sequentialExecute = async (commands) => {
            for (let cmd of commands) {
                await this.sendCommand(cmd);
            }
        };

        return sequentialExecute(commands);
    }

    /**
     * We need to receive a RSTATE command and fill this.bridgeDevice as soon as possible.
     * @return {Void}
     */
    pingBridge() {
        this.getDevicesVersions();
    }

    /**
     * Sends ver command.
     */
    getDevicesVersions() {
        // ech=1 may not be enabled yet at this point,
        // so just ignoring the errors.
        return this.sendCommand(CMD_SHOW_VERSION).catch(e => void e);
    }

    /**
     * Process incoming message from bridge.
     * @param  {String} message  Raw data from uart
     * @return {undefined}
     */
    handleMessage(message) {
        const msg = parseMessage(message);

        this.log.debug(`>>> Received ${msg.type} message`);
        this.log.verbose(msg);

        switch (msg.type) {
            case MessageRstate:
            case MessageRallstate:
                this.checkLocalBridge(msg);
                break;

            case MessageStatus:
            case MessageStatusLong:
                this.checkAccessory(msg);
                break;
        }

        this.broadcastEvent(msg);
    }

    /**
     * Broadcast the event to connected devices.
     * @param  {Object} event
     * @return {undefined}
     */
    broadcastEvent(event) {
        this.bus.input.emit(event.device_id || '_internal_', event);
    }

    /**
     * Sets all sensors as offline.
     * @param {String} error
     * @return {undefined}
     */
    handleBridgeOffline(error) {
        this.log.error(error);
        this.accessories.forEach(device => device.setOffline());
        this.bridgeDevice.setOffline();
    }

    /**
     * Adds new accessory if needed.
     * @param  {String} options.device_id
     * @param  {Number} options.payload.device_type
     * @return {undefined}
     */
    checkAccessory({ device_id, payload: { device_type }}) {
        if (this.config.bridge.devices[device_id] === undefined) {
            return this.log.debug(`${device_id} is not in config, skipping`);
        }

        if (this.accessories.find(sensor => sensor.device_id === device_id)) {
            return; // This device is already registered.
        }

        const DeviceClassName = getDeviceByType(device_type);

        if (! DeviceClassName) {
            return this.log.warn(`Received update for unsuppored device: ${device_id}`);
        }

        this.accessories.push(new DeviceClassName(device_id, this));
        this.getDevicesVersions();
    }

    /**
     * Adds a local bridge object if needed.
     * @param  {String} options.device_id
     * @return {undefined}
     */
    checkLocalBridge({ device_id }) {
        if (this.bridgeDevice) return;

        this.bridgeDevice = new AjaxBridge(device_id, this);

        this.bridgeDevice.applySettings({
            display_timers: false,
            display_frame_info: false,
        });
    }
}
