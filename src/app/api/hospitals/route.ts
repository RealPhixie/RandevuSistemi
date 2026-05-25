import { prisma } from '@/lib/prisma'

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
