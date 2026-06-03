import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../lib/errors.js';
import { mapper } from '../../lib/mappers.js';
import { prisma } from '../../lib/prisma.js';
import { serializer } from '../../lib/serializers.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

export const roomRouter = Router();

roomRouter.use(requireAuth);

const roomBaseSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['classroom', 'lab', 'seminar_hall', 'auditorium']),
  capacity: z.coerce.number().int().positive(),
  floor: z.coerce.number().int(),
  building: z.string().min(1),
  amenities: z.array(z.string().min(1)),
  available: z.boolean(),
});

const roomSchema = roomBaseSchema.extend({
  amenities: z.array(z.string().min(1)).default([]),
  available: z.boolean().default(true),
});
const updateRoomSchema = roomBaseSchema.partial();

const generateRoomId = (name: string): string => {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 36) || 'room';
  return `${slug}-${Date.now().toString(36)}`;
};

roomRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    if (req.auth!.role === 'student') {
      res.json([]);
      return;
    }

    const rooms = await prisma.room.findMany({ orderBy: { name: 'asc' } });
    res.json(rooms.map((room) => serializer.room(room)));
  }),
);

roomRouter.post(
  '/',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const payload = roomSchema.parse(req.body);
    const duplicate = await prisma.room.findFirst({
      where: {
        name: { equals: payload.name.trim(), mode: 'insensitive' },
        building: { equals: payload.building.trim(), mode: 'insensitive' },
      },
    });

    if (duplicate) {
      throw new HttpError(409, 'A room with this number/name already exists in this building.');
    }

    const room = await prisma.room.create({
      data: {
        id: generateRoomId(payload.name),
        name: payload.name.trim(),
        type: mapper.roomTypeFromClient(payload.type),
        capacity: payload.capacity,
        floor: payload.floor,
        building: payload.building.trim(),
        amenities: payload.amenities.map((amenity) => amenity.trim()).filter(Boolean).join(','),
        available: payload.available,
      },
    });

    res.status(201).json(serializer.room(room));
  }),
);

roomRouter.patch(
  '/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const payload = updateRoomSchema.parse(req.body);
    const room = await prisma.room.findUnique({ where: { id } });

    if (!room) {
      throw new HttpError(404, 'Room not found');
    }

    if (payload.name || payload.building) {
      const nextName = payload.name?.trim() ?? room.name;
      const nextBuilding = payload.building?.trim() ?? room.building;
      const duplicate = await prisma.room.findFirst({
        where: {
          id: { not: id },
          name: { equals: nextName, mode: 'insensitive' },
          building: { equals: nextBuilding, mode: 'insensitive' },
        },
      });

      if (duplicate) {
        throw new HttpError(409, 'A room with this number/name already exists in this building.');
      }
    }

    const updated = await prisma.room.update({
      where: { id },
      data: {
        ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
        ...(payload.type !== undefined ? { type: mapper.roomTypeFromClient(payload.type) } : {}),
        ...(payload.capacity !== undefined ? { capacity: payload.capacity } : {}),
        ...(payload.floor !== undefined ? { floor: payload.floor } : {}),
        ...(payload.building !== undefined ? { building: payload.building.trim() } : {}),
        ...(payload.amenities !== undefined ? { amenities: payload.amenities.map((amenity) => amenity.trim()).filter(Boolean).join(',') } : {}),
        ...(payload.available !== undefined ? { available: payload.available } : {}),
      },
    });

    res.json(serializer.room(updated));
  }),
);
