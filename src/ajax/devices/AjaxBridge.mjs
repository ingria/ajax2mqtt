import AjaxAbstractDevice from '#src/ajax/devices/AjaxAbstractDevice.mjs';
import BridgeCommands from '#src/ajax/commands.mjs';
import AjaxBus from '#src/ajax/bus.mjs';

export default class AjaxBridge extends AjaxAbstractDevice {
    /**
     * @inheritDoc
     */
    deviceModel = 'uartBridge';

    constructor(...args) {
        super(...args);

        AjaxBus.on('SYSTEM', async (msg) => await this.#handleSystemMessage(msg));
    }

    /**
     * @inheritDoc
     */
    getInitialState() {
        return {
            ...super.getInitialState(),
            arm: undefined,
            permit_join: false,
            display_timers: undefined,
            echo_commands: undefined,
            display_extended_info_messages: undefined,
            display_info_messages: undefined,
            display_frame_info: undefined,
        };
    }

    /**
     * @inheritDoc
     */
    handleRstateUpdate({ flags }) {
        if (flags.version) {
            this.setDeviceName(flags.version);
        }

        this.setOnline();
        this.#checkUpdateForArmStatusFlag(flags);

        const optionalFlags = [
            'display_timers',
            'echo_commands',
            'display_extended_info_messages',
            'display_info_messages',
            'display_frame_info',
        ];

        optionalFlags
            .filter(key => key in flags)
            .forEach(key => this.setStateAttribute(key, flags[key]));
    }

    /**
     * @inheritDoc
     */
    handleRallstateUpdate({ flags }) {
        this.setOnline();
        this.#checkUpdateForArmStatusFlag(flags);
    }

    /**
     * @inheritDoc
     */
    handleEventUpdate({ flags }) {
        this.setOnline();
        this.#checkUpdateForArmStatusFlag(flags);
    }

    /**
     * Changes the armed state according to the flags from various messages.
     * @param  {Boolean} options.is_armed
     * @return {undefined}
     */
    #checkUpdateForArmStatusFlag({ is_armed }) {
        if (is_armed !== undefined) {
            this.setStateAttribute('arm', is_armed);
        }
    }

    /**
     * This device also handles SYSTEM messages, along with its DEVICE_ID topic.
     * @param  {Object} options.payload
     * @return {Promise<undefined>}
     */
    async #handleSystemMessage({ payload }) {
        // new device detected:
        if (payload?.flags?.new_device && payload?.flags?.awaiting_answer) {
            await this.platform.sendCommands([
                new BridgeCommands.AcceptNewDevice(),
            ]);

            return;
        }

        // bridge is in pairing mode:
        if (Number.isInteger(payload?.flags?.search_result)) {
            switch (payload.flags.search_result.toString()) {
                case '1':   // search started
                case '2': { // search continued
                    this.setStateAttribute('permit_join', true);
                    break;
                }

                case '0':   // search finished
                case '3': { // search timeout
                    this.setStateAttribute('permit_join', false);
                    await this.exitPairingMode();
                    break;
                }
            }
        }
    }

    /**
     * Enters pairing mode and accepts all new devices.
     * @return {Promise<undefined>}
     */
    async enterPairingMode() {
        if (this.state.permit_join) {
            this.log.info('Already in pairing mode');
            return;
        }

        this.log.info('Entering pairing mode');

        await this.platform.sendCommands([
            new BridgeCommands.EnableEngineeringMode(),
            new BridgeCommands.AllowPairing(),
        ]);
    }

    /**
     * Stops radio search and exits the pairing mode.
     * @return {Promise<undefined>}
     */
    async exitPairingMode() {
        this.log.info('Exiting pairing mode');

        await this.platform.sendCommands([
            new BridgeCommands.StopPairing(),
            new BridgeCommands.EnableWorkMode(),
        ]);
    }

    /**
     * @param  {String} deviceId
     * @return {Promise<undefined>}
     */
    async unpairDevice(deviceId) {
        await this.platform.sendCommands([
            new BridgeCommands.EnableEngineeringMode(),
            new BridgeCommands.DeleteDevice(deviceId),
            new BridgeCommands.EnableWorkMode(),
        ]);
    }

    /**
     * @return {Promise<undefined>}
     */
    async arm() {
        return await this.platform.sendCommands([
            new BridgeCommands.BridgeArm(),
        ]);
    }

    /**
     * @return {Promise<undefined>}
     */
    async disarm() {
        return await this.platform.sendCommands([
            new BridgeCommands.BridgeDisarm(),
        ]);
    }
}
