export type CircleContact = {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  primary: boolean;
};

// Cloud values update the same contact; a phone number never becomes two recipients.
export function mergeContacts(
  local: CircleContact[],
  cloud: CircleContact[],
  removedIds: string[] = [],
) {
  let result = local.map((c) => ({ ...c }));
  for (const row of cloud) {
    if (removedIds.includes(row.id)) continue;
    if (row.primary) result = result.map((c) => ({ ...c, primary: false }));
    result = result.filter((c) => c.id !== row.id && c.phone !== row.phone);
    result.push({ ...row });
  }
  if (result.length > 20)
    throw new Error(
      "Restoring would exceed 20 contacts. Remove a contact before trying again.",
    );
  let primary = false;
  return result
    .map((c) => {
      const chosen = c.primary && !primary;
      if (chosen) primary = true;
      return { ...c, primary: chosen };
    })
    .sort((a, b) => Number(b.primary) - Number(a.primary));
}
