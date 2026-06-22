import { validationError } from './errors.js';

export function parsePositiveInteger(value) {
  const number = Number.parseInt(value, 10);
  if (!Number.isInteger(number) || number <= 0) {
    throw validationError('Expected a positive integer');
  }
  return number;
}

export function parseNonNegativeInteger(value) {
  const number = Number.parseInt(value, 10);
  if (!Number.isInteger(number) || number < 0) {
    throw validationError('Expected a non-negative integer');
  }
  return number;
}

export function collect(value, previous = []) {
  return [...previous, value];
}

export function compactObject(object) {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  );
}

export function requireValue(value, message) {
  if (value === undefined || value === null || value === '') {
    throw validationError(message);
  }
  return value;
}
