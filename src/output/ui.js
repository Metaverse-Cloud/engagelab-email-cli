import { color } from './colors.js';

const columnColors = [color.cyan, color.yellow, color.magenta, color.blue, color.green];

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
    return color.bold(color.cyan(value));
  },
  tableCell(value, columnIndex) {
    const text = stringify(value);
    if (!text) return '';

    const statusColor = colorForStatus(text);
    if (statusColor) return statusColor(text);

    const columnColor = columnColors[columnIndex % columnColors.length];
    return columnColor(text);
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

function colorForStatus(value) {
  const normalized = value.trim().toLowerCase();

  if (/fail|error|reject|invalid/.test(normalized)) return color.red;
  if (/pending|processing|parsing|waiting/.test(normalized)) return color.yellow;
  if (/ok|success|sent|done|parsed|received|replied|active/.test(normalized)) return color.green;

  return null;
}
