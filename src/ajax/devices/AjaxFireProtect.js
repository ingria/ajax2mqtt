import { AjaxAbstractSensor } from './index.js';
import { AlarmType } from '../schema.js';

export default class AjaxFireProtect extends AjaxAbstractSensor {
    /**
     * @inheritDoc
     */
    deviceModel = 'FireProtect smoke and heat detector';

    /**
     * @inheritDoc
     */
    getInitialState() {
        return { ...super.getInitialState(),
            smoke: false,
            smoke_chamber_malfunction: false,
            chamber_dust_percent: null,
        };
    }

    /**
     * @inheritDoc
     */
    getHassSensorConfig() {
        const config = super.getHassSensorConfig();

        config.smoke.device_class = 'smoke';
        config.smoke_chamber_malfunction.device_class = 'problem';
        config.chamber_dust_percent.unit_of_measurement = '%';
        config.chamber_dust_percent.icon = 'mdi:blur-radial';

        return config;
    }

    /**
     * @inheritDoc
     */
    handleAlarmUpdate(payload) {
        super.handleAlarmUpdate(payload);

        switch (payload.alarm_type) {
            case AlarmType.SMOKE_ALARM:
            case AlarmType.EXTREME_TEMPERATURE_ALARM:
                this.updateSmokeDetectedStatus(true);
                break;

            case AlarmType.SMOKE_ALARM_RESTORED:
            case AlarmType.SMOKE_ALARM_RESTORED_DUAL:
            case AlarmType.EXTREME_TEMPERATURE_RESTORED:
                this.updateSmokeDetectedStatus(false);
                break;

            case AlarmType.SMOKE_CHAMBER_MALFUNCTION:
            case AlarmType.SMOKE_CHAMBER_DIRTY:
                this.updateSmokeChamberOkStatus(false);
                break;

            case AlarmType.SMOKE_CHAMBER_FIXED:
            case AlarmType.SMOKE_CHAMBER_CLEANED:
                this.updateSmokeChamberOkStatus(true);
                break;
        }
    }

    /**
     * @inheritDoc
     */
    handleDevinfoUpdate({ chamber_dust_percent, ...payload }) {
        super.handleDevinfoUpdate(payload);

        this.setStateAttribute('chamber_dust_percent', chamber_dust_percent);
    }

    /**
     * @param  {Boolean} smoke_detected
     * @return {Void}
     */
    updateSmokeDetectedStatus(smoke_detected) {
        this.setStateAttribute('smoke', smoke_detected);
    }

    /**
     * @param  {Boolean} is_ok
     * @return {Void}
     */
    updateSmokeChamberOkStatus(is_ok) {
        this.setStateAttribute('smoke_chamber_malfunction', !is_ok);
    }
}
