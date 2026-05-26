import {
  isValidTckn,
  isValidTurkishMobilePhone,
  normalizePersonName,
  normalizePhone,
  parseBirthDate,
} from '@/lib/patient-validation'
import {
  findActivePhoneVerification,
  normalizeVerificationId,
} from '@/lib/phone-verification'
import { prisma } from '@/lib/prisma'

interface PatientRegisterRequestBody {
  phone?: unknown
  phoneVerificationId?: unknown
  tckn?: unknown
  firstName?: unknown
  lastName?: unknown
  birthDate?: unknown
}

export async function POST(request: Request) {
  let body: PatientRegisterRequestBody

  try {
    body = (await request.json()) as PatientRegisterRequestBody
  } catch {
    return Response.json(
      { success: false, error: 'Geçersiz istek gövdesi' },
      { status: 400 }
    )
  }

  const phone = normalizePhone(body.phone)
  const phoneVerificationId = normalizeVerificationId(body.phoneVerificationId)
  const tckn = typeof body.tckn === 'string' ? body.tckn.trim() : ''
  const firstName = normalizePersonName(body.firstName)
  const lastName = normalizePersonName(body.lastName)
  const birthDate = parseBirthDate(body.birthDate)

  if (!isValidTurkishMobilePhone(phone)) {
    return Response.json(
      { success: false, error: 'Telefon numarası geçersiz' },
      { status: 400 }
    )
  }

  if (!isValidTckn(tckn)) {
    return Response.json(
      { success: false, error: 'TCKN bilgisi geçersiz' },
      { status: 400 }
    )
  }

  if (firstName.length < 2 || firstName.length > 60) {
    return Response.json(
      { success: false, error: 'Ad bilgisi geçersiz' },
      { status: 400 }
    )
  }

  if (lastName.length < 2 || lastName.length > 60) {
    return Response.json(
      { success: false, error: 'Soyad bilgisi geçersiz' },
      { status: 400 }
    )
  }

  if (!birthDate) {
    return Response.json(
      { success: false, error: 'Doğum tarihi geçersiz' },
      { status: 400 }
    )
  }

  try {
    const verification = await findActivePhoneVerification(
      phone,
      phoneVerificationId
    )

    if (!verification) {
      return Response.json(
        { success: false, error: 'Telefon doğrulaması geçersiz' },
        { status: 401 }
      )
    }

    const existingPatient = await prisma.patient.findUnique({
      where: { phone },
      select: { id: true },
    })

    if (existingPatient) {
      return Response.json({
        success: true,
        data: { patientId: existingPatient.id },
      })
    }

    const existingTckn = await prisma.patient.findUnique({
      where: { tckn },
      select: { id: true },
    })

    if (existingTckn) {
      return Response.json(
        { success: false, error: 'Bu TCKN ile kayıtlı hasta var' },
        { status: 409 }
      )
    }

    const patient = await prisma.patient.create({
      data: {
        phone,
        tckn,
        firstName,
        lastName,
        birthDate,
      },
      select: { id: true },
    })

    return Response.json({ success: true, data: { patientId: patient.id } })
  } catch {
    return Response.json(
      { success: false, error: 'Hasta kaydı oluşturulamadı' },
      { status: 500 }
    )
  }
}
