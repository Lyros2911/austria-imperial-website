/**
 * Get a localized field from a database entity.
 * Falls back to German if the requested locale's field is empty/null.
 *
 * Usage: getLocalizedField(product, 'name', 'en') → product.nameEn || product.nameDe
 */
export function getLocalizedField(
  entity: Record<string, unknown>,
  field: string,
  locale: string
): string {
  // Direct match for locales with DB columns
  if (locale === 'en') {
    return (entity[`${field}En`] as string) || (entity[`${field}De`] as string) || '';
  }
  if (locale === 'ar') {
    return (entity[`${field}Ar`] as string) || (entity[`${field}De`] as string) || '';
  }
  if (locale === 'de') {
    return (entity[`${field}De`] as string) || '';
  }
  // FR, IT, ES: no dedicated DB columns yet → fall back to EN → DE
  return (entity[`${field}En`] as string) || (entity[`${field}De`] as string) || '';
}
