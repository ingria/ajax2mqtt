import AjaxAbstractSensor from './AjaxAbstractSensor.mjs';
import { AlarmType } from '../schema.mjs';

export default class AjaxFireProtect extends AjaxAbstractSensor {
    /**
     * @inheritDoc
     */
    deviceModel = 'FireProtect smoke and heat detector';

    /**
     * @inheritDoc
     */
    getInitialState() {
        return {
            ...super.getInitialState(),
            smoke: false,
            smoke_chamber_malfunction: false,
            chamber_dust_percent: null,
        };
    }

    /**
     * @inheritDoc
     */
    handleAlarmUpdate(payload) {
        super.handleAlarmUpdate(payload);

        switch (payload.alarm_type) {
            case AlarmType.SMOKE_ALARM:
            case AlarmType.EXTREME_TEMPERATURE_ALARM: {
                this.setStateAttribute('smoke', true);
                break;
            }

            case AlarmType.SMOKE_ALARM_RESTORED:
            case AlarmType.SMOKE_ALARM_RESTORED_DUAL:
            case AlarmType.EXTREME_TEMPERATURE_RESTORED: {
                this.setStateAttribute('smoke', false);
                break;
            }

            case AlarmType.SMOKE_CHAMBER_MALFUNCTION:
            case AlarmType.SMOKE_CHAMBER_DIRTY: {
                this.setStateAttribute('smoke_chamber_malfunction', true);
                break;
            }

            case AlarmType.SMOKE_CHAMBER_FIXED:
            case AlarmType.SMOKE_CHAMBER_CLEANED: {
                this.setStateAttribute('smoke_chamber_malfunction', false);
                break;
            }
        }
    }

    /**
     * @inheritDoc
     */
    handleDevinfoUpdate(devinfo) {
        super.handleDevinfoUpdate(devinfo);

        this.setStateAttribute('chamber_dust_percent', devinfo.chamber_dust_percent);
        this.setStateAttribute('battery', AjaxFireProtect.#calculateBatteryPercentage(devinfo.battery_voltage));
    }

    /**
     * Helper: calculate battery approximate percentage. Values for cr2 batery.
     * @param  {Number} voltage
     * @return {Number}
     */
    static #calculateBatteryPercentage(voltage) {
        const nominalVoltage = 3.0;
        const cutOffVoltage = 2.0;

        // Normalize voltages to zero level:
        const percent = ((voltage - cutOffVoltage) / (nominalVoltage - cutOffVoltage)) * 100;

        return Math.min(100, Math.max(0, Math.round(percent)));
    }
}
