export type ShiftSlot = string;

export type AvailabilitySlot = {
  id: number;
  key: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  startTime: string | null;
  endTime: string | null;
  createdAt: string;
};

export type VolunteerGroupMember = {
  id: number;
  name: string;
};

export type Volunteer = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  isAdmin: boolean;
  hasPassword: boolean;
  createdAt: string;
  availability: ShiftSlot[];
  groupId: number | null;
  groupMembers: VolunteerGroupMember[];
};

export type Assignment = {
  id: number;
  shiftId: number;
  volunteerId: number;
  volunteer: {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    createdAt: string;
  };
  createdAt: string;
};

export type ShiftWithAssignments = {
  id: number;
  seasonId: number | null;
  date: string;
  slot: string;
  startTime: string | null;
  endTime: string | null;
  capacity: number;
  notes: string | null;
  createdAt: string;
  assignments: Assignment[];
};

export type Season = {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  shiftCount: number;
};

export type CurrentUser = {
  role: 'admin' | 'volunteer';
  username: string;
  volunteerId: number | null;
  volunteerName: string | null;
};

export type ShiftOfferResponse = {
  id: number;
  offerId: number;
  responderId: number;
  type: 'takeover' | 'swap';
  swapShiftId: number | null;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  responder: { name: string };
  swapShift: { date: string; slot: string } | null;
};

export type ShiftOffer = {
  id: number;
  shiftId: number;
  volunteerId: number;
  status: 'open' | 'taken' | 'cancelled';
  createdAt: string;
  shift: { date: string; slot: string; startTime: string | null; endTime: string | null };
  volunteer: { name: string };
  responses: ShiftOfferResponse[];
};
