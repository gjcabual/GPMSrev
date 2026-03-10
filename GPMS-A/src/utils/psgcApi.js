/**
 * Philippine Standard Geographic Code (PSGC) API – https://psgc.cloud
 * No auth required. Use for Region → Province → City/Municipality → Barangay.
 */

const BASE = "https://psgc.cloud/api";

export async function getRegions() {
  const res = await fetch(`${BASE}/regions`);
  if (!res.ok) throw new Error("Failed to load regions");
  return res.json();
}

export async function getProvinces(regionCode) {
  if (!regionCode) return [];
  const res = await fetch(`${BASE}/regions/${regionCode}/provinces`);
  if (!res.ok) return [];
  return res.json();
}

export async function getCitiesMunicipalitiesByRegion(regionCode) {
  if (!regionCode) return [];
  const res = await fetch(`${BASE}/regions/${regionCode}/cities-municipalities`);
  if (!res.ok) return [];
  return res.json();
}

export async function getCitiesMunicipalitiesByProvince(provinceCode) {
  if (!provinceCode) return [];
  const res = await fetch(`${BASE}/provinces/${provinceCode}/cities-municipalities`);
  if (!res.ok) return [];
  return res.json();
}

export async function getBarangays(cityMunCode) {
  if (!cityMunCode) return [];
  const res = await fetch(`${BASE}/cities-municipalities/${cityMunCode}/barangays`);
  if (!res.ok) return [];
  return res.json();
}
