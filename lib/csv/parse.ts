export type Delimiter = "," | ";" | "\t";

/**
 * Guesses the delimiter from the first line: commas usually, semicolons from spreadsheets in
 * some regions, tabs when cells are pasted straight from a spreadsheet.
 */
export function detectDelimiter(text: string): Delimiter {
  const firstLine = text.replace(/^﻿/, "").split(/\r?\n/, 1)[0] ?? "";
  const unquoted = firstLine.replace(/"[^"]*"/g, "");
  const counts: [Delimiter, number][] = [
    ["\t", unquoted.split("\t").length - 1],
    [";", unquoted.split(";").length - 1],
    [",", unquoted.split(",").length - 1],
  ];
  const [best] = counts.sort((a, b) => b[1] - a[1]);
  return best && best[1] > 0 ? best[0] : ",";
}

/**
 * Parses CSV (RFC 4180): quoted fields may contain delimiters, line breaks and doubled quotes.
 * Blank lines are skipped. Accepts LF or CRLF line endings and a UTF-8 byte order mark.
 */
export function parseCsv(text: string, delimiter: Delimiter = detectDelimiter(text)): string[][] {
  const input = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  const endRow = () => {
    row.push(field);
    if (row.some((cell) => cell.trim() !== "")) rows.push(row);
    row = [];
    field = "";
  };

  for (let i = 0; i < input.length; i++) {
    const char = input[i]!;
    if (quoted) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"' && field === "") {
      quoted = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[i + 1] === "\n") i++;
      endRow();
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length) endRow();
  return rows;
}
