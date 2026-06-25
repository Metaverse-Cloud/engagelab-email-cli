import { color } from './colors.js';

export const ui = {
  start(message) {
    return `${color.cyan('>>')} ${message}`;
  },
  success(message) {
    return `${color.green('OK')} ${message}`;
  },
  failure(message) {
    return `${color.red('X')} ${message}`;
  },
  warning(message) {
    return `${color.yellow('Warning:')} ${message}`;
  },
  label(value) {
    return color.cyan(value);
  },
  heading(value) {
    return color.bold(value);
  },
  muted(value) {
    return color.dim(value);
  },
  command(value) {
    return color.bold(value);
  },
  empty(value) {
    return color.dim(value);
  },
  tableHeader(value) {
    return stringify(value);
  },
  tableCell(value) {
    return stringify(value);
  },
  listenMessage({ time, route, subject, id }) {
    return [
      color.dim(`[${time}]`),
      color.cyan(route),
      color.bold(color.yellow(`"${subject}"`)),
      id ? color.dim(String(id)) : null,
    ]
      .filter(Boolean)
      .join('  ');
  },
};

function stringify(value) {
  if (Array.isArray(value)) return value.join(', ');
  if (value === undefined || value === null) return '';
  return String(value);
}
