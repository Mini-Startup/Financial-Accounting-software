/**
 * Centralized Form Validation Engine for BizzMate Financial Accounting Platform.
 * Supports inline validation feedback, touched state tracking, and form-level alerts.
 */

// ─── Regex Patterns ──────────────────────────────────────────

export const CODE_REGEX = /^[A-Za-z0-9_-]{2,20}$/;
export const SCRIPT_CODE_REGEX = /^[A-Za-z0-9_-]{1,15}$/;
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export const PHONE_REGEX = /^(\+?[1-9]\d{7,14}|[6-9]\d{9})$/;
export const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

// ─── Field Validation Functions ──────────────────────────────

export function validateCode(code?: string | null): { isValid: boolean; error?: string } {
  if (!code || !code.trim()) {
    return { isValid: false, error: 'Code is required.' };
  }
  const trimmed = code.trim();
  if (!CODE_REGEX.test(trimmed)) {
    return { isValid: false, error: 'Code must be 2-20 alphanumeric characters (no spaces).' };
  }
  return { isValid: true };
}

export function validateAccountName(name?: string | null): { isValid: boolean; error?: string } {
  if (!name || !name.trim()) {
    return { isValid: false, error: 'Account name is required.' };
  }
  if (name.trim().length < 2) {
    return { isValid: false, error: 'Name must be at least 2 characters.' };
  }
  return { isValid: true };
}

export function validatePhone(phone?: string | null, isRequired = false): { isValid: boolean; error?: string } {
  if (!phone || !phone.trim()) {
    if (isRequired) return { isValid: false, error: 'Phone number is required.' };
    return { isValid: true };
  }
  // Immediately reject alphabetic characters
  if (/[a-zA-Z]/.test(phone)) {
    return { isValid: false, error: 'Phone number cannot contain alphabets.' };
  }
  // Reject disallowed symbols
  if (/[^\d+\s()-]/.test(phone)) {
    return { isValid: false, error: 'Only digits, +, space, and dashes are allowed.' };
  }
  const digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.length < 10) {
    return { isValid: false, error: 'Phone number must have at least 10 digits.' };
  }
  if (digitsOnly.length > 15) {
    return { isValid: false, error: 'Phone number cannot exceed 15 digits.' };
  }
  return { isValid: true };
}

export function validateEmail(email?: string | null, isRequired = false): { isValid: boolean; error?: string } {
  if (!email || !email.trim()) {
    if (isRequired) return { isValid: false, error: 'Email address is required.' };
    return { isValid: true };
  }
  const trimmed = email.trim();
  if (!EMAIL_REGEX.test(trimmed)) {
    return { isValid: false, error: 'Enter a valid email address (e.g. name@domain.com).' };
  }
  return { isValid: true };
}

export function validateIFSC(ifsc?: string | null): { isValid: boolean; error?: string } {
  if (!ifsc || !ifsc.trim()) {
    return { isValid: true }; // IFSC is optional
  }
  const upper = ifsc.trim().toUpperCase();
  if (!IFSC_REGEX.test(upper)) {
    return { isValid: false, error: 'IFSC must be 11 characters (e.g. HDFC0001234, 5th char must be 0).' };
  }
  return { isValid: true };
}

export function validateScriptShortName(shortName?: string | null): { isValid: boolean; error?: string } {
  if (!shortName || !shortName.trim()) {
    return { isValid: false, error: 'Short name is required.' };
  }
  const trimmed = shortName.trim();
  if (!SCRIPT_CODE_REGEX.test(trimmed)) {
    return { isValid: false, error: 'Short name must be 1-15 alphanumeric characters.' };
  }
  return { isValid: true };
}

export function validateLotSize(lotSize?: any): { isValid: boolean; error?: string } {
  if (lotSize === null || lotSize === undefined || lotSize === '') {
    return { isValid: false, error: 'Lot size is required.' };
  }
  const n = Number(lotSize);
  if (isNaN(n) || !Number.isInteger(n) || n < 1) {
    return { isValid: false, error: 'Lot size must be a positive integer (minimum 1).' };
  }
  return { isValid: true };
}

export function validateQuantity(quantity?: any): { isValid: boolean; error?: string } {
  if (quantity === null || quantity === undefined || quantity === '') {
    return { isValid: false, error: 'Quantity is required.' };
  }
  const n = Number(quantity);
  if (isNaN(n) || n === 0) {
    return { isValid: false, error: 'Quantity cannot be zero.' };
  }
  return { isValid: true };
}

export function validateRate(rate?: any): { isValid: boolean; error?: string } {
  if (rate === null || rate === undefined || rate === '') {
    return { isValid: false, error: 'Rate is required.' };
  }
  const n = Number(rate);
  if (isNaN(n) || n <= 0) {
    return { isValid: false, error: 'Market rate must be greater than zero.' };
  }
  return { isValid: true };
}

export function validateTradeDate(tradeDate?: string | Date | null): { isValid: boolean; error?: string } {
  if (!tradeDate) {
    return { isValid: false, error: 'Trade date is required.' };
  }
  const d = new Date(tradeDate);
  if (isNaN(d.getTime())) {
    return { isValid: false, error: 'Invalid trade date format.' };
  }
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 2); // Allow slight timezone variance
  if (d > tomorrow) {
    return { isValid: false, error: 'Trade date cannot be in the future.' };
  }
  return { isValid: true };
}

// ─── Composite Form Validators ────────────────────────────────

export function validateAccountForm(data: Record<string, any>): Record<string, string> {
  const errors: Record<string, string> = {};

  const codeCheck = validateCode(data.code);
  if (!codeCheck.isValid) errors.code = codeCheck.error!;

  const nameCheck = validateAccountName(data.name);
  if (!nameCheck.isValid) errors.name = nameCheck.error!;

  if (!data.groupId && !data.groupName && !data.group && !data.fldGroup) {
    errors.groupId = 'Account group is required.';
  }

  const mobileCheck = validatePhone(data.mobileNumber, false);
  if (!mobileCheck.isValid) errors.mobileNumber = mobileCheck.error!;

  const emailCheck = validateEmail(data.email, false);
  if (!emailCheck.isValid) errors.email = emailCheck.error!;

  const ifscCheck = validateIFSC(data.ifscCode);
  if (!ifscCheck.isValid) errors.ifscCode = ifscCheck.error!;

  if (data.contactPersonMobile) {
    const cpMobileCheck = validatePhone(data.contactPersonMobile, false);
    if (!cpMobileCheck.isValid) errors.contactPersonMobile = cpMobileCheck.error!;
  }
  if (data.contactPersonEmail) {
    const cpEmailCheck = validateEmail(data.contactPersonEmail, false);
    if (!cpEmailCheck.isValid) errors.contactPersonEmail = cpEmailCheck.error!;
  }

  if (data.officeNumber) {
    const officeCheck = validatePhone(data.officeNumber, false);
    if (!officeCheck.isValid) errors.officeNumber = officeCheck.error!;
  }

  if (data.whatsappNumber && !data.isWhatsappSameAsMobile) {
    const waCheck = validatePhone(data.whatsappNumber, false);
    if (!waCheck.isValid) errors.whatsappNumber = waCheck.error!;
  }

  if (data.referenceMobile) {
    const refCheck = validatePhone(data.referenceMobile, false);
    if (!refCheck.isValid) errors.referenceMobile = refCheck.error!;
  }

  return errors;
}

export function validateScriptForm(data: Record<string, any>): Record<string, string> {
  const errors: Record<string, string> = {};

  const shortNameCheck = validateScriptShortName(data.shortName);
  if (!shortNameCheck.isValid) errors.shortName = shortNameCheck.error!;

  if (!data.fullName || !String(data.fullName).trim()) {
    errors.fullName = 'Full script name is required.';
  }

  const lotCheck = validateLotSize(data.lotSize);
  if (!lotCheck.isValid) errors.lotSize = lotCheck.error!;

  if (!data.exchangeId) {
    errors.exchangeId = 'Please select an exchange.';
  }

  return errors;
}

export function validateTradeForm(data: Record<string, any>): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!data.tradeNumber || !String(data.tradeNumber).trim()) {
    errors.tradeNumber = 'Trade number is required.';
  }

  const dateCheck = validateTradeDate(data.tradeDate);
  if (!dateCheck.isValid) errors.tradeDate = dateCheck.error!;

  if (!data.accountId) {
    errors.accountId = 'Client selection is required.';
  }

  if (!data.scriptId) {
    errors.scriptId = 'Script selection is required.';
  }

  const qtyCheck = validateQuantity(data.quantity);
  if (!qtyCheck.isValid) errors.quantity = qtyCheck.error!;

  const rateCheck = validateRate(data.rate);
  if (!rateCheck.isValid) errors.rate = rateCheck.error!;

  return errors;
}
