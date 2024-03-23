export class BridgeCommand {
    waitForAck = true;
    command = undefined;
    argument = undefined;

    toString() {
        return [
            this.command,
            this.argument,
        ].filter(arg => arg !== undefined).join(' ');
    }
};

/**
 * Output information about firmware version and microcontroller ID 
 * + outputs versions of all detectors (ext, tmr should be enabled)
 */
export class PrintDeviceVersions extends BridgeCommand {
    waitForAck = false;
    command = 'ver';
};

/**
 * Exit from engineer menu, resume normal operation
 */
export class EnableWorkMode extends BridgeCommand {
    command = 'wrk';
};

/**
 * Stop main operations, enter engineering menu.
 */
export class EnableEngineeringMode extends BridgeCommand {
    command = 'stop';
};

/**
 * Add radio detector (it is necessary to change a battery or turn on 
 * the toggle switch of a detector). Only in engineering menu.
 */
export class AllowPairing extends BridgeCommand {
    command = 'add';
};

/**
 * Stop all current communication tests or detection zones, as well 
 * as searching for detector registration.
 */
export class StopPairing extends BridgeCommand {
    command = 'stt';
};

/**
 * Toggle output of STATUS commands (for DeviceTester).
 */
export class EnableInfoMessages extends BridgeCommand {
    command = 'inf';
    constructor(arg) {
        super();
        this.argument = Number(arg);
    }
};

/**
 * Toggle command echo.
 */
export class ChangeEchoSettings extends BridgeCommand {
    command = 'ech';
    constructor(arg) {
        super();
        this.argument = Number(arg);
    }
};

/**
 * Toggle information output about received status of a detector.
 */
export class EnableExtendedMessages extends BridgeCommand {
    command = 'ext';
    constructor(arg) {
        super();
        this.argument = Number(arg);
    }
};

/**
 * Toggle information output about counters of detector operation time.
 */
export class DisplayTimers extends BridgeCommand {
    waitForAck = false;
    command = 'tmr';
    constructor(arg) {
        super();
        this.argument = Number(arg);
    }
};

/**
 * Toggle information output about start of every frame.
 */
export class DisplayFrameInfo extends BridgeCommand {
    waitForAck = false;
    command = 'frm';
    constructor(arg) {
        super();
        this.argument = Number(arg);
    }
};

/**
 * Accept newly found device in search mode. 
 */
export class AcceptNewDevice extends BridgeCommand {
    command = 'y';
};

/**
 * Unpair remote device.
 */
export class DeleteDevice extends BridgeCommand {
    command = 'del';
    constructor(arg) {
        super();
        this.argument = arg.toString();
    }
};

/**
 * Output security state and frame length.
 */
export class ShowArmStatus extends BridgeCommand {
    waitForAck = false;
    command = 'stat';
};

/**
 * Enable armed mode.
 */
export class BridgeArm extends BridgeCommand {
    command = 'act';
};

/**
 * Disarm the system.
 */
export class BridgeDisarm extends BridgeCommand {
    command = 'pas';
};

export default {
    BridgeCommand,
    PrintDeviceVersions,
    EnableWorkMode,
    EnableEngineeringMode,
    AllowPairing,
    StopPairing,
    EnableInfoMessages,
    ChangeEchoSettings,
    EnableExtendedMessages,
    DisplayTimers,
    DisplayFrameInfo,
    AcceptNewDevice,
    DeleteDevice,
    ShowArmStatus,
    BridgeArm,
    BridgeDisarm,
};
