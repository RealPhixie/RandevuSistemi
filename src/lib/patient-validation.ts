export const TURKISH_MOBILE_PHONE_PATTERN = /^05\d{9}$/

export function normalizePhone(value: unknown) {
  return typeof value === 'string' ? value.replace(/\s/g, '').trim() : ''
}

export function isValidTurkishMobilePhone(phone: string) {
  return TURKISH_MOBILE_PHONE_PATTERN.test(phone)
}

export function normalizePersonName(value: unknown) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
}

export function isValidTckn(tckn: string) {
  if (!/^\d{11}$/.test(tckn) || tckn[0] === '0') return false

  const digits = tckn.split('').map(Number)
  const oddSum =
    digits[0] + digits[2] + digits[4] + digits[6] + digits[8]
  const evenSum = digits[1] + digits[3] + digits[5] + digits[7]
  const tenthDigit = (oddSum * 7 - evenSum) % 10
  const eleventhDigit =
    digits.slice(0, 10).reduce((total, digit) => total + digit, 0) % 10

  return digits[9] === tenthDigit && digits[10] === eleventhDigit
}

export function parseBirthDate(value: unknown) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null
  }

  const [year, month, day] = value.split('-').map(Number)
  const birthDate = new Date(Date.UTC(year, month - 1, day))

  if (
    birthDate.getUTCFullYear() !== year ||
    birthDate.getUTCMonth() !== month - 1 ||
    birthDate.getUTCDate() !== day ||
    birthDate > new Date()
  ) {
    return null
  }

  return birthDate
}
