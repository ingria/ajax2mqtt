import UartBridge from './platform.js';
import { MqttAdapter } from './mqtt';
import { loadConfig } from './config.js';
import createLogger from './log.js';
import atexit from 'node-cleanup';

loadConfig().then((config) => {
    const logger = createLogger(config);
    const bridge = new UartBridge(config, logger);
    const Mqtt = new MqttAdapter(config, logger);

    bridge.bus.output.on('deviceStateChange', (device, diff) => {
        device.getMqttStateMessages(diff).forEach(msg => Mqtt.publish(msg));
    });

    if (config.hass.enabled) {
        bridge.bus.output.on('deviceReady', (device) => {
            logger.info('Device is ready, publishing HASS autodiscovery messages');

            Mqtt.publish(device.getHassConfig())
                .then(() => Mqtt.publish(device.getMqttStateMessages()))
                .catch((e) => logger.error(e));

            Object.entries(device.getHassActions())
                .forEach(([topic, action]) => Mqtt.subscribe(topic, action));
        });
    }

    atexit((code, signal) => {
        bridge.handleBridgeOffline(`Received ${signal} signal`);

        // Delay process killing to allow bus listener to process the device state change:
        setTimeout(() => process.kill(process.pid, signal), 0);
        atexit.uninstall();

        return false;
    });
});
