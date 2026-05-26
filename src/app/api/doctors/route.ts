import {
  AdminMutationError,
  createDoctor,
} from '@/lib/admin-management'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { DoctorOption } from '@/types'

interface DoctorCreateRequestBody {
  departmentId?: unknown
  title?: unknown
  name?: unknown
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const departmentId = searchParams.get('departmentId')
  const hospitalId = searchParams.get('hospitalId')

  if (departmentId !== null && departmentId.trim().length === 0) {
    return Response.json(
      { success: false, error: 'Tıbbi birim bilgisi geçersiz' },
      { status: 400 }
    )
  }

  if (hospitalId !== null && hospitalId.trim().length === 0) {
    return Response.json(
      { success: false, error: 'Hastane bilgisi geçersiz' },
      { status: 400 }
    )
  }

  try {
    const doctors = await prisma.doctor.findMany({
      where: {
        isActive: true,
        ...(departmentId ? { departmentId } : {}),
        department: {
          isActive: true,
          ...(hospitalId ? { hospitalId } : {}),
          hospital: { isActive: true },
        },
      },
      orderBy: [
        { department: { hospital: { name: 'asc' } } },
        { department: { name: 'asc' } },
        { name: 'asc' },
      ],
      include: {
        department: {
          select: {
            id: true,
            name: true,
            hospital: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    const data: DoctorOption[] = doctors.map((doctor) => ({
      id: doctor.id,
      departmentId: doctor.department.id,
      departmentName: doctor.department.name,
      hospitalId: doctor.department.hospital.id,
      hospitalName: doctor.department.hospital.name,
      title: doctor.title,
      name: doctor.name,
    }))

    return Response.json({ success: true, data })
  } catch {
    return Response.json(
      { success: false, error: 'Doktorlar yüklenemedi' },
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

  let body: DoctorCreateRequestBody

  try {
    body = (await request.json()) as DoctorCreateRequestBody
  } catch {
    return Response.json(
      { success: false, error: 'Geçersiz istek gövdesi' },
      { status: 400 }
    )
  }

  try {
    const doctor = await createDoctor({ ...body })
    return Response.json({ success: true, data: doctor }, { status: 201 })
  } catch (error) {
    if (error instanceof AdminMutationError) {
      return Response.json(
        { success: false, error: error.message },
        { status: error.status }
      )
    }

    return Response.json(
      { success: false, error: 'Doktor oluşturulamadı' },
      { status: 500 }
    )
  }
}
