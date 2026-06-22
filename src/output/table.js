export function renderTable(rows, columns) {
  if (!rows || rows.length === 0) {
    return 'No results';
  }

  const values = rows.map((row) => columns.map((column) => stringify(column.value(row))));
  const widths = columns.map((column, index) =>
    Math.max(column.header.length, ...values.map((row) => row[index].length)),
  );
  const header = columns.map((column, index) => pad(column.header, widths[index])).join('  ');
  const separator = widths.map((width) => '-'.repeat(width)).join('  ');
  const body = values.map((row) => row.map((value, index) => pad(value, widths[index])).join('  '));

  return [header, separator, ...body].join('\n');
}

function stringify(value) {
  if (Array.isArray(value)) return value.join(', ');
  if (value === undefined || value === null) return '';
  return String(value);
}

function pad(value, width) {
  return value.padEnd(width, ' ');
}
