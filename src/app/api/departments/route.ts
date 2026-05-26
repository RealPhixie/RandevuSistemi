import {
  AdminMutationError,
  createDepartment,
} from '@/lib/admin-management'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface DepartmentCreateRequestBody {
  hospitalId?: unknown
  name?: unknown
  icon?: unknown
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const hospitalId = searchParams.get('hospitalId')

  if (hospitalId !== null && hospitalId.trim().length === 0) {
    return Response.json(
      { success: false, error: 'Hastane bilgisi geçersiz' },
      { status: 400 }
    )
  }

  try {
    const departments = await prisma.department.findMany({
      where: {
        isActive: true,
        hospital: { isActive: true },
        ...(hospitalId ? { hospitalId } : {}),
      },
      orderBy: [{ hospital: { name: 'asc' } }, { name: 'asc' }],
      include: {
        hospital: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: { doctors: true },
        },
      },
    })

    return Response.json({ success: true, data: departments })
  } catch {
    return Response.json(
      { success: false, error: 'Tıbbi birimler yüklenemedi' },
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

  let body: DepartmentCreateRequestBody

  try {
    body = (await request.json()) as DepartmentCreateRequestBody
  } catch {
    return Response.json(
      { success: false, error: 'Geçersiz istek gövdesi' },
      { status: 400 }
    )
  }

  try {
    const department = await createDepartment({ ...body })
    return Response.json({ success: true, data: department }, { status: 201 })
  } catch (error) {
    if (error instanceof AdminMutationError) {
      return Response.json(
        { success: false, error: error.message },
        { status: error.status }
      )
    }

    return Response.json(
      { success: false, error: 'Tıbbi birim oluşturulamadı' },
      { status: 500 }
    )
  }
}
