import { SupportedMessages, MessageUnsupported } from './schema.js';

/**
 * Each message can contain "kwargs" flags after "args".
 *
 * @param  {Array}  data  ['KEY=VAL', 'KEY2=VAL2', ...]
 * @return {Object}       {'KEY':VAL, 'KEY2':VAL2, ...}
 */
const parseKeyValuePairs = (data, kwargsMapping = {}) => {
    const flags = {};

    data.forEach((pair) => {
        let [key, value] = pair.split('=');

        // Some keys are described in schema. In that case,
        // replace the default three-symbol KEY to readable_name:
        if (key in kwargsMapping) {
            const [readableKey, castFunction] = kwargsMapping[key];

            key = readableKey;
            value = castFunction(value);
        }

        // Just a flag without any value:
        if (value === undefined) {
            value = true;
        }

        // Keys are not unique and may repeat. In that case,
        // join them into array:
        if (key in flags) {
            flags[key] = [flags[key]];
            flags[key].push(value);
        } else {
            flags[key] = value;
        }
    });

    return flags;
};

/**
 * Matches raw string data with schema, returns object.
 *
 * @param  {String} data    arg1;arg2;arg3;kwarg1=val1;kwarg2=val2;
 * @param  {Object} schema  Schema object for the current message
 * @return {Object}
 */
const matchDataWithSchema = (data, schema) => {
    const fragments = data.split(';').filter(Boolean);
    const obj = {};

    const sequentialFields = Object.entries(schema.fields);

    sequentialFields.forEach(([name, cast_function], idx) => {
        obj[name] = cast_function(fragments[idx]);
    });

    // Attach kwargs pairs:
    if (sequentialFields.length < fragments.length) {
        obj.flags = parseKeyValuePairs(fragments.slice(sequentialFields.length), schema.kwargs);
    }

    return obj;
};

/**
 * Trying to match raw string data to supported message schema.
 *
 * @param  {String} message  Raw data from uartBridge
 * @return {Object}
 */
export default function parseMessage(message) {
    let messageObject = {
        type: MessageUnsupported,
    };

    for (let i = SupportedMessages.length - 1; i >= 0; i--) {
        const schema = SupportedMessages[i];
        const match = message.match(schema.regex);

        if (match && match.length > 1) {
            const payload = matchDataWithSchema(match[1], schema);

            messageObject = {
                type: schema.id,
                device_id: payload.device_id,
                payload,
            };

            break;
        }
    }

    return { ...messageObject,
        raw: message,
    };
}
