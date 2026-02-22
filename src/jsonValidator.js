/**
 * Validates rows of JSON data before saving.
 *
 * The rules apply only when the data contains the field used_in_strategy.
 * The full validation chain (part_of_call_interface, field_direction, etc.)
 * only runs when those fields exist in the data schema.
 *
 * @param {Object|Array} json      – the reconstructed JSON
 * @param {string}       structure – 'array' | 'object-of-objects' | 'object'
 * @returns {Array<{row:number, key:string, field:string, message:string}>}
 */
function validateJson(json, structure) {
  const errors = [];

  // Normalize to row array
  let rows = [];
  if (structure === 'array') {
    rows = json;
  } else if (structure === 'object-of-objects') {
    rows = Object.entries(json).map(([key, val]) => ({ _key: key, ...val }));
  } else if (structure === 'object') {
    rows = [json];
  }

  // Detect whether this schema has the full set of validation fields.
  // If part_of_call_interface doesn't appear in any row, we skip the
  // detailed checks that depend on it.
  const hasFullSchema = rows.some(
    r => r && typeof r === 'object' && 'part_of_call_interface' in r
  );

  rows.forEach((row, idx) => {
    if (!row || typeof row !== 'object') return;

    const rowLabel = row._key || `Row ${idx + 1}`;

    // Only validate rows that have used_in_strategy
    if (!('used_in_strategy' in row)) return;

    // ── Resolve field values (support both naming conventions) ──
    const usedInStrategy = row.used_in_strategy;
    const fieldName      = row.field_name ?? row._key;
    const fieldBlockCat  = row.field_data_block_category ?? row.data_block_category;
    const partOfCall     = row.part_of_call_interface;
    const fieldType      = row.field_type ?? row.datatype;
    const fieldDirection = row.field_direction;
    const mandatoryInput = row.mandatory_presence_in_input ?? row.mandatory_in_input;

    // Normalize any value to lowercase string
    const norm = v => (v == null ? null : String(v).toLowerCase().trim());

    // Map true/false/y/n → 'y' or 'n'; anything else passes through
    const toYN = v => {
      if (v === null) return null;
      if (v === 'y' || v === 'true')  return 'y';
      if (v === 'n' || v === 'false') return 'n';
      return v;
    };

    const uis   = norm(usedInStrategy);
    const uisYN = toYN(uis);

    // ── CHECK 1: used_in_strategy must be Y or N ──
    if (uisYN !== 'y' && uisYN !== 'n') {
      errors.push({
        row: idx, key: rowLabel, field: 'used_in_strategy',
        message: 'used_in_strategy must be Y or N (or true/false). Got: ' +
                 (usedInStrategy === null ? 'null' : String(usedInStrategy)),
      });
      return;
    }

    if (uisYN !== 'y') return; // 'n' → all clear

    // ── Remaining checks only apply when the schema has part_of_call_interface ──
    if (!hasFullSchema) return;

    // field_name required
    if (fieldName == null || String(fieldName).trim() === '') {
      errors.push({ row: idx, key: rowLabel, field: 'field_name',
        message: 'field_name is required when used_in_strategy is Y' });
      return;
    }

    // data_block_category required
    if (fieldBlockCat == null || String(fieldBlockCat).trim() === '') {
      errors.push({ row: idx, key: rowLabel, field: 'data_block_category',
        message: 'data_block_category is required when used_in_strategy is Y' });
      return;
    }

    // part_of_call_interface must be y/n
    const poci = toYN(norm(partOfCall));
    if (poci !== 'y' && poci !== 'n') {
      errors.push({ row: idx, key: rowLabel, field: 'part_of_call_interface',
        message: 'part_of_call_interface must be Y or N when used_in_strategy is Y' });
      return;
    }

    const VALID_TYPES = [
      'boolean', 'string', 'list_string',
      'integer', 'list_integer',
      'decimal', 'list_decimal',
      'float', 'list_float',
    ];

    if (poci === 'y') {
      const ft = norm(fieldType);
      if (ft === null || !VALID_TYPES.includes(ft)) {
        errors.push({ row: idx, key: rowLabel, field: 'field_type',
          message: `field_type must be one of: ${VALID_TYPES.join(', ')}` });
        return;
      }

      const fd = norm(fieldDirection);
      if (fd !== null && !['inout', 'input', 'output'].includes(fd)) {
        errors.push({ row: idx, key: rowLabel, field: 'field_direction',
          message: 'field_direction must be inout, input, or output' });
        return;
      }

      const mpi = toYN(norm(mandatoryInput));
      if (mpi !== null && mpi !== 'y' && mpi !== 'n') {
        errors.push({ row: idx, key: rowLabel, field: 'mandatory_presence_in_input',
          message: 'mandatory_presence_in_input must be Y or N' });
        return;
      }

      if (fd && ['output', 'none'].includes(fd) && mpi === 'y') {
        errors.push({ row: idx, key: rowLabel, field: 'mandatory_presence_in_input',
          message: 'mandatory_presence_in_input cannot be Y when field_direction is output/none' });
        return;
      }
    }

    if (poci === 'n') {
      const mpi = toYN(norm(mandatoryInput));
      if (mpi === 'y') {
        errors.push({ row: idx, key: rowLabel, field: 'mandatory_presence_in_input',
          message: 'mandatory_presence_in_input cannot be Y when part_of_call_interface is N' });
        return;
      }
    }
  });

  return errors;
}

module.exports = { validateJson };
