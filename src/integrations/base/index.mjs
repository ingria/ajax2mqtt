import { BaseWrapper } from '#src/integrations/base/integration.mjs';

export const registerHandlers = function(platform, mqttBroker) {
    const wrappers = new Map;

    platform.on('deviceReady', (device) => {
        const base = new BaseWrapper(device);
        wrappers.set(device.deviceId, base);

        base.getDeviceActions().forEach((handler, topic) => {
            mqttBroker.subscribe(topic, handler);
        });
    });

    platform.on('deviceStateChange', (device, diff) => {
        wrappers.get(device.deviceId)?.getStateUpdateMessages().forEach((message) => {
            mqttBroker.publish(message);
        });
    });
};
