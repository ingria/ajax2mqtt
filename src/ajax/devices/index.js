import { DeviceType } from '../schema.js';
import AjaxAbstractDevice from './AjaxAbstractDevice.js';
import AjaxAbstractSensor from './AjaxAbstractSensor.js';
import AjaxFireProtect from './AjaxFireProtect.js';
import AjaxBridge from './AjaxBridge.js';

/**
 * Returns device class by its numeric ID.
 */
export function getDeviceByType(device_type) {
    switch (device_type) {
        case DeviceType.FIRE_PROTECT:
            return AjaxFireProtect;
            break;

        default:
            return null;
            break;
    }
};

export {
    AjaxAbstractDevice,
    AjaxAbstractSensor,
    AjaxFireProtect,
    AjaxBridge,
}
