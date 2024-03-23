import { consola, createConsola } from 'consola';
import { A2M_LOG_LEVEL } from '#src/config.mjs';

export default function ({ tag } = {}) {
    return createConsola({
        level: consola.options.types[A2M_LOG_LEVEL]?.level ?? 3,
        fancy: false,
        tag,
    });
};
