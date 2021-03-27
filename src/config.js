import yaml from 'js-yaml';
import Fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const configFileLocation = path.join(currentDirectory, '../config.yaml');

/**
 * @return {Promise<Object>} Config object
 */
const loadConfig = function loadAndParseConfigYaml() {
    return new Promise((resolve, reject) => {
        try {
            const configFileContents = Fs.readFileSync(configFileLocation);
            const config = yaml.load(configFileContents, 'utf8');

            Object.keys(config).forEach(key => Object.freeze(config[key]));

            resolve(Object.freeze(config));
        } catch (e) {
            reject(e);
        }
    });
};

export { loadConfig };
