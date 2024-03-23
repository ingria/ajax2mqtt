export const A2M_SERIAL_PORT = process.env.A2M_SERIAL_PORT;
export const A2M_SERIAL_BAUDRATE = 57600;
export const A2M_SERIAL_DELIMITER = '\r\n';
export const A2M_MQTT_ADDRESS = 'mqtt://' + (process.env.A2M_MQTT_ADDRESS ?? 'mqtt://127.0.0.1').replace(/^mqtt:\/\//, '');
export const A2M_MQTT_PASSWORD = process.env.A2M_MQTT_PASSWORD;
export const A2M_MQTT_USERNAME = process.env.A2M_MQTT_USERNAME;
export const A2M_MQTT_BASE_TOPIC = process.env.A2M_MQTT_BASE_TOPIC ?? 'ajax2mqtt';
export const A2M_HASS_ENABLED = ['1', 'true', 'on'].includes((process.env.A2M_HASS_ENABLED ?? true).toString());
export const A2M_HASS_BASE_TOPIC = process.env.A2M_HASS_BASE_TOPIC ?? 'homeassistant';
export const A2M_LOG_LEVEL = process.env.A2M_LOG_LEVEL ?? 'error';

if (typeof A2M_SERIAL_PORT !== 'string') {
    throw new Error('A2M_SERIAL_PORT env variable must be set');
}
