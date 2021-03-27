import Consola from 'consola';
import LogLevel from 'consola/src/types.js';

export default function ({ log }) {
    const Reporter = log.fancy
        ? Consola.FancyReporter
        : Consola.BasicReporter;

    return Consola.create({ ...LogLevel[log.level],
        reporters: [ new Reporter() ],
    });
};
