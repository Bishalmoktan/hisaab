import { sendNotificationToUser } from "@/lib/actions/notify";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.INTERNAL_API_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, title, body, url } = await req.json();

  try {
    await sendNotificationToUser(userId, { title, body, url });
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
