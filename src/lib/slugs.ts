const TURKISH_CHARACTER_MAP: Record<string, string> = {
  '\u00c7': 'c',
  '\u00e7': 'c',
  '\u011e': 'g',
  '\u011f': 'g',
  '\u0130': 'i',
  '\u0131': 'i',
  '\u00d6': 'o',
  '\u00f6': 'o',
  '\u015e': 's',
  '\u015f': 's',
  '\u00dc': 'u',
  '\u00fc': 'u',
}

export function slugifyPathSegment(value: string) {
  return value
    .trim()
    .replace(
      /[\u00c7\u00e7\u011e\u011f\u0130\u0131\u00d6\u00f6\u015e\u015f\u00dc\u00fc]/g,
      (character) => TURKISH_CHARACTER_MAP[character] ?? character
    )
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function findByPathSlug<T extends { name: string }>(
  records: T[],
  slug: string
) {
  return records.find((record) => slugifyPathSegment(record.name) === slug)
}
