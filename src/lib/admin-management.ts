import { Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'

import { findMedicalDepartmentByKey } from '@/lib/medical-departments'
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

function requirePassword(value: unknown) {
  const password = typeof value === 'string' ? value : ''

  if (password.length < 8 || password.length > 128) {
    throw new AdminMutationError('Şifre en az 8 karakter olmalıdır')
  }

  return password
}

function normalizeUsername(value: string) {
  const username = value
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/\s+/g, '_')
    .replace(/[^\p{L}\p{N}_]/gu, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')

  return username
}

function requireUsername(value: unknown) {
  const rawUsername = normalizeText(value)
  const username = normalizeUsername(rawUsername)

  if (username.length < 3 || username.length > 60) {
    throw new AdminMutationError('Kullanıcı adı geçersiz')
  }

  return username
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

async function deleteDoctorPanelUsers(
  tx: Prisma.TransactionClient,
  doctorIds: string[]
) {
  if (doctorIds.length === 0) return

  const timeSlots = await tx.timeSlot.findMany({
    where: { doctorId: { in: doctorIds } },
    select: { id: true },
  })
  const timeSlotIds = timeSlots.map((timeSlot) => timeSlot.id)

  if (timeSlotIds.length > 0) {
    await tx.appointment.deleteMany({
      where: { timeSlotId: { in: timeSlotIds } },
    })
  }

  await tx.timeSlot.deleteMany({
    where: { doctorId: { in: doctorIds } },
  })
  await tx.doctorNote.deleteMany({
    where: { doctorId: { in: doctorIds } },
  })
  await tx.appointment.updateMany({
    where: { confirmedById: { in: doctorIds } },
    data: { confirmedById: null },
  })
  await tx.panelUser.deleteMany({
    where: { id: { in: doctorIds }, role: 'DOCTOR' },
  })
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

export async function deleteHospital(input: Record<string, unknown>) {
  const id = requireId(input.id, 'Hastane')

  try {
    return await prisma.$transaction(async (tx) => {
      const hospital = await tx.hospital.findUnique({
        where: { id },
        select: {
          departments: {
            select: {
              id: true,
              panelUsers: {
                where: { role: 'DOCTOR' },
                select: { id: true },
              },
            },
          },
        },
      })

      if (!hospital) {
        throw new AdminMutationError('Hastane bulunamadı', 404)
      }

      const departmentIds = hospital.departments.map(
        (department) => department.id
      )
      const doctorIds = hospital.departments.flatMap((department) =>
        department.panelUsers.map((doctor) => doctor.id)
      )

      await deleteDoctorPanelUsers(tx, doctorIds)

      if (departmentIds.length > 0) {
        await tx.panelUser.updateMany({
          where: { departmentId: { in: departmentIds } },
          data: { departmentId: null },
        })
        await tx.department.deleteMany({
          where: { id: { in: departmentIds } },
        })
      }

      return await tx.hospital.delete({
        where: { id },
        select: { id: true },
      })
    })
  } catch (error) {
    mapPrismaError(error, 'Bu hastane zaten var')
  }
}

export async function createDepartment(input: Record<string, unknown>) {
  const hospitalId = requireId(input.hospitalId, 'Hastane')
  const selectedDepartment = findMedicalDepartmentByKey(input.departmentKey)

  if (!selectedDepartment) {
    throw new AdminMutationError('Tıbbi birim seçimi geçersiz')
  }

  const name = selectedDepartment.name
  const icon = selectedDepartment.key

  const hospital = await prisma.hospital.findUnique({
    where: { id: hospitalId },
    select: { id: true },
  })

  if (!hospital) {
    throw new AdminMutationError('Hastane bulunamadı', 404)
  }

  try {
    const existingDepartment = await prisma.department.findFirst({
      where: { hospitalId, name },
      select: { id: true },
    })

    if (existingDepartment) {
      return await prisma.department.update({
        where: { id: existingDepartment.id },
        data: { icon, isActive: true },
        select: {
          id: true,
          hospitalId: true,
          name: true,
          icon: true,
          isActive: true,
        },
      })
    }

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

export async function deleteDepartment(input: Record<string, unknown>) {
  const id = requireId(input.id, 'Tıbbi birim')

  try {
    return await prisma.$transaction(async (tx) => {
      const department = await tx.department.findUnique({
        where: { id },
        select: {
          panelUsers: {
            where: { role: 'DOCTOR' },
            select: { id: true },
          },
        },
      })

      if (!department) {
        throw new AdminMutationError('Tıbbi birim bulunamadı', 404)
      }

      const doctorIds = department.panelUsers.map((doctor) => doctor.id)

      await deleteDoctorPanelUsers(tx, doctorIds)
      await tx.panelUser.updateMany({
        where: { departmentId: id },
        data: { departmentId: null },
      })

      return await tx.department.delete({
        where: { id },
        select: { id: true },
      })
    })
  } catch (error) {
    mapPrismaError(error, 'Bu tıbbi birim zaten var')
  }
}

export async function createDoctor(input: Record<string, unknown>) {
  const departmentId = requireId(input.departmentId, 'Tıbbi birim')
  const title = requireText(input.title, 'Unvan', 2, 50)
  const name = requireText(input.name, 'Doktor adı', 2, 120)

  const username = requireUsername(input.username)
  const password = requirePassword(input.password)

  const department = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { id: true },
  })

  if (!department) {
    throw new AdminMutationError('Tıbbi birim bulunamadı', 404)
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  try {
    return await prisma.panelUser.create({
      data: {
        departmentId,
        name,
        password: hashedPassword,
        role: 'DOCTOR',
        title,
        username,
      },
      select: {
        id: true,
        departmentId: true,
        username: true,
        role: true,
        title: true,
        name: true,
        isActive: true,
      },
    })
  } catch (error) {
    mapPrismaError(error, 'Bu doktor kullanıcısı zaten var')
  }
}

export async function createSecretary(input: Record<string, unknown>) {
  const username = requireUsername(input.username)
  const password = requirePassword(input.password)
  const hashedPassword = await bcrypt.hash(password, 10)

  try {
    return await prisma.panelUser.create({
      data: {
        name: username,
        password: hashedPassword,
        role: 'SECRETARY',
        username,
      },
      select: {
        id: true,
        username: true,
        role: true,
        name: true,
        isActive: true,
      },
    })
  } catch (error) {
    mapPrismaError(error, 'Bu sekreter kullanıcısı zaten var')
  }
}

export async function deleteDoctor(input: Record<string, unknown>) {
  const id = requireId(input.id, 'Doktor')

  try {
    return await prisma.$transaction(async (tx) => {
      const doctor = await tx.panelUser.findFirst({
        where: { id, role: 'DOCTOR' },
        select: { id: true },
      })

      if (!doctor) {
        throw new AdminMutationError('Doktor bulunamadı', 404)
      }

      await deleteDoctorPanelUsers(tx, [id])

      return { id }
    })
  } catch (error) {
    mapPrismaError(error, 'Bu doktor zaten var')
  }
}

export async function setDoctorActive(input: Record<string, unknown>) {
  const id = requireId(input.id, 'Doktor')
  const isActive = input.isActive === true || input.isActive === 'true'

  const doctor = await prisma.panelUser.findFirst({
    where: { id, role: 'DOCTOR' },
    select: { id: true },
  })

  if (!doctor) {
    throw new AdminMutationError('Doktor bulunamadı', 404)
  }

  try {
    return await prisma.panelUser.update({
      where: { id },
      data: { isActive },
      select: { id: true, isActive: true },
    })
  } catch (error) {
    mapPrismaError(error, 'Bu doktor zaten var')
  }
}

export async function deleteSecretary(input: Record<string, unknown>) {
  const id = requireId(input.id, 'Sekreter')

  try {
    return await prisma.$transaction(async (tx) => {
      const secretary = await tx.panelUser.findFirst({
        where: { id, role: 'SECRETARY' },
        select: { id: true },
      })

      if (!secretary) {
        throw new AdminMutationError('Sekreter bulunamadı', 404)
      }

      await tx.appointment.updateMany({
        where: { confirmedById: id },
        data: { confirmedById: null },
      })

      return await tx.panelUser.delete({
        where: { id },
        select: { id: true },
      })
    })
  } catch (error) {
    mapPrismaError(error, 'Bu sekreter zaten var')
  }
}

export async function setSecretaryActive(input: Record<string, unknown>) {
  const id = requireId(input.id, 'Sekreter')
  const isActive = input.isActive === true || input.isActive === 'true'

  const secretary = await prisma.panelUser.findFirst({
    where: { id, role: 'SECRETARY' },
    select: { id: true },
  })

  if (!secretary) {
    throw new AdminMutationError('Sekreter bulunamadı', 404)
  }

  try {
    return await prisma.panelUser.update({
      where: { id },
      data: { isActive },
      select: { id: true, isActive: true },
    })
  } catch (error) {
    mapPrismaError(error, 'Bu sekreter zaten var')
  }
}
