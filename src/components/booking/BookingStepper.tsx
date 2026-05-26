interface BookingStepperProps {
  currentStep: number
}

const BOOKING_STEPS = [
  'Telefon Doğrulama',
  'Hasta Bilgileri',
  'Randevu Onayı',
]

export function BookingStepper({ currentStep }: BookingStepperProps) {
  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-3" aria-label="Randevu adımları">
      {BOOKING_STEPS.map((step, index) => {
        const stepNumber = index + 1
        const isActive = stepNumber === currentStep
        const isDone = stepNumber < currentStep

        return (
          <div
            key={step}
            className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
              isActive || isDone
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-[#d7e0ef] bg-[#f5f8fe] text-[#52617a]'
            }`}
          >
            <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs">
              {stepNumber}
            </span>
            {step}
          </div>
        )
      })}
    </div>
  )
}
