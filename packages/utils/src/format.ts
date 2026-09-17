export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);
export const formatNumber = (num: number) => num.toLocaleString("en-IN");
