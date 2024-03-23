import AjaxFireProtect from './AjaxFireProtect.mjs';

export default class AjaxFireProtectPlus extends AjaxFireProtect {
    /**
     * @inheritDoc
     */
    deviceModel = 'FireProtect Plus CO, smoke and heat detector';

    /**
     * @inheritDoc
     */
    getInitialState() {
        return {
            ...super.getInitialState(),
            co_chamber_malfunction: false,
            co: false,
        };
    }

    /**
     * @inheritDoc
     */
    handleAlarmUpdate(payload) {
        super.handleAlarmUpdate(payload);

        switch (payload.alarm_type) {
            case AlarmType.CO_ALARM: {
                this.setStateAttribute('co', true);
                break;
            }

            case AlarmType.CO_ALARM_RESTORED:
            case AlarmType.CO_ALARM_RESTORED_DUAL: {
                this.setStateAttribute('co', false);
                break;
            }

            case AlarmType.CO_CHAMBER_MALFUNCTION: {
                this.setStateAttribute('co_chamber_malfunction', true);
                break;
            }

            case AlarmType.CO_CHAMBER_MALFUNCTION_RESTORED: {
                this.setStateAttribute('co_chamber_malfunction', false);
                break;
            }
        }
    }
}
