import { type NextRequest, NextResponse } from "next/server"

// 构建吉卜力风格提示词 - 简化版，避免触发安全过滤
const buildGhibliPrompt = (userPrompt: string) => {
  return `Studio Ghibli animation style, ${userPrompt}, hand-drawn 2D cel animation, watercolor painting technique, soft dreamlike atmosphere, peaceful mood`
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

    // 使用麻雀API密钥
    const apiKey = process.env.ISMAQUE_API_KEY || "sk-kj4qrPmapiE4R37KoGfVQbVfgwOJ9ybDi5pHnWwOcBSVRJr5"

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
    console.log("📄 请求参数:", {
      prompt: ghibliPrompt.substring(0, 100) + "...",
      n: 1,
      model: "gpt-image-1",
      size: mappedSize
    })
    
    // 完全按照示例代码的格式，只使用基本参数
    const myHeaders = new Headers()
    myHeaders.append("Authorization", `Bearer ${apiKey}`)
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
      body: raw
    }

    const response = await fetch("https://ismaque.org/v1/images/generations", requestOptions)

    const requestTime = Date.now() - startTime
    console.log(`⏱️ ismaque.org API请求耗时: ${requestTime}ms`)
    console.log("📥 API响应:", response.status, response.statusText)

    // 获取响应文本
    const responseText = await response.text()
    console.log("📄 API响应内容:", responseText.substring(0, 500) + (responseText.length > 500 ? "..." : ""))

    if (!response.ok) {
      console.error("❌ ismaque.org API错误:", response.status, responseText)
      
      // 检查特定错误类型  
      if (response.status === 400) {
        throw new Error("请求被安全系统拒绝，请尝试调整提示词内容")
      }
      
      throw new Error(`API请求失败: ${response.status} - ${responseText}`)
    }

    // 尝试解析JSON
    let result
    try {
      result = JSON.parse(responseText)
    } catch (parseError) {
      console.error("❌ JSON解析失败:", parseError)
      console.error("📄 原始响应:", responseText)
      throw new Error(`API返回非JSON格式数据: ${responseText.substring(0, 100)}...`)
    }

    console.log("📊 解析后的结果:", JSON.stringify(result, null, 2))

    // 处理标准OpenAI格式响应
    let imageUrl = null
    
    if (result.data && Array.isArray(result.data) && result.data.length > 0) {
      const imageData = result.data[0]
      if (imageData.url) {
        imageUrl = imageData.url
        console.log("✅ 找到URL格式图片:", imageUrl.substring(0, 100) + "...")
      } else if (imageData.b64_json) {
        imageUrl = `data:image/png;base64,${imageData.b64_json}`
        console.log("✅ 找到base64格式图片，长度:", imageData.b64_json.length)
      }
    } else {
      console.error("❌ 无法从API响应中提取图片URL:", result)
      throw new Error(`API返回数据格式异常: 无法找到图片数据`)
    }

    if (imageUrl) {
      console.log(`🎉 图片生成完成: ${imageUrl.substring(0, 100)}...`)
      
      return NextResponse.json({
        success: true,
        imageUrl: imageUrl,
        message: "图片生成成功！",
        stats: {
          totalTime: `${requestTime}ms`,
          model: "gpt-image-1",
          size: mappedSize,
          promptLength: ghibliPrompt.length
        }
      })
    } else {
      throw new Error("无法获取生成的图片")
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
