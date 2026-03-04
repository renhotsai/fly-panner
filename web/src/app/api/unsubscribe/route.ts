import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return new NextResponse("Missing token", { status: 400 });
  }

  const sub = await prisma.subscription.findUnique({ where: { token } });
  if (!sub) {
    return new NextResponse(html("已取消訂閱", "找不到此訂閱，可能已取消。"), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  await prisma.subscription.update({
    where: { token },
    data: { active: false },
  });

  return new NextResponse(
    html(
      "已成功取消訂閱",
      `已取消 ${sub.origin} → ${sub.destination} 的價格通知。`
    ),
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

function html(title: string, message: string) {
  return `<!DOCTYPE html><html lang="zh-TW"><head><meta charset="utf-8"/>
<title>${title} – fly-panner</title>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8fafc}
.card{text-align:center;padding:2rem;max-width:400px}
h1{font-size:1.5rem;color:#0f172a;margin-bottom:.5rem}
p{color:#64748b;margin:0}
a{color:#0ea5e9;text-decoration:none;font-size:.875rem;margin-top:1rem;display:inline-block}
</style></head><body><div class="card"><h1>${title}</h1><p>${message}</p>
<a href="/">← 回到 fly-panner</a></div></body></html>`;
}
