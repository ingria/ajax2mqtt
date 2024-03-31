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
            noise: 0,
            rssi: 0,
            temperature: null,
            voltage: null,
            battery_low: false,
        };
    }

    #updateTamperState(value) {
        if ('tamper' in this.state) {
            this.setStateAttribute('tamper', value);
        }
    }

    /**
     * @inheritDoc
     */
    handleStatusUpdate({ battery_ok, noise, rssi, tamper_ok }) {
        this.setStateAttribute('battery_low', !battery_ok);
        this.setStateAttribute('rssi', rssi);
        this.setStateAttribute('noise', noise);
        this.#updateTamperState(!tamper_ok);

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
                this.#updateTamperState(true);
                break;
            }

            case AlarmType.TAMPER_RESTORED:
            case AlarmType.TAMPER_RESTORED_DUAL:
            case AlarmType.LOOP_RESTORED:
            case AlarmType.LOOP_RESTORED_DUAL:
            case AlarmType.TERMINAL_CLOSED:
            case AlarmType.TERMINAL_CLOSED_DUAL: {
                this.#updateTamperState(false);
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
    handleDevinfoUpdate({ temperature, battery_voltage }) {
        this.setStateAttribute('temperature', temperature);
        this.setStateAttribute('voltage', parseFloat(battery_voltage, 10).toFixed(1));
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
}
