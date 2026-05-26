import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'

export class AdminMutationError extends Error {
  constructor(
    message: string,
    public readonly status = 400
  ) {
    super(message)
  }
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
}

function normalizeOptionalText(value: unknown) {
  const text = normalizeText(value)
  return text.length > 0 ? text : null
}

function requireText(
  value: unknown,
  fieldName: string,
  minLength: number,
  maxLength: number
) {
  const text = normalizeText(value)

  if (text.length < minLength || text.length > maxLength) {
    throw new AdminMutationError(`${fieldName} geçersiz`)
  }

  return text
}

function requireId(value: unknown, fieldName: string) {
  const id = normalizeText(value)

  if (!id) {
    throw new AdminMutationError(`${fieldName} gereklidir`)
  }

  return id
}

function optionalText(value: unknown, fieldName: string, maxLength: number) {
  const text = normalizeOptionalText(value)

  if (text && text.length > maxLength) {
    throw new AdminMutationError(`${fieldName} çok uzun`)
  }

  return text
}

function mapPrismaError(error: unknown, duplicateMessage: string): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      throw new AdminMutationError(duplicateMessage, 409)
    }

    if (error.code === 'P2025') {
      throw new AdminMutationError('Kayıt bulunamadı', 404)
    }
  }

  throw error
}

export async function createHospital(input: Record<string, unknown>) {
  const name = requireText(input.name, 'Hastane adı', 2, 120)
  const address = optionalText(input.address, 'Adres', 200)
  const phone = optionalText(input.phone, 'Telefon', 30)

  try {
    return await prisma.hospital.create({
      data: { name, address, phone },
      select: { id: true, name: true, address: true, phone: true, isActive: true },
    })
  } catch (error) {
    mapPrismaError(error, 'Bu hastane zaten var')
  }
}

export async function setHospitalActive(input: Record<string, unknown>) {
  const id = requireId(input.id, 'Hastane')
  const isActive = input.isActive === true || input.isActive === 'true'

  try {
    return await prisma.hospital.update({
      where: { id },
      data: { isActive },
      select: { id: true, isActive: true },
    })
  } catch (error) {
    mapPrismaError(error, 'Bu hastane zaten var')
  }
}

export async function createDepartment(input: Record<string, unknown>) {
  const hospitalId = requireId(input.hospitalId, 'Hastane')
  const name = requireText(input.name, 'Tıbbi birim adı', 2, 120)
  const icon = requireText(input.icon, 'Simge', 1, 8)

  const hospital = await prisma.hospital.findUnique({
    where: { id: hospitalId },
    select: { id: true },
  })

  if (!hospital) {
    throw new AdminMutationError('Hastane bulunamadı', 404)
  }

  try {
    return await prisma.department.create({
      data: { hospitalId, name, icon },
      select: { id: true, hospitalId: true, name: true, icon: true, isActive: true },
    })
  } catch (error) {
    mapPrismaError(error, 'Bu hastanede bu tıbbi birim zaten var')
  }
}

export async function setDepartmentActive(input: Record<string, unknown>) {
  const id = requireId(input.id, 'Tıbbi birim')
  const isActive = input.isActive === true || input.isActive === 'true'

  try {
    return await prisma.department.update({
      where: { id },
      data: { isActive },
      select: { id: true, isActive: true },
    })
  } catch (error) {
    mapPrismaError(error, 'Bu tıbbi birim zaten var')
  }
}

export async function createDoctor(input: Record<string, unknown>) {
  const departmentId = requireId(input.departmentId, 'Tıbbi birim')
  const title = requireText(input.title, 'Unvan', 2, 50)
  const name = requireText(input.name, 'Doktor adı', 2, 120)

  const department = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { id: true },
  })

  if (!department) {
    throw new AdminMutationError('Tıbbi birim bulunamadı', 404)
  }

  return prisma.doctor.create({
    data: { departmentId, title, name },
    select: { id: true, departmentId: true, title: true, name: true, isActive: true },
  })
}

export async function setDoctorActive(input: Record<string, unknown>) {
  const id = requireId(input.id, 'Doktor')
  const isActive = input.isActive === true || input.isActive === 'true'

  try {
    return await prisma.doctor.update({
      where: { id },
      data: { isActive },
      select: { id: true, isActive: true },
    })
  } catch (error) {
    mapPrismaError(error, 'Bu doktor zaten var')
  }
}
