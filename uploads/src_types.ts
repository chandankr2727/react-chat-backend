export enum UserRole {
  STUDENT = 'STUDENT',
  OWNER = 'OWNER',
}

export enum BookingStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface PG {
  id: string;
  name: string;
  address: string;
  city: string;
  state: stringstring;
  price: number;
  rating: number;
  amenities: string[];
  rules: string[];
  description: string;
  ownerId: string;
  roomTypes: RoomType[];
  reviews: Review[];
}

export interface RoomType {
  id: string;
  type: string;
  price: number;
  available: number;
  totalRooms: number;
  amenities: string[];
}

export interface Review {
  id: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Booking {
  id: string;
  pgId: string;
  userId: string;
  roomType: string;
  moveInDate: string;
  status: BookingStatus;
  createdAt: string;
}

