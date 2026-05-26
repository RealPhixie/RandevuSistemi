import { AdminMutationError, setDoctorActive } from '@/lib/admin-management'
import { requireRole } from '@/lib/require-role'

interface DoctorPatchRequestBody {
  isActive?: unknown
}

export async function PATCH(
  request: Request,
  context: RouteContext<'/api/doctors/[id]'>
) {
  const user = await requireRole(['ADMIN'])

  if (!user) {
    return Response.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const { id } = await context.params
  let body: DoctorPatchRequestBody

  try {
    body = (await request.json()) as DoctorPatchRequestBody
  } catch {
    return Response.json(
      { success: false, error: 'Geçersiz istek gövdesi' },
      { status: 400 }
    )
  }

  try {
    const doctor = await setDoctorActive({
      id,
      isActive: body.isActive,
    })

    return Response.json({ success: true, data: doctor })
  } catch (error) {
    if (error instanceof AdminMutationError) {
      return Response.json(
        { success: false, error: error.message },
        { status: error.status }
      )
    }

    return Response.json(
      { success: false, error: 'Doktor güncellenemedi' },
      { status: 500 }
    )
  }
}
