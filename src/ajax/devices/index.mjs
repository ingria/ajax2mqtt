import { DeviceType } from '../schema.mjs';
import AjaxFireProtect from './AjaxFireProtect.mjs';
import AjaxFireProtectPlus from './AjaxFireProtectPlus.mjs';
import AjaxBridge from './AjaxBridge.mjs';

/**
 * @param  {Number} deviceType
 * @return {AjaxAbstractDevice|null}
 */
export const getDeviceByType = function getDeviceClassByNumericId(deviceType) {
    const devices = {
        [DeviceType.FIRE_PROTECT]: AjaxFireProtect,
        [DeviceType.FIRE_PROTECT_PLUS]: AjaxFireProtectPlus,
    };

    return devices[deviceType] ?? null;
};

export {
    AjaxFireProtect,
    AjaxFireProtectPlus,
    AjaxBridge,
};
