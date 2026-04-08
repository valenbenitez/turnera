export function commerceMemberDocId(
  userId: string,
  commerceId: string
): string {
  return `${userId}_${commerceId}`;
}
