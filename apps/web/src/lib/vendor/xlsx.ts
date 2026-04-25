import * as xlsxNamespace from "@e965/xlsx/dist/xlsx.full.min.js";
import type * as XLSXTypes from "@e965/xlsx";

const candidate = xlsxNamespace as typeof xlsxNamespace & {
  default?: typeof XLSXTypes;
};
const XLSX = (candidate.default ?? candidate) as typeof XLSXTypes;

export const read = XLSX.read;
export const utils = XLSX.utils;
export const writeFile = XLSX.writeFile;
export const SSF = XLSX.SSF;

export default XLSX;
