import { type NextRequest, NextResponse } from "next/server"

// 构建吉卜力风格提示词
const buildGhibliPrompt = (userPrompt: string) => {
  return `Studio Ghibli animation style, ${userPrompt}, hand-drawn 2D cel animation, watercolor painting technique, Hayao Miyazaki art direction, soft dreamlike atmosphere, peaceful serene mood, extremely soft muted watercolor tones, minimal line definition, gentle lighting, perfect anatomy, natural pose, professional animation quality`
}

// 尺寸映射
const getSizeFromAspectRatio = (aspectRatio: string): "1024x1024" | "1536x1024" | "1024x1536" => {
  const sizeMap: Record<string, "1024x1024" | "1536x1024" | "1024x1536"> = {
    "1:1": "1024x1024",
    "4:3": "1536x1024", 
    "3:4": "1024x1536",
    "16:9": "1536x1024",
    "9:16": "1024x1536"
  }
  return sizeMap[aspectRatio] || "1024x1024"
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, aspectRatio, quality } = await request.json()

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "请输入场景描述" }, { status: 400 })
    }

    const ghibliPrompt = buildGhibliPrompt(prompt.trim())
    const mappedSize = getSizeFromAspectRatio(aspectRatio)
    
    console.log("🎨 ismaque.org gpt-image-1 生成:", {
      userPrompt: prompt,
      aspectRatio: aspectRatio,
      quality: quality,
      size: mappedSize,
      promptLength: ghibliPrompt.length
    })

    const startTime = Date.now()

    // 使用ismaque.org API - 更新为有效的API密钥
    const myHeaders = new Headers()
    myHeaders.append("Authorization", "Bearer sk-kj4qrPmapiE4R37KoGfVQbVfgwOJ9ybDi5pHnWwOcBSVRJr5")
    myHeaders.append("Content-Type", "application/json")

    const raw = JSON.stringify({
      "prompt": ghibliPrompt,
      "n": 1,
      "model": "gpt-image-1",
      "size": mappedSize
    })

    const requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: raw,
      redirect: 'follow' as RequestRedirect
    }

    console.log("📡 发送请求到 ismaque.org API...")
    
    const response = await fetch("https://ismaque.org/v1/images/generations", requestOptions)
    const totalTime = Date.now() - startTime

    if (!response.ok) {
      const errorText = await response.text()
      console.error("❌ ismaque.org API错误:", response.status, errorText)
      throw new Error(`API请求失败: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log("📥 ismaque.org API响应:", result)

    if (result.data && result.data[0]) {
      console.log("✅ ismaque.org生成成功:", `${totalTime}ms`)
      
      // 处理base64格式的图片
      let imageUrl = ""
      if (result.data[0].b64_json) {
        // 将base64转换为data URL
        imageUrl = `data:image/png;base64,${result.data[0].b64_json}`
      } else if (result.data[0].url) {
        // 如果返回的是URL格式
        imageUrl = result.data[0].url
      }
      
      return NextResponse.json({
        success: true,
        imageUrl: imageUrl,
        prompt: ghibliPrompt,
        settings: {
          size: mappedSize,
          provider: "ismaque.org + gpt-image-1",
          aspectRatio: aspectRatio,
          quality: quality,
          promptLength: ghibliPrompt.length,
          timings: { total: `${totalTime}ms` }
        }
      })
    }
    
    throw new Error("ismaque.org返回数据格式错误")

  } catch (error) {
    console.error("❌ ismaque.org API错误:", error)
    
    let errorMessage = "图片生成失败"
    
    if (error instanceof Error) {
      const msg = error.message.toLowerCase()
      
      if (msg.includes("timeout") || msg.includes("timed out")) {
        errorMessage = "请求超时，请稍后重试"
      } else if (msg.includes("401") || msg.includes("unauthorized")) {
        errorMessage = "API密钥验证失败，请检查ismaque.org账户"
      } else if (msg.includes("quota") || msg.includes("billing")) {
        errorMessage = "API配额不足，请在ismaque.org平台充值"
      } else if (msg.includes("403")) {
        errorMessage = "访问被拒绝，请检查API权限"
      } else {
        errorMessage = error.message
      }
    }

    return NextResponse.json(
      { 
        error: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
