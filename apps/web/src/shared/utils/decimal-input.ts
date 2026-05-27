type DecimalParseOptions = {
  min: number;
  max: number;
  decimals: number;
  allowZero?: boolean;
  fieldLabel?: string;
};

export type DecimalParseResult =
  | { ok: true; value: number; normalized: string }
  | { ok: false; reason: string };

function parseDecimalInput(value: string, options: DecimalParseOptions): DecimalParseResult {
  const label = options.fieldLabel ?? "El valor";

  if (value === "") {
    return { ok: false, reason: `${label} es obligatorio.` };
  }

  if (value !== value.trim()) {
    return { ok: false, reason: `${label} no debe tener espacios.` };
  }

  if (value.includes(",")) {
    return { ok: false, reason: `${label} debe usar punto decimal.` };
  }

  const decimalPattern = new RegExp(`^(?:0|[1-9]\\d*)(?:\\.\\d{1,${options.decimals}})?$`);
  if (!decimalPattern.test(value)) {
    return { ok: false, reason: `${label} debe tener formato decimal valido.` };
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return { ok: false, reason: `${label} debe ser finito.` };
  }

  if (parsed === 0 && !options.allowZero) {
    return { ok: false, reason: `${label} debe ser mayor a cero.` };
  }

  if (parsed < options.min || parsed > options.max) {
    return { ok: false, reason: `${label} debe estar entre ${options.min} y ${options.max}.` };
  }

  return {
    ok: true,
    value: parsed,
    normalized: parsed.toFixed(options.decimals)
  };
}

export function parseMoneyInput(
  value: string,
  options: Omit<DecimalParseOptions, "decimals">
): DecimalParseResult {
  return parseDecimalInput(value, { ...options, decimals: 2 });
}

export function parseKgInput(
  value: string,
  options: Omit<DecimalParseOptions, "decimals">
): DecimalParseResult {
  return parseDecimalInput(value, { ...options, decimals: 3 });
}
