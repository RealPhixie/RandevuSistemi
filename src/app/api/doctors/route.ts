import { prisma } from '@/lib/prisma'
import type { DoctorOption } from '@/types'

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
