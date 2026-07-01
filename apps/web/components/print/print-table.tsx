import type { PrintTableColumnDto } from '@hivork/contracts/core';

type PrintTableProps = {
  columns: PrintTableColumnDto[];
  rows: string[][];
};

export function PrintTable({ columns, rows }: PrintTableProps) {
  return (
    <table className="print-table">
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.id} scope="col">
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={`row-${rowIndex}`}>
            {row.map((cell, cellIndex) => (
              <td key={`${rowIndex}-${columns[cellIndex]?.id ?? cellIndex}`}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
