import { type NextRequest, NextResponse } from "next/server"

// 构建吉卜力风格提示词
const buildGhibliPrompt = (userPrompt: string) => {
  return `Studio Ghibli animation style, ${userPrompt}, hand-drawn 2D cel animation, watercolor painting technique, Hayao Miyazaki art direction, soft dreamlike atmosphere, peaceful serene mood, extremely soft muted watercolor tones, very low saturation pastels, extremely soft subtle lines, barely visible line art, minimal line definition, gentle lighting, perfect anatomy, natural pose, professional animation quality, avoid strong lines, avoid bold outlines, avoid thick lines, extremely soft diffused natural lighting, minimal contrast lighting`
}

// 尺寸映射
const getSizeFromAspectRatio = (aspectRatio: string): "1024x1024" | "1536x1024" | "1024x1536" => {
  const sizeMap: Record<string, "1024x1024" | "1536x1024" | "1024x1536"> = {
    "1:1": "1024x1024",
    "3:4": "1024x1536", 
    "4:3": "1536x1024",
    "16:9": "1536x1024",
    "9:16": "1024x1536"
  }
  return sizeMap[aspectRatio] || "1024x1024"
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, aspectRatio = "1:1", quality = "standard" } = await request.json()
    
    if (!prompt) {
      return NextResponse.json({ error: "提示词不能为空" }, { status: 400 })
    }

    // 从环境变量获取API密钥，如果没有则使用有效的默认值
    const apiKey = process.env.ISMAQUE_API_KEY || "sk-9jXJzcI62bIyIscKZXgFyvYrNATC5cEo7zvNmJNgPDFdBrgq"

    console.log(`🎨 ismaque.org gpt-image-1 生成: {
  userPrompt: '${prompt}',
  aspectRatio: '${aspectRatio}',
  quality: '${quality}',
  size: '${getSizeFromAspectRatio(aspectRatio)}',
  promptLength: ${prompt.length}
}`)

    const ghibliPrompt = buildGhibliPrompt(prompt)
    const mappedSize = getSizeFromAspectRatio(aspectRatio)
    
    const startTime = Date.now()
    
    console.log("📡 发送请求到 ismaque.org API...")
    
    // 使用环境变量中的API密钥
    const response = await fetch("https://ismaque.org/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt: ghibliPrompt,
        n: 1,
        model: "gpt-image-1",
        size: mappedSize
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("❌ ismaque.org API错误:", response.status, errorText)
      throw new Error(`API请求失败: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    const requestTime = Date.now() - startTime
    
    console.log(`⏱️ ismaque.org API请求耗时: ${requestTime}ms`)
    console.log("📥 API响应:", response.status, "OK")

    if (result.data && result.data[0] && result.data[0].url) {
      console.log(`🎉 顶级质量图片生成完成: ${result.data[0].url}`)
      
      return NextResponse.json({
        success: true,
        imageUrl: result.data[0].url,
        message: "图片生成成功！",
        stats: {
          totalTime: `${requestTime}ms`,
          model: "gpt-image-1",
          size: mappedSize,
          promptLength: ghibliPrompt.length
        }
      })
    } else {
      throw new Error("API返回数据格式异常")
    }

  } catch (error: any) {
    console.error("❌ ismaque.org API错误:", error)
    
    return NextResponse.json({
      success: false,
      error: "图片生成失败",
      message: error.message || "生成失败，请稍后重试",
      details: error.toString()
    }, { status: 500 })
  }
}
