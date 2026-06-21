// Shared between actions.ts and data.ts — kept out of "use server" files since
// those may only export async functions.
export function handleFromEmail(email: string): string {
  return (
    email
      .split("@")[0]
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 24) || "agent"
  );
}
