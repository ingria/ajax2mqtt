import AjaxAbstractDevice from './AjaxAbstractDevice.mjs';
import { AlarmType } from '../schema.mjs';

/**
 * This class represents an Ajax sensor device (fireProtect, leak detector, etc).
 */
export default class AjaxAbstractSensor extends AjaxAbstractDevice {
    /**
     * @inheritDoc
     */
    getInitialState() {
        return {
            ...super.getInitialState(),
            tamper: false,
            noise: 0,
            rssi: 0,
            temperature: null,
            voltage: null,
            battery: null,
            battery_low: false,
            backup_battery_voltage: null,
            backup_battery_low: false,
        };
    }

    /**
     * @inheritDoc
     */
    handleStatusUpdate({ battery_ok, noise, rssi, tamper_ok }) {
        this.setStateAttribute('battery_low', !battery_ok);
        this.setStateAttribute('tamper', !tamper_ok);
        this.setStateAttribute('rssi', rssi);
        this.setStateAttribute('noise', noise);
        this.setOnline();
    }

    /**
     * @inheritDoc
     */
    handleAlarmUpdate({ alarm_type }) {
        switch (alarm_type) {
            case AlarmType.TAMPER_ALARM:
            case AlarmType.LOOP_ALARM:
            case AlarmType.TERMINAL_OPEN: {
                this.setStateAttribute('tamper', true);
                break;
            }

            case AlarmType.TAMPER_RESTORED:
            case AlarmType.TAMPER_RESTORED_DUAL:
            case AlarmType.LOOP_RESTORED:
            case AlarmType.LOOP_RESTORED_DUAL:
            case AlarmType.TERMINAL_CLOSED:
            case AlarmType.TERMINAL_CLOSED_DUAL: {
                this.setStateAttribute('tamper', false);
                break;
            }

            case AlarmType.LOW_BATTERY_ALARM: {
                this.setStateAttribute('battery_low', true);
                break;
            }

            case AlarmType.LOW_BATTERY_ALARM_RESTORED: {
                this.setStateAttribute('battery_low', false);
                break;
            }

            case AlarmType.SENSOR_LOST_ALARM: {
                this.setOffline();
                break;
            }

            case AlarmType.SENSOR_LOST_ALARM_RESTORED: {
                this.setOnline();
                break;
            }
        }
    }

    /**
     * @inheritDoc
     */
    handleDevinfoUpdate({ temperature, battery_voltage, backup_battery_ok, backup_battery_voltage }) {
        this.setStateAttribute('temperature', temperature);
        this.setStateAttribute('voltage', parseFloat(battery_voltage, 10).toFixed(1));
        this.setStateAttribute('backup_battery_low', !backup_battery_ok);
        this.setStateAttribute('backup_battery_voltage', parseFloat(backup_battery_voltage, 10).toFixed(1));
        this.setStateAttribute('battery', AjaxAbstractSensor.#calculateBatteryPercentage(battery_voltage));
        this.setOnline();
    }

    /**
     * @inheritDoc
     */
    handleEventUpdate({ flags: { version } }) {
        if (version) {
            this.setDeviceName(version);
        }
    }

    /**
     * Helper: calculate battery approximate percentage.
     * @param  {Number} voltage
     * @return {Number}
     */
    static #calculateBatteryPercentage(voltage) {
        const nominalVoltage = 3.0;
        const percent = Math.round((voltage / nominalVoltage) * 100);

        return Math.min(100, percent);
    }
}
