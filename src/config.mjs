import pkg from '../package.json' assert { type: 'json' };

export const A2M_APP_NAME = pkg.name;
export const A2M_APP_VERSION = pkg.version;
export const A2M_APP_SUPPORT_URL = pkg.repository.url;

export const A2M_SERIAL_PORT = process.env.A2M_SERIAL_PORT;
export const A2M_SERIAL_BAUDRATE = 57600;
export const A2M_SERIAL_DELIMITER = '\r\n';
export const A2M_MQTT_ADDRESS = 'mqtt://' + (process.env.A2M_MQTT_ADDRESS ?? 'mqtt://127.0.0.1').replace(/^mqtt:\/\//, '');
export const A2M_MQTT_PASSWORD = process.env.A2M_MQTT_PASSWORD;
export const A2M_MQTT_USERNAME = process.env.A2M_MQTT_USERNAME;
export const A2M_MQTT_BASE_TOPIC = process.env.A2M_MQTT_BASE_TOPIC ?? 'ajax2mqtt';
export const A2M_HASS_USE_SHARED_STATE_TOPIC = true;
export const A2M_HASS_ENABLED = ['1', 'true', 'on'].includes((process.env.A2M_HASS_ENABLED ?? true).toString());
export const A2M_HASS_BASE_TOPIC = process.env.A2M_HASS_BASE_TOPIC ?? 'homeassistant';
export const A2M_LOG_LEVEL = process.env.A2M_LOG_LEVEL ?? 'error';

if (typeof A2M_SERIAL_PORT !== 'string') {
    throw new Error('A2M_SERIAL_PORT env variable must be set');
}
