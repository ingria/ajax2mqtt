import { HassWrapper } from '#src/integrations/hass/integration.mjs';

export const registerHandlers = function(platform, mqttBroker) {
    const wrappers = new Map;

    // Publish autodiscovery messages.
    // https://www.home-assistant.io/integrations/mqtt/#how-to-use-discovery-messages
    platform.on('deviceReady', (device) => {
        const hass = new HassWrapper(device);
        wrappers.set(device.deviceId, hass);

        hass.getHassAutodiscoveryMessages().forEach((message) => {
            mqttBroker.publish(message);
        });

        hass.getHassDeviceActions().forEach((handler, topic) => {
            mqttBroker.subscribe(topic, handler);
        });
    });

    // Publish mqtt messages on device state change:
    platform.on('deviceStateChange', (device, diff) => {
        const hass = wrappers.get(device.deviceId);

        hass?.getStateUpdateMessages(Object.keys(diff)).forEach((message) => {
            mqttBroker.publish(message);
        });
    });

    // Publish availability messages.
    // https://www.home-assistant.io/integrations/mqtt/#using-availability-topics
    platform.on('deviceAvailabilityChange', (device) => {
        const hass = wrappers.get(device.deviceId);

        hass?.getDeviceAvailabilityMessages().forEach((message) => {
            mqttBroker.publish(message);
        });
    });

    // Publishing states of all devices at homeassistant startup.
    // https://www.home-assistant.io/integrations/mqtt/#birth-and-last-will-messages
    mqttBroker.subscribe(HassWrapper.getHassBirthTopic(), (payload) => {
        if (payload === 'online') {
            wrappers.forEach((hass) => {
                hass.getHassAutodiscoveryMessages().forEach(mqttBroker.publish);
                hass.getHassStateUpdateMessages().forEach(mqttBroker.publish);
            });
        }
    });
};
