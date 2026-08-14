export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  contactNo?: string;
  userType?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Address {
  id: number;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  addressType?: string;
  addressableType?: string;
  addressableId?: number;
}

export interface Document {
  id: number;
  name?: string;
  path?: string;
  mimeType?: string;
  size?: number;
  disk?: string;
}

export interface VehicleType {
  id: number;
  name: string;
}

export interface Vehicle {
  id: number;
  name: string;
  registrationNo?: string;
  registrationDate?: string;
  registrationValidDate?: string;
  chassisNo?: string;
  engineNo?: string;
  color?: string;
  capacity?: number;
  insuranceId?: string;
  vehicleTypeId?: number;
  vehicleType?: VehicleType;
}

export interface Slot {
  id: number;
  name: string;
  slotType?: string;
  vehicleId?: number;
  vehicle?: Vehicle;
  teamId?: string;
  capacity?: number;
  startTime?: string;
  endTime?: string;
  isActive?: boolean;
}

export interface School {
  id: number;
  name: string;
  code?: string;
  addressId?: number;
  address?: Address;
  contactNo?: string;
  email?: string;
  website?: string;
  logoImageId?: number;
  logoImage?: Document;
}

export interface Organization {
  id: number;
  name: string;
  code?: string;
  addressId?: number;
  address?: Address;
  contactNo?: string;
  email?: string;
  website?: string;
}

export interface FiscalYear {
  id: number;
  name: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  isActive?: boolean;
  previousFiscalYearId?: number;
  previousFiscalYear?: FiscalYear;
  nextFiscalYearId?: number;
  nextFiscalYear?: FiscalYear;
}

export interface IncomeGroup {
  id: number;
  name: string;
}

export interface FeeHead {
  id: number;
  name: string;
  incomeGroupId?: number;
  incomeGroup?: IncomeGroup;
}

export interface RiderSnapshot {
  id: number;
  riderId?: number;
  name?: string;
  code?: string;
  riderType?: string;
  profileInfo?: Record<string, any>;
  academicInfo?: Record<string, any>;
  email?: string;
  contactNo?: string;
  status?: string;
  emergencyContactNo?: string;
  guardianInfo?: Record<string, any>;
  joinDate?: string;
  dissociateDate?: string;
  isActive?: boolean;
  vehicleId?: number;
  schoolId?: number;
  schoolTime?: string;
  standard?: string;
  section?: string;
  rollNo?: string;
  monthlyCharge?: number;
  school?: School;
  vehicle?: Vehicle;
}

export interface Rider {
  id: number;
  name: string;
  code?: string;
  riderSnapshotId?: number;
  riderSnapshot?: RiderSnapshot;
  riderType?: string;
  profileDocumentId?: number;
  profileDocument?: Document;
  profileInfo?: Record<string, any>;
  academicInfo?: Record<string, any>;
  email?: string;
  contactNo?: string;
  addressId?: number;
  address?: Address;
  status?: string;
  emergencyContactNo?: string;
  guardianInfo?: Record<string, any>;
  joinDate?: string;
  dissociateDate?: string;
  isActive?: boolean;
  isFree?: boolean;
  vehicleId?: number;
  vehicle?: Vehicle;
  schoolId?: number;
  school?: School;
  schoolTime?: string;
  standard?: string;
  section?: string;
  rollNo?: string;
  pickupSlotId?: number;
  pickupSlot?: Slot;
  dropSlotId?: number;
  dropSlot?: Slot;
  pickupPointId?: string;
  dropPointId?: string;
  pickupTime?: string;
  dropTime?: string;
  journeyTypeId?: string;
  monthlyCharge?: number;
  isIdcardPrintable?: boolean;
  idcardPrintCount?: number;
  isReleaseIdcardPrintable?: boolean;
  releaseIdcardPrintCount?: number;
  nextFeesDate?: string;
  fees?: Fee[];
}

export interface FeeItemMonth {
  id: number;
  feeId?: number;
  riderId?: number;
  feeItemId?: number;
  monthId?: number;
  year?: number;
  amount: number;
  isWaived: boolean;
  month?: Month;
  feeItem?: FeeItem;
}

export interface FeeItem {
  id: number;
  feeId: number;
  feeHeadId?: number;
  feeHead?: FeeHead;
  quantity: number;
  amount: number;
  totalAmount: number;
  feeItemMonths?: FeeItemMonth[];
}

export interface Fee {
  id: number;
  feeNo?: string;
  feeDate?: string;
  riderId?: number;
  rider?: Rider;
  riderSnapshotId?: number;
  riderSnapshot?: RiderSnapshot;
  dropSlotId?: number;
  dropSlot?: Slot;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentMode?: string;
  isDeleted?: boolean;
  fiscalYearId?: number;
  fiscalYear?: FiscalYear;
  note?: string;
  feeItems?: FeeItem[];
}

export interface ExpenseGroup {
  id: number;
  name: string;
}

export interface ExpenseHead {
  id: number;
  name: string;
  expenseGroupId?: number;
  expenseGroup?: ExpenseGroup;
}

export interface Expense {
  id: number;
  expenseNo?: string;
  voucherNo?: string;
  expenseDate?: string;
  fiscalYearId?: number;
  fiscalYear?: FiscalYear;
  totalAmount: number;
  paymentMode?: string;
  paymentStatus?: string;
  status?: string;
  isDeleted?: boolean;
  note?: string;
  documentId?: number;
  document?: Document;
  expenseItems?: ExpenseItem[];
}

export interface ExpenseItem {
  id: number;
  expenseId: number;
  expenseGroupId?: number;
  expenseGroup?: ExpenseGroup;
  expenseHeadId?: number;
  expenseHead?: ExpenseHead;
  description?: string;
  amount: number;
  quantity: number;
  totalAmount: number;
}

export interface UserInitialValue {
  id: number;
  userId: number;
  key: string;
  value: string;
  user?: User;
}

export interface Month {
  id: number;
  name: string;
  shortName?: string;
  number: number;
  noOfDays?: number;
  isFebruary?: boolean;
}

export interface AuthResponse {
  status: string;
  message: string;
  user: User;
  data: {
    token: string;
    refreshToken: string;
    type: string;
  };
}

export interface ApiResponse<T> {
  data: T;
  status?: boolean;
  message?: string;
}

export interface PaginationLinks {
  first?: string;
  last?: string;
  prev?: string | null;
  next?: string | null;
}

export interface PaginationMeta {
  current_page: number;
  from: number | null;
  last_page: number;
  links: { url: string | null; label: string; active: boolean }[];
  path: string;
  per_page: number;
  to: number | null;
  total: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  links?: PaginationLinks;
  meta?: PaginationMeta;
  pagination?: PaginationMeta;
}
