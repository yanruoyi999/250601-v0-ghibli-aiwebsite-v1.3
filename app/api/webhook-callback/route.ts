import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    console.log("✅ 接收到麻雀 API 的 Webhook 回调请求！");

    // 读取并打印请求体内容
    const callbackData = await request.json();
    console.log("📄 Webhook 回调数据:", JSON.stringify(callbackData, null, 2));

    // TODO: 在这里处理回调数据，例如提取图片URL并存储起来

    // 接收到回调后，需要给 API 返回一个成功的响应，告知已收到
    return NextResponse.json({ success: true, message: "Webhook callback received" }, { status: 200 });

  } catch (error: any) {
    console.error("❌ 处理 Webhook 回调时发生错误:", error);
    // 如果处理失败，返回错误状态码给 API
    return NextResponse.json({ success: false, message: "Error processing webhook callback" }, { status: 500 });
  }
}

// 可能也需要支持 GET 请求用于简单测试，尽管 API 通常发送 POST
export async function GET(request: NextRequest) {
    console.log("收到 Webhook 回调 GET 请求 (用于测试?)");
    return NextResponse.json({ success: true, message: "Webhook callback endpoint is live (GET)" }, { status: 200 });
} 