import { consola, createConsola } from 'consola';
import { A2M_LOG_LEVEL } from '#src/config.mjs';

export default function createLogger({ tag } = {}) {
    return createConsola({
        tag,
        level: consola.options.types[A2M_LOG_LEVEL]?.level ?? 3,
        fancy: ['verbose', 'debug', 'info'].includes(A2M_LOG_LEVEL),
        formatOptions: {
            date: true,
        },
    });
}
