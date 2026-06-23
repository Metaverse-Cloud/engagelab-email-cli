import Table from 'cli-table3';
import pc from 'picocolors';

export function renderTable(rows, columns) {
  if (!rows || rows.length === 0) {
    return pc.dim('No results');
  }

  const table = new Table({
    head: columns.map((column) => pc.bold(column.header)),
    style: {
      border: [],
      head: [],
    },
    chars: {
      top: '─',
      'top-mid': '┬',
      'top-left': '┌',
      'top-right': '┐',
      bottom: '─',
      'bottom-mid': '┴',
      'bottom-left': '└',
      'bottom-right': '┘',
      left: '│',
      'left-mid': '├',
      mid: '─',
      'mid-mid': '┼',
      right: '│',
      'right-mid': '┤',
      middle: '│',
    },
  });

  table.push(...rows.map((row) => columns.map((column) => stringify(column.value(row)))));
  return table.toString();
}

function stringify(value) {
  if (Array.isArray(value)) return value.join(', ');
  if (value === undefined || value === null) return '';
  return String(value);
}
