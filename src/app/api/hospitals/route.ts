import {
  AdminMutationError,
  createHospital,
} from '@/lib/admin-management'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface HospitalCreateRequestBody {
  name?: unknown
  address?: unknown
  phone?: unknown
}

export async function GET() {
  try {
    const hospitals = await prisma.hospital.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { departments: true },
        },
      },
    })

    return Response.json({ success: true, data: hospitals })
  } catch {
    return Response.json(
      { success: false, error: 'Hastaneler yüklenemedi' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const session = await auth()

  if (!session?.user) {
    return Response.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  let body: HospitalCreateRequestBody

  try {
    body = (await request.json()) as HospitalCreateRequestBody
  } catch {
    return Response.json(
      { success: false, error: 'Geçersiz istek gövdesi' },
      { status: 400 }
    )
  }

  try {
    const hospital = await createHospital({ ...body })
    return Response.json({ success: true, data: hospital }, { status: 201 })
  } catch (error) {
    if (error instanceof AdminMutationError) {
      return Response.json(
        { success: false, error: error.message },
        { status: error.status }
      )
    }

    return Response.json(
      { success: false, error: 'Hastane oluşturulamadı' },
      { status: 500 }
    )
  }
}
