import { AdminMutationError } from '@/lib/admin-management'
import { auth } from '@/lib/auth'
import { setTimeSlotActive } from '@/lib/working-hours'

interface SlotPatchRequestBody {
  isActive?: unknown
}

export async function PATCH(
  request: Request,
  context: RouteContext<'/api/slots/[id]'>
) {
  const session = await auth()

  if (!session?.user) {
    return Response.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const { id } = await context.params
  let body: SlotPatchRequestBody

  try {
    body = (await request.json()) as SlotPatchRequestBody
  } catch {
    return Response.json(
      { success: false, error: 'Geçersiz istek gövdesi' },
      { status: 400 }
    )
  }

  try {
    const slot = await setTimeSlotActive({
      id,
      isActive: body.isActive,
    })

    return Response.json({ success: true, data: slot })
  } catch (error) {
    if (error instanceof AdminMutationError) {
      return Response.json(
        { success: false, error: error.message },
        { status: error.status }
      )
    }

    return Response.json(
      { success: false, error: 'Randevu saati güncellenemedi' },
      { status: 500 }
    )
  }
}
