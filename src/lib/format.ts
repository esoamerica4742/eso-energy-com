export function formatKw(value: number, decimals = 1): string {
  return `${value.toLocaleString("en-NG", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} kW`;
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toLocaleString("en-NG", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}%`;
}

export function formatKwh(value: number, decimals = 2): string {
  return `${value.toLocaleString("en-NG", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} kWh`;
}

export function formatNaira(value: number, decimals = 2): string {
  return `NGN ${value.toLocaleString("en-NG", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}
