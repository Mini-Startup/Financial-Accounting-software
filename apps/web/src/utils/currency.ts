export function formatCurrencySymbol(symbol?: string | null, code?: string | null): string {
  const cleanCode = (code || '').toUpperCase().trim();
  const cleanSym = (symbol || '').trim();

  if (cleanSym && cleanSym !== cleanCode && cleanSym !== 'USD' && cleanSym !== 'INR') {
    return cleanSym;
  }
  if (cleanCode === 'USD' || cleanSym === 'USD') return '$';
  if (cleanCode === 'INR' || cleanSym === 'INR') return '₹';
  if (cleanCode === 'AED' || cleanSym === 'AED') return 'AED ';
  if (cleanCode === 'EUR' || cleanSym === 'EUR') return '€';
  if (cleanCode === 'GBP' || cleanSym === 'GBP') return '£';
  return cleanSym || (cleanCode ? `${cleanCode} ` : '$');
}
