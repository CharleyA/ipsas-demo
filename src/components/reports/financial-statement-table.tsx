"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface RowProps {
  row: any;
  level: number;
}

function StatementRow({ row, level }: RowProps) {
  const hasChildren = row.children && row.children.length > 0;
  
  return (
    <>
      <TableRow className={cn(hasChildren && "font-semibold bg-muted/20")}>
        <TableCell className="font-mono text-xs text-muted-foreground">
          {row.code}
        </TableCell>
        <TableCell style={{ paddingLeft: `${level * 20 + 12}px` }}>
          {row.name}
        </TableCell>
        <TableCell className="text-right font-medium">
          {parseFloat(row.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </TableCell>
      </TableRow>
      {hasChildren && row.children.map((child: any) => (
        <StatementRow key={child.id} row={child} level={level + 1} />
      ))}
    </>
  );
}

export function FinancialStatementTable({ data }: { data: any[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[100px]">Code</TableHead>
          <TableHead>Classification</TableHead>
          <TableHead className="text-right">Amount (ZWG)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <StatementRow key={row.id} row={row} level={0} />
        ))}
      </TableBody>
    </Table>
  );
}
