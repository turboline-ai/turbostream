import React from 'react';

export interface TableColumn {
  title: string;
  dataIndex?: string;
  key?: string;
  width?: number | string;
  render?: (value: any, record: any, index: number) => React.ReactNode;
}

export interface TableProps {
  dataSource: any[];
  columns: TableColumn[];
  pagination?: boolean;
  size?: 'small' | 'medium' | 'large';
  rowKey?: string | ((record: any) => string);
  className?: string;
}

const Table: React.FC<TableProps> = ({
  dataSource,
  columns,
  pagination = false,
  size = 'medium',
  rowKey = 'key',
  className = ''
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'text-sm';
      case 'large':
        return 'text-lg';
      case 'medium':
      default:
        return 'text-base';
    }
  };

  const getRowKey = (record: any, index: number) => {
    if (typeof rowKey === 'function') {
      return rowKey(record);
    }
    return record[rowKey] || index;
  };

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-600">
            {columns.map((column, index) => (
              <th
                key={column.key || column.dataIndex || index}
                className={`text-left py-3 px-4 text-gray-300 font-medium ${getSizeClasses()}`}
                style={{ width: column.width }}
              >
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataSource.map((record, rowIndex) => (
            <tr
              key={getRowKey(record, rowIndex)}
              className="border-b border-gray-700 hover:bg-gray-700/30"
            >
              {columns.map((column, colIndex) => {
                const value = column.dataIndex ? record[column.dataIndex] : undefined;
                const renderedValue = column.render
                  ? column.render(value, record, rowIndex)
                  : value;

                return (
                  <td
                    key={`${column.key || column.dataIndex || colIndex}-${rowIndex}`}
                    className={`py-3 px-4 text-white ${getSizeClasses()}`}
                  >
                    {renderedValue}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;