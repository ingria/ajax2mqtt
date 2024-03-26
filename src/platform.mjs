import { scheduler } from 'node:timers/promises';
import { EventEmitter } from 'node:events';
import { SerialPort, ReadlineParser } from 'serialport';
import { A2M_SERIAL_PORT, A2M_SERIAL_BAUDRATE, A2M_SERIAL_DELIMITER } from '#src/config.mjs';
import { MessageStatus, MessageStatusLong, MessageRstate, MessageRallstate, MessageResult, MessageEvent, MessageDevinfo } from '#src/ajax/schema.mjs';
import { getDeviceByType, AjaxBridge } from '#src/ajax/devices/index.mjs';
import BridgeCommands from '#src/ajax/commands.mjs';
import AjaxBus from '#src/ajax/bus.mjs';
import parseMessage from '#src/ajax/parser.mjs';
import createLogger from '#src/log.mjs';

/**
 * @fires deviceReady
 * @fires deviceStateChange
 */
export default class AjaxUartBridgePlatform extends EventEmitter {
    /**
     * @type {AjaxBridge}
     */
    bridgeDevice = null;

    /**
     * @type {Map}
     */
    #devices = new Map;

    /**
     * @type {SerialPort}
     */
    #port = undefined;

    /**
     * @type {Boolean}
     */
    #busy = false;

    /**
     * @type {BridgeCommands.BridgeCommand}
     */
    #queue = [];

    /**
     * @type {Number}
     */
    #reconnectTimer = undefined;

    constructor() {
        super();

        this.log = createLogger({ tag: 'bridge' });

        this.#port = new SerialPort({
            path: A2M_SERIAL_PORT,
            baudRate: A2M_SERIAL_BAUDRATE,
        });

        const parser = this.#port.pipe(new ReadlineParser({
            delimiter: A2M_SERIAL_DELIMITER,
        }));

        this.#port.on('close', () => this.#reconnect());
        parser.on('data', (data) => this.#handleMessage(data));
    }

    /**
     * Trying to reconnect to usbttl.
     * @param  {Number} timeout  Wait until next connection attempt (ms).
     */
    #reconnect(timeout = 250) {
        if (this.#port.isOpen) {
            this.log.info('Port is already open');
            return;
        }

        this.log.info('Trying to reconnect now');

        this.#port.open((error) => {
            if (!error) {
                this.log.info('Port reconnected!');
                return this.#port.resume();
            }

            this.log.error('Cannot open port', error);

            timeout *= 2;
            this.log.info(`Waiting ${timeout}ms till the next attempt...`);

            this.#reconnectTimer = setTimeout(() => this.#reconnect(timeout), timeout);
        });
    }

    /**
     * @return {Promise<undefined>}
     */
    async destroy() {
        this.#devices.forEach(device => device.setOffline());
        this.bridgeDevice.setOffline();

        clearTimeout(this.#reconnectTimer);
        this.#port.removeAllListeners('close');

        this.removeAllListeners('deviceStateChange');
        this.removeAllListeners('deviceReady');
        this.removeAllListeners('deviceAvailabilityChange');

        await this.#port.flush();
        await this.#port.close();
    }

    /**
     * Process incoming message from bridge.
     * @param  {String} message  Raw data from uart
     * @return {undefined}
     */
    #handleMessage(message) {
        const msg = parseMessage(message);
        const ajaxBusEventName = msg.device_id || 'SYSTEM';

        this.log.debug(`>>> Received ${msg.type} message`);
        this.log.verbose(msg);

        if (msg.type === MessageRstate || msg.type === MessageRallstate) {
            this.#registerBridge(msg);
        }

        if (!this.#devices.has(msg.device_id)) {
            // Sometimes we receive events from unregistered device (e.g. when in pairing mode).
            // Re-route such events to the bridge:
            if (msg.type === MessageEvent) {
                AjaxBus.emit('SYSTEM', msg);
            }

            // Postpone devinfo message to until device is ready:
            if (msg.type === MessageDevinfo) {
                const retransmit = () => AjaxBus.emit(ajaxBusEventName, msg);

                while (this.listenerCount('deviceReady', retransmit) > 0) {
                    this.removeListener('deviceReady', retransmit);
                }

                this.once('deviceReady', retransmit);
            }

            // Register device on status messages:
            if (msg.type === MessageStatus || msg.type === MessageStatusLong) {
                this.#registerDevice(msg);
            }
        }

        AjaxBus.emit(ajaxBusEventName, msg);
    }

    /**
     * Adds new accessory if needed.
     * @param  {String} options.device_id
     * @param  {Number} options.payload.device_type
     * @return {undefined}
     */
    #registerDevice({ device_id, payload: { device_type }}) {
        const DeviceClassName = getDeviceByType(device_type);

        if (!DeviceClassName) {
            this.log.warn(`Received update for unsuppored device: ${device_id}`);
            return;
        }

        this.#devices.set(device_id, new DeviceClassName(device_id, this));
    }

    /**
     * Adds a local bridge object if needed.
     * @param  {String} options.device_id
     * @return {undefined}
     */
    #registerBridge({ device_id }) {
        if (!this.bridgeDevice) {
            this.bridgeDevice = new AjaxBridge(device_id, this);
        }
    }

    /**
     * @param  {BridgeCommands.BridgeCommand[]} commands
     * @return {Promise<undefined>}
     */
    async sendCommands(commands) {
        this.#queue.push(...commands);
        await this.#runNextCommand();
    }

    /**
     * Send the message to the UART and acknowlendge receive.
     * @param  {String} command
     * @return {Promise<String>}
     */
    async #runNextCommand() {
        if (this.#busy) return;

        while (this.#queue.length > 0) {
            await this.#execute(this.#queue.shift());
        }
    }

    /**
     * @param  {BridgeCommands.BridgeCommand} command
     * @return {Promise<undefined>}
     */
    async #execute(command) {
        const handler = ({ raw, type, payload }) => {
            // Command has been echoed:
            if (raw === command.toString()) {
                this.log.debug(`>>> Command "${command}" was accepted by bridge`);
            }

            // This command doesn't produce RESULT event, meaning that we don't
            // need to wait for any output and can exit now:
            if (!command.waitForAck) {
                return finish();
            }

            // Otherwise wait until command is executed sucessfuly:
            if (type === MessageResult && payload.success) {
                this.log.debug(`>>> Command "${command} was executed sucessfuly`);
                return finish();
            }
        };

        // Starting timeout timer:
        const timeoutHandle = setTimeout(() => {
            this.log.error(`>>> Command "${command}" was not handled: TIMEOUT`);
            finish();
            throw new Error;
        }, 3000);

        // Clean up after the task is finished:
        const finish = () => {
            AjaxBus.removeListener('SYSTEM', handler);
            clearTimeout(timeoutHandle);
            this.#busy = false;
        };

        this.log.debug(`<<< Sending ${command} <<<`);

        this.#busy = true;
        this.#port.write(command.toString() + A2M_SERIAL_DELIMITER);

        AjaxBus.on('SYSTEM', handler);

        // Wait until the task is finished:
        while (this.#busy) {
            await scheduler.wait(100);
        }
    }

    /**
     * @return {Promise<undefined>}
     */
    async bootBridge() {
        return await this.sendCommands([
            new BridgeCommands.ChangeEchoSettings(true),
            new BridgeCommands.EnableWorkMode(),
            new BridgeCommands.EnableInfoMessages(true),
            new BridgeCommands.EnableExtendedMessages(true),
            new BridgeCommands.DisplayTimers(false),
            new BridgeCommands.DisplayFrameInfo(false),
            new BridgeCommands.PrintDeviceVersions(),
            new BridgeCommands.ShowArmStatus(),
        ]);
    }
}
