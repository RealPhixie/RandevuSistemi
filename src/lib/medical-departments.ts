interface MedicalDepartmentCatalogEntry {
  key: string
  name: string
}

export const MEDICAL_DEPARTMENT_CATALOG = [
  { key: 'acil-servis', name: 'Acil Servis' },
  { key: 'agiz-ve-dis-sagligi', name: 'Ağız ve Diş Sağlığı' },
  { key: 'aile-hekimligi', name: 'Aile Hekimliği' },
  {
    key: 'anesteziyoloji-ve-reanimasyon',
    name: 'Anesteziyoloji ve Reanimasyon',
  },
  { key: 'beyin-ve-sinir-cerrahisi', name: 'Beyin ve Sinir Cerrahisi' },
  { key: 'cocuk-cerrahisi', name: 'Çocuk Cerrahisi' },
  {
    key: 'cocuk-sagligi-ve-hastaliklari',
    name: 'Çocuk Sağlığı ve Hastalıkları',
  },
  { key: 'dermatoloji', name: 'Dermatoloji' },
  { key: 'endokrinoloji', name: 'Endokrinoloji' },
  { key: 'enfeksiyon-hastaliklari', name: 'Enfeksiyon Hastalıkları' },
  {
    key: 'fizik-tedavi-ve-rehabilitasyon',
    name: 'Fizik Tedavi ve Rehabilitasyon',
  },
  { key: 'gastroenteroloji', name: 'Gastroenteroloji' },
  { key: 'genel-cerrahi', name: 'Genel Cerrahi' },
  { key: 'gogus-hastaliklari', name: 'Göğüs Hastalıkları' },
  { key: 'goz-hastaliklari', name: 'Göz Hastalıkları' },
  { key: 'hematoloji', name: 'Hematoloji' },
  { key: 'ic-hastaliklari', name: 'İç Hastalıkları' },
  {
    key: 'kadin-hastaliklari-ve-dogum',
    name: 'Kadın Hastalıkları ve Doğum',
  },
  { key: 'kalp-ve-damar-cerrahisi', name: 'Kalp ve Damar Cerrahisi' },
  { key: 'kardiyoloji', name: 'Kardiyoloji' },
  { key: 'kulak-burun-bogaz', name: 'Kulak Burun Boğaz' },
  { key: 'nefroloji', name: 'Nefroloji' },
  { key: 'noroloji', name: 'Nöroloji' },
  { key: 'onkoloji', name: 'Onkoloji' },
  { key: 'ortopedi-ve-travmatoloji', name: 'Ortopedi ve Travmatoloji' },
  {
    key: 'plastik-rekonstruktif-ve-estetik-cerrahi',
    name: 'Plastik, Rekonstrüktif ve Estetik Cerrahi',
  },
  { key: 'psikiyatri', name: 'Psikiyatri' },
  { key: 'radyoloji', name: 'Radyoloji' },
  { key: 'romatoloji', name: 'Romatoloji' },
  { key: 'uroloji', name: 'Üroloji' },
] as const satisfies readonly MedicalDepartmentCatalogEntry[]

function normalizeDepartmentName(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR')
}

const departmentsByKey: ReadonlyMap<string, MedicalDepartmentCatalogEntry> =
  new Map(
    MEDICAL_DEPARTMENT_CATALOG.map((department) => [
      department.key,
      department,
    ])
  )

const departmentsByName: ReadonlyMap<string, MedicalDepartmentCatalogEntry> =
  new Map(
    MEDICAL_DEPARTMENT_CATALOG.map((department) => [
      normalizeDepartmentName(department.name),
      department,
    ])
  )

export function findMedicalDepartmentByKey(value: unknown) {
  const key = typeof value === 'string' ? value.trim() : ''
  return departmentsByKey.get(key) ?? null
}

export function resolveDepartmentIcon(name: string, storedIcon: string) {
  return departmentsByName.get(normalizeDepartmentName(name))?.key ?? storedIcon
}
