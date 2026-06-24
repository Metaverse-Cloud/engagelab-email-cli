import Table from 'cli-table3';
import { ui } from './ui.js';

export function renderTable(rows, columns) {
  if (!rows || rows.length === 0) {
    return ui.empty('No results');
  }

  const table = new Table({
    head: columns.map((column) => ui.tableHeader(column.header)),
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

  table.push(...rows.map((row) => columns.map((column, index) => ui.tableCell(column.value(row), index))));
  return table.toString();
}
