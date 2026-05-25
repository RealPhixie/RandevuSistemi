import { prisma } from '@/lib/prisma'

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
