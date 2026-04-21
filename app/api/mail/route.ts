import { SendEmail } from "@/emails/SendEmail";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request, res: Response) {
    const secret = req.headers.get('x-webhook-secret');
  
  if (secret !== process.env.WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
    });
  }

  const { email, name, pendingAmount, date, recipient } = await req.json();
  try {
    const { data: response, error: err } = await resend.emails.send({
      from: "Hisaab <noreply@bisaric.com>",
      to: [email],
      subject: "Pending Payment Reminder",
      react: SendEmail({ name, pendingAmount, date, recipient }),
    });

    if (err) {
      return Response.json({ err }, { status: 500 });
    }

    return Response.json({
      send: response,
    });
  } catch (error) {
    return Response.json({ error }, { status: 500 });
  }
}
