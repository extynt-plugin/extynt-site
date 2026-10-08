import { auth } from "@/auth";
import type { Viewer } from "@/lib/services/device";

export async function getViewer(): Promise<Viewer | null> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.email) return null;
  return { id: user.id, email: user.email.toLowerCase() };
}
