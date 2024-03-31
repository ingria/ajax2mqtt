import { BaseWrapper } from '#src/integrations/base/integration.mjs';

export const registerHandlers = function attachEventListenersToPlatform(platform, mqttBroker) {
    const wrappers = new Map();

    platform.on('deviceReady', (device) => {
        const base = new BaseWrapper(device);
        wrappers.set(device.deviceId, base);

        base.getDeviceActions().forEach((handler, topic) => {
            mqttBroker.subscribe(topic, handler);
        });
    });

    platform.on('deviceStateChange', (device, _diff) => {
        wrappers.get(device.deviceId)?.getStateUpdateMessages().forEach((message) => {
            mqttBroker.publish(message);
        });
    });
};
