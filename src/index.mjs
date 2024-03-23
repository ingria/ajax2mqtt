import process from 'node:process';
import UartBridge from '#src/platform.mjs';
import { MqttAdapter } from '#src/mqtt/index.mjs';
import { A2M_HASS_ENABLED } from '#src/config.mjs';
import { HassWrapper } from '#src/hass/integration.mjs';
import createLogger from '#src/log.mjs';

const logger = createLogger({ tag: 'main' });

const bridge = new UartBridge();

const Mqtt = new MqttAdapter();
await Mqtt.connect();

if (A2M_HASS_ENABLED) {
    const wrappers = new Map;

    // Publish autodiscovery messages.
    // https://www.home-assistant.io/integrations/mqtt/#how-to-use-discovery-messages
    bridge.on('deviceReady', (device) => {
        logger.info(`Device ${device.deviceName} is ready`);

        const hass = new HassWrapper(device);
        wrappers.set(device.deviceId, hass);

        hass.getHassAutodiscoveryMessages().forEach((message) => {
            Mqtt.publish(message);
        });

        hass.getHassDeviceActions().forEach((handler, topic) => {
            Mqtt.subscribe(topic, handler);
        });
    });

    // Publish mqtt messages on device state change:
    bridge.on('deviceStateChange', (device, diff) => {
        const hass = wrappers.get(device.deviceId);

        hass?.getHassStateUpdateMessages(Object.keys(diff)).forEach((message) => {
            Mqtt.publish(message);
        });
    });

    // Publish availability messages.
    // https://www.home-assistant.io/integrations/mqtt/#using-availability-topics
    bridge.on('deviceAvailabilityChange', (device) => {
        const hass = wrappers.get(device.deviceId);

        hass?.getHassDeviceAvailabilityMessages().forEach((message) => {
            Mqtt.publish(message);
        });
    });

    // Publishing states of all devices at homeassistant startup.
    // https://www.home-assistant.io/integrations/mqtt/#birth-and-last-will-messages
    Mqtt.subscribe(HassWrapper.getHassBirthTopic(), (payload) => {
        if (payload === 'online') {
            wrappers.forEach((hass) => {
                hass.getHassAutodiscoveryMessages().forEach(Mqtt.publish);
                hass.getHassStateUpdateMessages().forEach(Mqtt.publish);
            });
        }
    });
}

await bridge.bootBridge();

['SIGINT'].forEach((signal) => {
    process.on(signal, async () => {
        bridge.removeAllListeners('deviceStateChange');
        bridge.removeAllListeners('deviceReady');

        await bridge.destroy();

        // Wait for mqtt broker to accept last will messages:
        setTimeout(() => process.exit(0), 200);
    });
});
