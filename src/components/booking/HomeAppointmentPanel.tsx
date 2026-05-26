'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState, type FormEvent, type ReactNode } from 'react'

import { DepartmentCard } from '@/components/booking/DepartmentCard'
import { HospitalCard } from '@/components/booking/HospitalCard'
import { slugifyPathSegment } from '@/lib/slugs'
import type {
  DepartmentOption,
  DoctorSearchOption,
  HospitalOption,
} from '@/types'

interface HomeAppointmentPanelProps {
  hospitals: HospitalOption[]
  departments: DepartmentOption[]
  doctors: DoctorSearchOption[]
}

type MainTab = 'appointment' | 'myAppointments'
type SelectPanel = 'hospital' | 'department' | null

interface SearchResult {
  id: string
  type: 'department' | 'doctor'
  label: string
  detail: string
  href: string
}

function normalizeSearch(value: string) {
  return value.toLocaleLowerCase('tr-TR').trim()
}

export function HomeAppointmentPanel({
  hospitals,
  departments,
  doctors,
}: HomeAppointmentPanelProps) {
  const [activeTab, setActiveTab] = useState<MainTab>('appointment')
  const [query, setQuery] = useState('')
  const [selectedHospitalId, setSelectedHospitalId] = useState(
    hospitals[0]?.id ?? ''
  )
  const [openPanel, setOpenPanel] = useState<SelectPanel>('hospital')

  const selectedHospital = hospitals.find(
    (hospital) => hospital.id === selectedHospitalId
  )

  const filteredDepartments = departments.filter(
    (department) => department.hospitalId === selectedHospitalId
  )

  const searchResults = useMemo<SearchResult[]>(() => {
    const normalizedQuery = normalizeSearch(query)
    if (normalizedQuery.length < 3) return []

    const departmentResults: SearchResult[] = departments
      .filter((department) =>
        normalizeSearch(`${department.name} ${department.hospitalName}`).includes(
          normalizedQuery
        )
      )
      .map((department) => ({
        id: `department-${department.id}`,
        type: 'department',
        label: department.name,
        detail: `${department.hospitalName} · Tıbbi birim`,
        href: `/book/${department.hospitalId}/${slugifyPathSegment(
          department.name
        )}`,
      }))

    const doctorResults: SearchResult[] = doctors
      .filter((doctor) =>
        normalizeSearch(
          `${doctor.title} ${doctor.name} ${doctor.departmentName} ${doctor.hospitalName}`
        ).includes(normalizedQuery)
      )
      .map((doctor) => ({
        id: `doctor-${doctor.id}`,
        type: 'doctor',
        label: `${doctor.title} ${doctor.name}`,
        detail: `${doctor.departmentName} · ${doctor.hospitalName}`,
        href: `/book/${doctor.hospitalId}/${slugifyPathSegment(
          doctor.departmentName
        )}/${doctor.id}`,
      }))

    return [...departmentResults, ...doctorResults].slice(0, 8)
  }, [departments, doctors, query])

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center">
      <h1 className="mt-3 text-center text-4xl font-semibold tracking-normal text-[#1a2130] sm:mt-8 sm:text-6xl">
        Hastane Randevu
      </h1>

      <div className="mt-8 grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2">
        <TabButton
          isActive={activeTab === 'appointment'}
          iconSrc="/e-randevu.png"
          onClick={() => setActiveTab('appointment')}
        >
          E-Randevu
        </TabButton>
        <TabButton
          isActive={activeTab === 'myAppointments'}
          iconSrc="/randevularım.png"
          onClick={() => setActiveTab('myAppointments')}
        >
          Randevularım
        </TabButton>
      </div>

      {activeTab === 'appointment' ? (
        <AppointmentTab
          hospitals={hospitals}
          selectedHospital={selectedHospital}
          selectedHospitalId={selectedHospitalId}
          filteredDepartments={filteredDepartments}
          openPanel={openPanel}
          query={query}
          searchResults={searchResults}
          onQueryChange={setQuery}
          onOpenPanelChange={setOpenPanel}
          onHospitalSelect={setSelectedHospitalId}
        />
      ) : (
        <MyAppointmentsTab />
      )}
    </section>
  )
}

function TabButton({
  isActive,
  iconSrc,
  onClick,
  children,
}: {
  isActive: boolean
  iconSrc: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-16 items-center justify-center gap-3 rounded-[2rem] border px-5 text-xl font-semibold transition ${
        isActive
          ? 'border-[#cbd8ea] bg-white text-[#071536] shadow-sm'
          : 'border-[#cbd8ea] bg-[#dfe7f4] text-[#071536] hover:bg-white/80'
      }`}
    >
      <Image
        src={iconSrc}
        alt=""
        width={36}
        height={36}
        className="h-9 w-9 shrink-0 object-contain"
      />
      {children}
    </button>
  )
}

interface AppointmentTabProps {
  hospitals: HospitalOption[]
  selectedHospital: HospitalOption | undefined
  selectedHospitalId: string
  filteredDepartments: DepartmentOption[]
  openPanel: SelectPanel
  query: string
  searchResults: SearchResult[]
  onQueryChange: (value: string) => void
  onOpenPanelChange: (panel: SelectPanel) => void
  onHospitalSelect: (hospitalId: string) => void
}

function AppointmentTab({
  hospitals,
  selectedHospital,
  selectedHospitalId,
  filteredDepartments,
  openPanel,
  query,
  searchResults,
  onQueryChange,
  onOpenPanelChange,
  onHospitalSelect,
}: AppointmentTabProps) {
  return (
    <div className="w-full">
      <StepProgress />

      <div className="mx-auto mt-10 w-full max-w-5xl">
        <div className="relative">
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="En az 3 karakter olacak şekilde yazmaya başlayın..."
            className="h-24 w-full rounded-3xl border-2 border-[#cbd8ea] bg-white px-8 pr-24 text-xl font-semibold text-[#102040] outline-none transition placeholder:text-[#17264a] focus:border-red-500"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-7 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full text-red-600"
          >
            <SearchIcon />
          </span>
        </div>

        {query.trim().length >= 3 ? (
          <div className="mt-4 rounded-2xl border border-[#cbd8ea] bg-white p-3 shadow-sm">
            {searchResults.length > 0 ? (
              <div className="grid gap-2">
                {searchResults.map((result) => (
                  <Link
                    key={result.id}
                    href={result.href}
                    className="flex items-center justify-between rounded-xl px-4 py-3 transition hover:bg-[#f1f6ff]"
                  >
                    <span>
                      <span className="block text-base font-semibold text-[#0d1b3d]">
                        {result.label}
                      </span>
                      <span className="mt-1 block text-sm text-[#52617a]">
                        {result.detail}
                      </span>
                    </span>
                    <span className="rounded-full bg-[#edf4ff] px-3 py-1 text-sm font-semibold text-[#30476f]">
                      {result.type === 'doctor' ? 'Doktor' : 'Birim'}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="px-4 py-3 text-sm font-medium text-[#52617a]">
                Eşleşen doktor veya tıbbi birim bulunamadı.
              </p>
            )}
          </div>
        ) : null}

        <div className="my-8 text-center text-2xl font-medium text-[#111827]">
          veya
        </div>

        <SelectionBlock
          title={selectedHospital?.name ?? 'Hastane Seçin'}
          isOpen={openPanel === 'hospital'}
          onToggle={() =>
            onOpenPanelChange(openPanel === 'hospital' ? null : 'hospital')
          }
        >
          {hospitals.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {hospitals.map((hospital) => (
                <HospitalCard
                  key={hospital.id}
                  hospital={hospital}
                  isSelected={hospital.id === selectedHospitalId}
                  onSelect={(hospitalId) => {
                    onHospitalSelect(hospitalId)
                    onOpenPanelChange('department')
                  }}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm font-medium text-[#52617a]">
              Aktif hastane bulunamadı.
            </p>
          )}
        </SelectionBlock>

        <SelectionBlock
          title="Tıbbi Birim Seçin"
          isOpen={openPanel === 'department'}
          onToggle={() =>
            onOpenPanelChange(openPanel === 'department' ? null : 'department')
          }
        >
          {selectedHospitalId ? (
            filteredDepartments.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {filteredDepartments.map((department) => (
                  <DepartmentCard key={department.id} department={department} />
                ))}
              </div>
            ) : (
              <p className="text-sm font-medium text-[#52617a]">
                Bu hastane için aktif tıbbi birim bulunamadı.
              </p>
            )
          ) : (
            <p className="text-sm font-medium text-[#52617a]">
              Önce hastane seçin.
            </p>
          )}
        </SelectionBlock>
      </div>
    </div>
  )
}

function MyAppointmentsTab() {
  const [phone, setPhone] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [isOtpRequested, setIsOtpRequested] = useState(false)
  const [isVerified, setIsVerified] = useState(false)

  const digitsOnlyPhone = phone.replace(/\D/g, '')
  const canRequestOtp = digitsOnlyPhone.length >= 10
  const canVerifyOtp = otpCode.trim().length >= 4

  function handlePhoneChange(value: string) {
    setPhone(value)
    setOtpCode('')
    setIsOtpRequested(false)
    setIsVerified(false)
  }

  function handleRequestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canRequestOtp) return

    setIsOtpRequested(true)
    setIsVerified(false)
  }

  function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canVerifyOtp) return

    setIsVerified(true)
  }

  return (
    <div className="mx-auto mt-10 w-full max-w-5xl">
      <div className="rounded-3xl border-2 border-[#cbd8ea] bg-white p-5 shadow-sm sm:p-7">
        <form
          onSubmit={handleRequestOtp}
          className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end"
        >
          <label className="block">
            <span className="mb-2 block text-base font-semibold text-[#0d1b3d]">
              Telefon Numaranız
            </span>
            <input
              type="tel"
              value={phone}
              onChange={(event) => handlePhoneChange(event.target.value)}
              placeholder="05XXXXXXXXX"
              className="h-14 w-full rounded-2xl border border-[#cbd8ea] px-4 text-lg font-semibold text-[#102040] outline-none transition placeholder:text-[#8a98ad] focus:border-red-500"
            />
          </label>
          <button
            type="submit"
            disabled={!canRequestOtp}
            className="h-14 rounded-2xl bg-red-600 px-8 text-base font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-[#c3ccdc]"
          >
            Sorgula
          </button>
        </form>

        {isOtpRequested && !isVerified ? (
          <form
            onSubmit={handleVerifyOtp}
            className="mt-5 grid gap-4 border-t border-[#d7e0ef] pt-5 md:grid-cols-[1fr_auto] md:items-end"
          >
            <label className="block">
              <span className="mb-2 block text-base font-semibold text-[#0d1b3d]">
                Doğrulama Kodu
              </span>
              <input
                inputMode="numeric"
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value)}
                placeholder="6 haneli kod"
                className="h-14 w-full rounded-2xl border border-[#cbd8ea] px-4 text-lg font-semibold text-[#102040] outline-none transition placeholder:text-[#8a98ad] focus:border-red-500"
              />
            </label>
            <button
              type="submit"
              disabled={!canVerifyOtp}
              className="h-14 rounded-2xl bg-[#111827] px-8 text-base font-semibold text-white transition hover:bg-[#253044] disabled:cursor-not-allowed disabled:bg-[#c3ccdc]"
            >
              Onayla
            </button>
          </form>
        ) : null}
      </div>

      {isVerified ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <AppointmentSummary title="Güncel Randevular" />
          <AppointmentSummary title="Geçmiş Randevular" />
        </div>
      ) : null}
    </div>
  )
}

function AppointmentSummary({ title }: { title: string }) {
  return (
    <section className="rounded-3xl border border-[#cbd8ea] bg-white p-6">
      <h2 className="text-xl font-semibold text-[#0d1b3d]">{title}</h2>
      <div className="mt-5 rounded-2xl bg-[#f5f8fe] px-5 py-6 text-sm font-medium text-[#52617a]">
        Randevu bulunamadı.
      </div>
    </section>
  )
}

function StepProgress() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto mt-8 flex w-full max-w-[14rem] justify-center gap-4 sm:mt-10"
    >
      <span className="h-3 w-16 rounded-full bg-red-600 shadow-sm" />
      <span className="h-3 w-16 rounded-full bg-[#d5dce8]" />
      <span className="h-3 w-16 rounded-full bg-[#d5dce8]" />
    </div>
  )
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className="h-10 w-10"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="21" cy="21" r="12" stroke="currentColor" strokeWidth="4" />
      <path
        d="M31 31L41 41"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="4"
      />
    </svg>
  )
}

function SelectionBlock({
  title,
  isOpen,
  onToggle,
  children,
}: {
  title: string
  isOpen: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <div className="mb-4 overflow-hidden rounded-3xl border border-[#6f86bd] bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex min-h-24 w-full items-center justify-between px-8 text-left text-2xl font-bold text-[#0d1b3d] transition hover:bg-[#f7faff]"
      >
        <span>{title}</span>
        <span
          aria-hidden="true"
          className={`h-4 w-4 rotate-45 border-b-2 border-r-2 border-[#111827] transition ${
            isOpen ? 'rotate-[225deg]' : ''
          }`}
        />
      </button>
      {isOpen ? (
        <div className="border-t border-[#d7e0ef] p-5">{children}</div>
      ) : null}
    </div>
  )
}
