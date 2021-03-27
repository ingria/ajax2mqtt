import { AjaxAbstractDevice } from './index.js';
import { AlarmType } from '../schema.js';
import { DEVICE_BATTERY_NOMINAL_VOLTAGE } from '../constants';

/**
 * This class represents an Ajax sensor device (fireProtect, leak detector, etc).
 */
export default class AjaxAbstractSensor extends AjaxAbstractDevice {
    /**
     * @inheritDoc
     */
    getInitialState() {
        return { ...super.getInitialState(),
            tamper: false,
            noise: 0,
            rssi: 0,
            temperature: null,
            voltage: null,
            battery: null,
            battery_low: false,
            reserve_battery_voltage: null,
            reserve_battery_low: false,
        };
    }

    /**
     * @inheritDoc
     */
    getHassSensorConfig() {
        const sensors = {};

        // Binary sensors common attributes:
        const binarySensorConfig = {
            payload_off: false,
            payload_on: true,
        };

        // Filling up available sensors from state:
        this.getHassObservableSensors().forEach(([key, value]) => {
            sensors[key] = { ...(typeof(value) === 'boolean' ? binarySensorConfig : {}) };
        });

        sensors.tamper.device_class = 'safety';
        sensors.noise.unit_of_measurement = 'dB';
        sensors.noise.icon = 'mdi:access-point-remove';
        sensors.rssi.device_class = 'signal_strength';
        sensors.rssi.unit_of_measurement = 'dBm';
        sensors.temperature.device_class = 'temperature';
        sensors.temperature.unit_of_measurement = '°C';
        sensors.voltage.device_class = 'voltage';
        sensors.voltage.unit_of_measurement = 'V';
        sensors.battery.device_class = 'battery';
        sensors.battery.unit_of_measurement = '%';
        sensors.battery_low.device_class = 'battery';
        sensors.reserve_battery_voltage.device_class = 'voltage';
        sensors.reserve_battery_voltage.unit_of_measurement = 'V';
        sensors.reserve_battery_low.device_class = 'battery';

        return sensors;
    }

    /**
     * @inheritDoc
     */
    handleStatusUpdate({ battery_ok, noise, rssi, sensor_condition_ok }) {
        this.setStateAttribute('battery_low', !battery_ok);
        this.setStateAttribute('tamper', !sensor_condition_ok);
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
            case AlarmType.TERMINAL_OPEN:
                this.setStateAttribute('tamper', true);
                break;

            case AlarmType.TAMPER_RESTORED:
            case AlarmType.TAMPER_RESTORED_DUAL:
            case AlarmType.LOOP_RESTORED:
            case AlarmType.LOOP_RESTORED_DUAL:
            case AlarmType.TERMINAL_CLOSED:
            case AlarmType.TERMINAL_CLOSED_DUAL:
                this.setStateAttribute('tamper', false);
                break;

            case AlarmType.LOW_BATTERY_ALARM:
                this.setStateAttribute('battery_low', true);
                break;

            case AlarmType.LOW_BATTERY_ALARM_RESTORED:
                this.setStateAttribute('battery_low', false);
                break;

            case AlarmType.SENSOR_LOST_ALARM:
                this.setOffline();
                break;

            case AlarmType.SENSOR_LOST_ALARM_RESTORED:
                this.setOnline();
                break;
        }
    }

    /**
     * @inheritDoc
     */
    handleDevinfoUpdate({ temperature, battery_voltage, reserve_battery_ok, reserve_battery_voltage }) {
        this.setStateAttribute('temperature', temperature);
        this.setStateAttribute('voltage', battery_voltage);
        this.setStateAttribute('reserve_battery_low', !reserve_battery_ok);
        this.setStateAttribute('reserve_battery_voltage', reserve_battery_voltage);
        this.setStateAttribute('battery', this.calculateBatteryPercentage(battery_voltage));
        this.setOnline();
    }

    /**
     * Helper: calculate battery approximate percentage.
     * @param  {Number} voltage
     * @return {Number}
     */
    calculateBatteryPercentage(voltage) {
        const percent = Math.round(voltage / DEVICE_BATTERY_NOMINAL_VOLTAGE * 100);
        return Math.min(100, percent);
    }

    /**
     * @inheritDoc
     */
    handleEventUpdate({ flags: { version }}) {
        if (version) {
            this.setDeviceName(version);
        }
    }
}
