import {
  isValidTurkishMobilePhone,
  normalizePhone,
} from '@/lib/patient-validation'
import { prisma } from '@/lib/prisma'

interface OtpVerifyRequestBody {
  phone?: unknown
  code?: unknown
}

export async function POST(request: Request) {
  let body: OtpVerifyRequestBody

  try {
    body = (await request.json()) as OtpVerifyRequestBody
  } catch {
    return Response.json(
      { success: false, error: 'Geçersiz istek gövdesi' },
      { status: 400 }
    )
  }

  const phone = normalizePhone(body.phone)
  const code = typeof body.code === 'string' ? body.code.trim() : ''

  if (!isValidTurkishMobilePhone(phone)) {
    return Response.json(
      { success: false, error: 'Telefon numarası geçersiz' },
      { status: 400 }
    )
  }

  if (!/^\d{6}$/.test(code)) {
    return Response.json(
      { success: false, error: 'Doğrulama kodu geçersiz' },
      { status: 400 }
    )
  }

  try {
    const otp = await prisma.otpCode.findFirst({
      where: {
        phone,
        code,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!otp) {
      return Response.json(
        { success: false, error: 'Kod geçersiz veya süresi dolmuş' },
        { status: 400 }
      )
    }

    const [patient] = await prisma.$transaction([
      prisma.patient.findUnique({
        where: { phone },
        select: { id: true, firstName: true, lastName: true },
      }),
      prisma.otpCode.update({
        where: { id: otp.id },
        data: { used: true },
      }),
    ])

    return Response.json({
      success: true,
      data: {
        isExistingPatient: Boolean(patient),
        phoneVerificationId: otp.id,
        ...(patient
          ? {
              patientId: patient.id,
              patientName: `${patient.firstName} ${patient.lastName}`,
            }
          : {}),
      },
    })
  } catch {
    return Response.json(
      { success: false, error: 'Telefon doğrulanamadı' },
      { status: 500 }
    )
  }
}
