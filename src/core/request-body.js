import { readFile as defaultReadFile } from 'node:fs/promises';
import { validationError } from './errors.js';

const bodyOptionNames = new Set(['bodyFile', 'bodyJson']);
const fileOptionPairs = [
  ['text', 'textFile'],
  ['html', 'htmlFile'],
];

export async function resolveRequestBody(options = {}, { readFile = defaultReadFile } = {}) {
  validateBodyInputConflicts(options);

  if (options.bodyFile) {
    return parseJson(await readFile(options.bodyFile, 'utf8'), `Invalid JSON in ${options.bodyFile}`);
  }

  if (options.bodyJson) {
    return parseJson(options.bodyJson, 'Invalid JSON in --body-json');
  }

  const body = {};
  for (const [key, value] of Object.entries(options)) {
    if (bodyOptionNames.has(key) || key.endsWith('File') || value === undefined) {
      continue;
    }
    body[key] = value;
  }

  for (const [field, fileField] of fileOptionPairs) {
    if (options[fileField]) {
      body[field] = await readFile(options[fileField], 'utf8');
    }
  }

  return body;
}

function validateBodyInputConflicts(options) {
  if (options.bodyFile && options.bodyJson) {
    throw validationError('--body-file and --body-json are mutually exclusive');
  }

  if (options.bodyFile || options.bodyJson) {
    const fieldOptions = Object.entries(options).filter(
      ([key, value]) => value !== undefined && !bodyOptionNames.has(key),
    );
    if (fieldOptions.length > 0) {
      throw validationError('--body-file/--body-json cannot be combined with field-level body options');
    }
  }

  for (const [field, fileField] of fileOptionPairs) {
    if (options[field] && options[fileField]) {
      throw validationError(`--${kebab(field)} and --${kebab(fileField)} are mutually exclusive`);
    }
  }
}

function parseJson(text, message) {
  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('JSON body must be an object');
    }
    return value;
  } catch (error) {
    throw validationError(`${message}: ${error.message}`);
  }
}

function kebab(value) {
  return value.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}
