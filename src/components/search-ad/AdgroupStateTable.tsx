"use client";

import { SearchAdStateTable } from "./SearchAdStateTable";
import type { SearchAdStateRecord } from "@/features/search-ad/domain/types";

type AdgroupStateTableProps = {
  description: string;
  records: SearchAdStateRecord[];
  title: string;
  writeEnabled: boolean;
};

export function AdgroupStateTable(props: AdgroupStateTableProps) {
  return <SearchAdStateTable {...props} targetType="adgroup" />;
}
