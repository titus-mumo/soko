import { api } from "./api";
import type { UserProfile, Address } from "./types";

export interface UpdateProfilePayload {
  name?: string;
  email?: string;
  phone?: string;
  profilePhoto?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface CreateAddressPayload {
  label: string;
  county: string;
  town: string;
  street?: string;
  latitude?: string;
  longitude?: string;
  isDefault?: boolean;
}

export async function getProfile(): Promise<UserProfile> {
  const { data } = await api.get("/users/me");
  return data.data;
}

export async function updateProfile(
  payload: UpdateProfilePayload,
): Promise<UserProfile> {
  const { data } = await api.patch("/users/me", payload);
  return data.data;
}

export async function changePassword(
  payload: ChangePasswordPayload,
): Promise<void> {
  await api.patch("/users/me/password", payload);
}

export async function getAddresses(): Promise<Address[]> {
  const { data } = await api.get("/users/me/addresses");
  return data.data;
}

export async function createAddress(
  payload: CreateAddressPayload,
): Promise<Address> {
  const { data } = await api.post("/users/me/addresses", payload);
  return data.data;
}

export async function updateAddress(
  id: string,
  payload: Partial<CreateAddressPayload>,
): Promise<Address> {
  const { data } = await api.patch(`/users/me/addresses/${id}`, payload);
  return data.data;
}

export async function deleteAddress(id: string): Promise<void> {
  await api.delete(`/users/me/addresses/${id}`);
}

export async function setDefaultAddress(id: string): Promise<void> {
  await api.patch(`/users/me/addresses/${id}/default`);
}
