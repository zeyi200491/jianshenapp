import type { ReactNode } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export type TableColumn<T> = {
  key: string;
  header: string;
  className?: string;
  render: (item: T) => ReactNode;
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  rowHref,
}: {
  columns: TableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  rowHref?: (row: T) => string | undefined;
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-black/8 bg-white shadow-panel">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-sand/70 text-black/55">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={cn("px-5 py-4 font-medium", column.className)}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-16 text-center text-sm text-black/45">
                  暂无数据
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const key = rowKey(row);
                const href = rowHref?.(row);
                return (
                  <tr key={key} className="border-t border-black/6 text-ink transition hover:bg-sand/35">
                    {columns.map((column, index) => (
                      <td key={`${key}-${column.key}`} className={cn("px-5 py-4 align-top", column.className)}>
                        {href && index === 0 ? (
                          <Link href={href} className="font-medium text-ink underline-offset-4 hover:underline">
                            {column.render(row)}
                          </Link>
                        ) : (
                          column.render(row)
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


