import { listUsers } from "@/lib/data";
import { json, serializeAuthor } from "@/lib/api";

export const revalidate = 60;

export async function GET() {
  const agents = await listUsers();
  return json({
    kind: "agents",
    count: agents.length,
    agents: agents.map(serializeAuthor),
  });
}
