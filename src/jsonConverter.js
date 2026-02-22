// ─── Type helpers ────────────────────────────────────────────────

/**
 * Returns the JS type tag for a value.
 * Distinguishes null, array, object, string, number, boolean.
 */
function getValueType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';
  return typeof value; // 'string' | 'number' | 'boolean'
}

/**
 * Converts any JS value to a string suitable for spreadsheet display.
 * Arrays/objects are JSON-stringified; null becomes empty string.
 */
function valueToDisplay(value) {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value) || typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

// ─── JSON → Sheet ───────────────────────────────────────────────

/**
 * Converts parsed JSON into FortuneSheet celldata + a type map.
 *
 * Supported shapes:
 *   1. Array of objects  → rows = elements, columns = union of keys
 *   2. Object of objects → rows = entries,  columns = _key + union of inner keys
 *   3. Simple object     → single row, columns = keys
 *
 * Returns { sheetData, typeMap, structure, keys, headers }
 */
function jsonToSheetData(json) {
  let structure, keys, rows, headers;

  if (Array.isArray(json)) {
    structure = 'array';
    keys = [];
    if (json.length === 0) {
      return emptySheet('array');
    }
    const keySet = new Set();
    json.forEach(item => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        Object.keys(item).forEach(k => keySet.add(k));
      }
    });
    headers = Array.from(keySet);
    rows = json;

  } else if (typeof json === 'object' && json !== null) {
    const topKeys = Object.keys(json);
    if (topKeys.length === 0) {
      return emptySheet('object');
    }

    const firstValue = json[topKeys[0]];
    if (firstValue && typeof firstValue === 'object' && !Array.isArray(firstValue)) {
      // Object of objects (the variable_config pattern)
      structure = 'object-of-objects';
      keys = topKeys;
      const propSet = new Set();
      topKeys.forEach(k => {
        if (json[k] && typeof json[k] === 'object') {
          Object.keys(json[k]).forEach(p => propSet.add(p));
        }
      });
      headers = ['_key', ...Array.from(propSet)];
      rows = topKeys.map(k => ({ _key: k, ...json[k] }));
    } else {
      // Simple flat object
      structure = 'object';
      keys = topKeys;
      headers = topKeys;
      rows = [json];
    }
  } else {
    throw new Error('JSON must be an object or array');
  }

  // ── Build per-cell type map ──
  const typeMap = {};
  rows.forEach((row, rowIdx) => {
    if (!row || typeof row !== 'object') return;
    headers.forEach((header, colIdx) => {
      const value = row[header];
      if (value !== undefined) {
        typeMap[`${rowIdx + 1}_${colIdx}`] = getValueType(value);
      }
    });
  });

  // ── Build celldata (sparse format) ──
  const celldata = [];

  // Header row (row 0) — bold
  headers.forEach((header, colIdx) => {
    celldata.push({
      r: 0,
      c: colIdx,
      v: {
        v: header,
        m: header,
        bl: 1,
        ct: { fa: '@', t: 's' },
      },
    });
  });

  // Data rows (row 1+)
  rows.forEach((row, rowIdx) => {
    if (!row || typeof row !== 'object') return;
    headers.forEach((header, colIdx) => {
      const value = row[header];
      if (value === undefined) return;

      const display = valueToDisplay(value);
      const cell = {
        r: rowIdx + 1,
        c: colIdx,
        v: {
          m: display,
          ct: { fa: '@', t: 's' },
        },
      };

      if (typeof value === 'number') {
        cell.v.v = value;
        cell.v.ct = { fa: 'General', t: 'n' };
      } else {
        cell.v.v = display;
      }

      celldata.push(cell);
    });
  });

  // ── Assemble sheet ──
  const columnlen = {};
  headers.forEach((h, idx) => {
    const maxLen = Math.max(h.length, 10);
    columnlen[idx] = Math.min(Math.max(maxLen * 9, 80), 220);
  });

  const sheetData = [
    {
      name: 'Sheet1',
      id: 'sheet1',
      status: 1,
      celldata,
      row: rows.length + 1,
      column: headers.length,
      config: { columnlen },
    },
  ];

  return { sheetData, typeMap, structure, keys, headers };
}

/** Returns a minimal empty sheet. */
function emptySheet(structure) {
  return {
    sheetData: [
      {
        name: 'Sheet1',
        id: 'sheet1',
        status: 1,
        celldata: [],
        row: 1,
        column: 1,
        config: {},
      },
    ],
    typeMap: {},
    structure,
    keys: [],
    headers: [],
  };
}

// ─── Sheet → JSON ───────────────────────────────────────────────

/**
 * Casts a display value (from the spreadsheet) back to its original JS type.
 *
 * Empty cells become:
 *   string  → ''
 *   number  → null
 *   boolean → null
 *   null    → null
 *   array   → null
 *   object  → null
 */
function castValue(displayValue, originalType) {
  if (displayValue === undefined || displayValue === null || displayValue === '') {
    if (originalType === 'string') return '';
    return null;
  }

  const str = String(displayValue).trim();

  switch (originalType) {
    case 'number': {
      const num = Number(str);
      return isNaN(num) ? null : num;
    }
    case 'boolean': {
      const lower = str.toLowerCase();
      if (lower === 'true' || lower === '1' || lower === 'yes' || lower === 'y') return true;
      if (lower === 'false' || lower === '0' || lower === 'no' || lower === 'n') return false;
      return null;
    }
    case 'null': {
      if (str === '' || str.toLowerCase() === 'null') return null;
      const num = Number(str);
      if (!isNaN(num)) return num;
      return str;
    }
    case 'array':
    case 'object': {
      try {
        return JSON.parse(str);
      } catch {
        return str;
      }
    }
    case 'string':
    default:
      return String(displayValue);
  }
}

/**
 * Converts a 2-D grid of display values back into the original JSON shape.
 *
 * @param {Array<Array>} values   – 2-D array; row 0 = headers, row 1+ = data
 * @param {Object}       typeMap  – per-cell original types ("row_col" → type)
 * @param {string}       structure – 'array' | 'object-of-objects' | 'object'
 * @param {string[]}     headers  – column header names
 * @param {string[]}     originalKeys – original top-level keys (object-of-objects)
 */
function sheetDataToJson(values, typeMap, structure, headers, originalKeys) {
  const dataRows = [];

  for (let r = 1; r < values.length; r++) {
    const rowValues = values[r] || [];
    // Skip fully empty rows
    const allEmpty = rowValues.every(
      v => v === null || v === undefined || v === ''
    );
    if (allEmpty) continue;

    const row = {};
    for (let c = 0; c < headers.length; c++) {
      const raw = rowValues[c] !== undefined ? rowValues[c] : '';
      const origType = typeMap[`${r}_${c}`] || 'string';
      row[headers[c]] = castValue(raw, origType);
    }
    dataRows.push(row);
  }

  if (structure === 'array') {
    return dataRows;
  }

  if (structure === 'object-of-objects') {
    const result = {};
    dataRows.forEach((row, idx) => {
      const key = row._key || originalKeys[idx] || `row_${idx}`;
      const { _key, ...rest } = row;
      result[key] = rest;
    });
    return result;
  }

  // Simple object
  return dataRows[0] || {};
}

module.exports = {
  jsonToSheetData,
  sheetDataToJson,
  getValueType,
  castValue,
  valueToDisplay,
};
