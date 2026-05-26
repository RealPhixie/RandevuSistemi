import { prisma } from '@/lib/prisma'

interface OtpSendRequestBody {
  phone?: unknown
}

function createOtpCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: Request) {
  let body: OtpSendRequestBody

  try {
    body = (await request.json()) as OtpSendRequestBody
  } catch {
    return Response.json(
      { success: false, error: 'Geçersiz istek gövdesi' },
      { status: 400 }
    )
  }

  const phone = typeof body.phone === 'string' ? body.phone.trim() : ''

  if (!/^05\d{9}$/.test(phone)) {
    return Response.json(
      { success: false, error: 'Telefon numarası geçersiz' },
      { status: 400 }
    )
  }

  const code = createOtpCode()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

  try {
    await prisma.$transaction([
      prisma.otpCode.deleteMany({
        where: { phone },
      }),
      prisma.otpCode.create({
        data: {
          phone,
          code,
          expiresAt,
        },
      }),
    ])

    return Response.json({
      success: true,
      data: { expiresAt: expiresAt.toISOString() },
      ...(process.env.NODE_ENV !== 'production' ? { devCode: code } : {}),
    })
  } catch {
    return Response.json(
      { success: false, error: 'Doğrulama kodu oluşturulamadı' },
      { status: 500 }
    )
  }
}
