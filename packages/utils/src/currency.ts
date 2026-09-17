export const parseCurrency = (value: string) => parseFloat(value.replace(/[^0-9.-]+/g, ""));
