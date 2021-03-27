import { AjaxAbstractDevice } from './index.js';
import { CMD_SHOW_ARM_STATUS, CMD_ARM, CMD_DISARM } from '../constants';
import {
    SENSOR_TYPE_ALARM_PANEL,
    ALARM_PANEL_STATE_ARMED,
    ALARM_PANEL_STATE_DISARMED,
    ALARM_PANEL_COMMAND_ARM,
    ALARM_PANEL_COMMAND_DISARM,
} from '../../hass';

export default class AjaxBridge extends AjaxAbstractDevice {
    /**
     * @inheritDoc
     */
    deviceModel = 'uartBridge';

    /**
     * @inheritDoc
     */
    getInitialState() {
        return { ...super.getInitialState(),
            arm: ALARM_PANEL_STATE_DISARMED,
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
    getHassSensorConfig() {
        return {
            arm: {
                code_arm_required: false,
                code_disarm_required: false,
                command_topic: this.getMqttSensorStateTopic('arm/set'),
                payload_disarm: ALARM_PANEL_COMMAND_DISARM,
                payload_arm_home: ALARM_PANEL_COMMAND_ARM,
            },
        };
    }

    /**
     * This device is a root bridge, so this should be hardcoded.
     * @param  {String} key
     * @return {String}
     */
    getMqttSensorStateTopic(key) {
        return `${this.platform.config.mqtt.namespace}/bridge/${key}`;
    }

    /**
     * This should also be hardcoded.
     * @param  {String} key
     * @return {String}
     */
    getHassSensorName(key) {
        return `bridge_${key}`;
    }

    /**
     * @inheritDoc
     */
    getHassSensorType(key) {
        switch (key) {
            case 'arm':
                return SENSOR_TYPE_ALARM_PANEL;
                break;

            default:
                return super.getHassSensorType(key);
                break;
        }
    }

    /**
     * Executes the required commands. 
     * @param  {Object} args
     * @return {undefined}
     */
    applySettings(args) {
        const commands = [];
        const check = (key) => args[key] !== undefined && this.state[key] !== args[key];

        // These options are not configurable:
        if (! this.state.echo_commands) commands.push('ech 1');
        if (! this.state.display_info_messages) commands.push('inf 1');
        if (! this.state.display_extended_info_messages) commands.push('ext 1');

        // These can be configured via the global config:
        if (check('display_timers')) commands.push(`tmr ${Number(args.display_timers)}`);
        if (check('display_frame_info')) commands.push(`frm ${Number(args.display_frame_info)}`);

        commands.push(CMD_SHOW_ARM_STATUS);

        this.platform.sendCommands(commands);
    }

    /**
     * @inheritDoc
     */
    handleRstateUpdate({ flags }) {
        if (flags.version) {
            this.setDeviceName(flags.version);
        }

        this.setOnline();
        this.checkFlagsForArmedState(flags);

        const optionalFlags = [
            'display_timers',
            'echo_commands',
            'display_extended_info_messages',
            'display_info_messages',
            'display_frame_info'];

        optionalFlags.forEach((key) => (key in flags) && this.setStateAttribute(key, flags[key]));
    }

    /**
     * @inheritDoc
     */
    handleRallstateUpdate({ flags }) {
        this.setOnline();
        this.checkFlagsForArmedState(flags);
    }

    /**
     * @inheritDoc
     */
    handleEventUpdate({ flags }) {
        this.setOnline();
        this.checkFlagsForArmedState(flags);
    }

    /**
     * Changes the armed state according to the flags from various messages.
     * @param  {Boolean} options.is_armed
     * @return {undefined}
     */
    checkFlagsForArmedState({ is_armed }) {
        if (is_armed !== undefined) {
            this.setStateAttribute('arm', is_armed
                ? ALARM_PANEL_STATE_ARMED
                : ALARM_PANEL_STATE_DISARMED);
        }
    }

    /**
     * @inheritDoc
     */
    getHassActions() {
        const { arm } = this.getHassSensorConfig();

        return {
            [arm.command_topic]: (payload) => {
                return this.platform.sendCommand(payload === arm.payload_disarm ? CMD_DISARM : CMD_ARM);
            },
        };
    }
}
