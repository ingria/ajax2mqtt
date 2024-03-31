export const MessageAlarm = 'ALARM';
export const MessageStatus = 'STATUS_SHORT';
export const MessageStatusLong = 'STATUS_LONG';
export const MessageRallstate = 'RALLSTATE';
export const MessageRstate = 'RSTATE';
export const MessageEvent = 'EVENT';
export const MessageDevinfo = 'DEVINFO';
export const MessageTread = 'TREAD';
export const MessageResult = 'RESULT';
export const MessageUnsupported = '_UNKNOWN_';

export const DeviceType = {
    UNKNOWN: 0,
    DOOR_PROTECT: 1,
    MOTION_PROTECT: 2,
    FIRE_PROTECT: 3,
    GLASS_PROTECT: 4,
    LEAKS_PROTECT: 5,
    COMBI_PROTECT: 8,
    FIRE_PROTECT_PLUS: 9,
    SPACE_CONTROL: 11,
    MOTION_PROTECT_PLUS: 14,
};

export const AlarmType = {
    TAMPER_ALARM: 1,
    TAMPER_RESTORED: 2,
    TAMPER_RESTORED_DUAL: 3,
    LOOP_ALARM: 4,
    LOOP_RESTORED: 5,
    LOOP_RESTORED_DUAL: 6,
    TERMINAL_OPEN: 7,
    TERMINAL_CLOSED: 8,
    TERMINAL_CLOSED_DUAL: 9,
    SMOKE_ALARM: 10,
    SMOKE_ALARM_RESTORED: 11,
    SMOKE_ALARM_RESTORED_DUAL: 12,
    CO_ALARM: 13,
    CO_ALARM_RESTORED: 14,
    CO_ALARM_RESTORED_DUAL: 15,
    TEMPERATURE_ALARM: 16,
    TEMPERATURE_ALARM_RESTORED: 17,
    TEMPERATURE_ALARM_RESTORED_DUAL: 18,
    FLOOD_ALARM: 19,
    FLOOD_ALARM_RESTORED: 20,
    FLOOD_ALARM_RESTORED_DUAL: 21,
    MOTION_DETECTED: 22,
    GLASS_BREAK_ALARM: 23,
    EXTREME_TEMPERATURE_ALARM: 32,
    EXTREME_TEMPERATURE_RESTORED: 33,
    CO_CHAMBER_MALFUNCTION: 36,
    CO_CHAMBER_MALFUNCTION_RESTORED: 37,
    UNKNOWN_ALARM: 39,
    LOW_BATTERY_ALARM: 41,
    LOW_BATTERY_ALARM_RESTORED: 42,
    SENSOR_LOST_ALARM: 43,
    SENSOR_LOST_ALARM_RESTORED: 44,
    SENSOR_BAD_CONNECTION: 45,
    SMOKE_CHAMBER_MALFUNCTION: 47,
    SMOKE_CHAMBER_FIXED: 48,
    SMOKE_CHAMBER_DIRTY: 49,
    SMOKE_CHAMBER_CLEANED: 50,
    RADIO_JAMMING_DETECTED: 100,
    RADIO_JAMMING_CLEARED: 101,
    RADIO_JAMMED_MASKING: 110,
    RADIO_JAMMED_MASKING_CLEARED: 111,
};

/* eslint-disable no-multi-spaces */
const SCHEMA_STATUS_SHORT = {
    regex: /^STATUS;([\w\.\-;]+);PING;$/i,
    id: MessageStatus,
    fields: {
        device_type: Number,
        device_id: String,
        device_number: Number,            // System number of device (sequence number in a system)
        slot_number: Number,              // Slot number of device
        slot_superframe_number: Number,   // The slot number for the superframe
        num_pack: Number,                 // Package number from device
        noise: Number,                    // Noise level received from the device
        rssi: Number,                     // Signal level received from the device
        battery_ok: value => value === '0',
        setting_byte_1: String,
        setting_byte_2: String,
        sync_shift: Number,                // Detector synchronization deviation from system in ms
        skipped_count: Number,             // Amount of missed statuses in a row since current received status
        frequency_error: Number,           // Frequency deviation in Hz
        active_ant: Number,                // Active aerial 0 or 1
        worst_ant_rssi: Number,            // Reception level with the worst aerial
        tamper_ok: value => value === '0', // Sensor state (tamper, hermetic contact, terminal)
        current_frequency: Number,         // Frequency on which the status was received (868.0 or 868.5)
    },
};
/* eslint-enable no-multi-spaces */

/**
 * Right now long status uses the exact same schema as a short status.
 * The only difference is PING; piece in the end.
 */
const SCHEMA_STATUS_LONG = {
    regex: /^STATUS;([\w\.\-;]+);$/i,
    id: MessageStatusLong,
    fields: { ...SCHEMA_STATUS_SHORT.fields },
};

const SCHEMA_DEVINFO = {
    regex: /^DEVINFO;([\w\.\-;]+);$/i,
    id: MessageDevinfo,
    fields: {
        device_id: String,
        device_number: Number,
        slot_number: Number,
        num_pack: Number,
        noise: Number,
        rssi: Number,
        rssi_remote: Number,
        battery_voltage: value => parseInt(value, 10) / 10,
        power: Number,
        sync_shift: Number,
        setting_byte_1: String,
        setting_byte_2: String,
        temperature: Number,
        reset_factor: Number,
        skipped_count: Number,
        mrr_skip: Number,
        frequency_error: Number,
        backup_battery_ok: value => value === '0',
        backup_battery_voltage: value => parseInt(value, 10) / 10,
        chamber_dust_percent: Number,
        thermopair_temperature: Number,
    },
};

const SCHEMA_RSTATE = {
    regex: /^RSTATE;([\w\.\-;=/\s]+);$/i,
    id: MessageRstate,
    fields: {
        device_id: String,
    },
    kwargs: {
        VER: ['version', String],
        NET: ['network_id', Number],
        TIM: ['slot_length_ms', Number],
        STE: ['superframe_step_length', Number],
        FNM: ['subframe_number', Number],
        FLN: ['frame_length', Number],
        DPT: ['superframe_depth', Number],
        FRS: ['seconds_from_frame_start', Number],
        FSL: ['free_slot_count', Number],
        PRT: ['is_armed', value => value === '1'],
        BND: ['band', String],
        ONL: ['online_device_count', Number],
        FUL: ['registered_device_count', Number],
        LLS: ['lowest_level_signal', Number],
        NSL: ['frame_noise_level', Number],
        ECH: ['echo_commands', value => value === '1'],
        INF: ['display_info_messages', value => value === '1'],
        EXT: ['display_extended_info_messages', value => value === '1'],
        TMR: ['display_timers', value => value === '1'],
        FRM: ['display_frame_info', value => value === '1'],
        // ERF: ['🤷', Number],
        // EID: ['🤷', Number],
        // ESP: ['🤷', Number],
        // EFR: ['🤷', Number],
    },
};

/**
 * Bridge bootup message.
 */
const SCHEMA_RALLSTATE = {
    regex: /^RALLSTATE;([\w\.\-;=/\s]+);$/i,
    id: MessageRallstate,
    fields: {
        device_id: String,
    },
    kwargs: {
        VER: ['version', String],
        PRT: ['is_armed', value => value === '1'],
        FLN: ['frame_length', Number],
        SET: ['engineering_mode', value => value === '0'],
        CTM: ['communication_test_mode', value => value === '1'],
        STM: ['detection_zone_test_mode', value => value === '1'],
        WFA: ['awaiting_answer', value => ['1', 'Y/N'].includes(value.toString())],
        EXT: ['display_extended_info_messages', value => value === '1'],
        ECH: ['echo_commands', value => value === '1'],
        INF: ['display_info_messages', value => value === '1'],
        TMR: ['display_timers', value => value === '1'],
        FRM: ['display_frame_info', value => value === '1'],
        ONL: ['online_device_count', Number],
        FUL: ['registered_device_count', Number],
        NSL: ['frame_noise_level', Number],
        LLS: ['lowest_level_signal', Number],
        FSL: ['free_slot_count', Number],
        FRS: ['seconds_from_frame_start', Number],
        LOS: ['frame_misses_until_lost', Number],
    },
};

const SCHEMA_ALARM = {
    regex: /^ALARM;([\w\.\-;=\s]+);$/i,
    id: MessageAlarm,
    fields: {
        device_type: Number,
        device_id: String,
        alarm_type: Number,
    },
    kwargs: {
        PRT: ['is_armed', value => value === '1'],
    },
};

const SCHEMA_EVENT = {
    regex: /^EVENT((:?;[^;]+)+);?$/i,
    id: MessageEvent,
    fields: {
        device_id: String,
    },
    kwargs: {
        VER: ['version', String],
        TYP: ['device_type', Number],
        HNL: ['high_noise_level', Number],
        AUT: ['auth_success', value => value === '0'], // TODO: other responses
        LOD: ['settings_load_success', value => value === '1'],
        TCR: ['time_correction_ms', Number],
        TTC: ['last_sync_correction_minutes', Number],
        LTS: ['unstable_sync', Number],
        DET: ['detection_request', Number],
        ERR: ['sync_error', Number],
        ATO: ['configurator_timeout_shutdown', value => value === '0'],
        SCH: ['search_result', Number],
        NEW: ['new_device', value => value === '1'],
        WFA: ['awaiting_answer', value => ['1', 'Y/N'].includes(value.toString())],
        FRE: ['subframe_free_cells', Number],
        SPC: ['subframe_cell_count', Number],
        RED: ['extended_info_read_success', value => value === '1'],
        STR: ['slot_device_count', Number],
        SLT: ['superframe_number', Number],
        PRT: ['is_armed', value => value === '1'],
        RPT: ['repeated_command_count_total', Number],
        COM: ['repeated_command_count', Number],
        //  WT: ['🤷', Number],
        //  SL: ['🤷', Number],
        // POS: ['🤷', Number],
    },
};

const SCHEMA_TREAD = {
    regex: /^TREAD;([\w\.\-;=\s]+);$/i,
    id: MessageTread,
    fields: {
        device_id: String,
        active_time: Number,
        tx_time: Number,
        rx_time: Number,
        led_time: Number,
        total: Number,
    },
};

const SCHEMA_RESULT = {
    regex: /^RESULT;([\w\.\-;=\s]+);$/i,
    id: MessageResult,
    fields: {
        success: value => value === 'OK',
        exit_code: Number,
        device_id: () => 'SYSTEM',
    },
};

export const SupportedMessages = [
    SCHEMA_STATUS_SHORT,
    SCHEMA_STATUS_LONG,
    SCHEMA_DEVINFO,
    SCHEMA_RALLSTATE,
    SCHEMA_RSTATE,
    SCHEMA_ALARM,
    SCHEMA_EVENT,
    SCHEMA_TREAD,
    SCHEMA_RESULT,
];
