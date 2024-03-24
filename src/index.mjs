import process from 'node:process';
import UartBridge from '#src/platform.mjs';
import { MqttAdapter } from '#src/mqtt/index.mjs';
import { A2M_HASS_ENABLED } from '#src/config.mjs';
import { registerHandlers as registerBaseIntegration } from '#src/integrations/base/index.mjs';
import { registerHandlers as registerHassIntegration } from '#src/integrations/hass/index.mjs';

const Mqtt = new MqttAdapter();
await Mqtt.connect();

const Bridge = new UartBridge();

registerBaseIntegration(Bridge, Mqtt);

if (A2M_HASS_ENABLED) {
    registerHassIntegration(Bridge, Mqtt);
}

await Bridge.bootBridge();

['SIGTERM', 'SIGINT'].forEach((signal) => {
    process.on((signal), async () => {
        await Bridge.destroy();
        setTimeout(() => process.exit(0), 200); // Wait for mqtt broker to accept last will messages
    });
});
