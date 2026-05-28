import {
  AdminMutationError,
  createDepartment,
} from '@/lib/admin-management'
import { resolveDepartmentIcon } from '@/lib/medical-departments'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/require-role'

interface DepartmentCreateRequestBody {
  hospitalId?: unknown
  departmentKey?: unknown
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
          select: { panelUsers: { where: { role: 'DOCTOR' } } },
        },
      },
    })

    const data = departments.map((department) => ({
      ...department,
      icon: resolveDepartmentIcon(department.name, department.icon),
      _count: { doctors: department._count.panelUsers },
    }))

    return Response.json({ success: true, data })
  } catch {
    return Response.json(
      { success: false, error: 'Tıbbi birimler yüklenemedi' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const user = await requireRole(['ADMIN'])

  if (!user) {
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
