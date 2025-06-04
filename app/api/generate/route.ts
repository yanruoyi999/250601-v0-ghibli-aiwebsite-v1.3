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
    const { prompt, aspectRatio = "1:1", quality = "standard", input_image } = await request.json()
    
    if (!prompt) {
      return NextResponse.json({ error: "提示词不能为空" }, { status: 400 })
    }

    // 使用麻雀API密钥
    const apiKey = process.env.ISMAQUE_API_KEY || "sk-kj4qrPmapiE4R37KoGfVQbVfgwOJ9ybDi5pHnWwOcBSVRJr5"

    console.log(`🎨 ismaque.org flux-kontext-pro 生成: {
  userPrompt: '${prompt}',
  aspectRatio: '${aspectRatio}',
  inputImageReceived: !!input_image,
  quality: '${quality}',
  size: '${getSizeFromAspectRatio(aspectRatio)}',
  promptLength: ${prompt.length}
}`)

    let apiPrompt = prompt; // 默认使用用户输入的提示词

    if (input_image) {
        // 如果存在 input_image，尝试将其嵌入到 prompt 中
        // 假设麻雀API在prompt中支持data URL格式
        apiPrompt = `data:image/png;base64,${input_image} 吉卜力风格的插画, ${prompt}`;
        console.log("使用图生图模式，构造新的 prompt:", apiPrompt.substring(0, 200) + "..."); // 打印部分 prompt
    } else {
        // 如果没有 input_image，则使用文本到图片模式
        apiPrompt = `${prompt}, 吉卜力风格的插画`; // 确保文本生成也带有吉卜力风格
        console.log("使用文本到图片模式，构造 prompt:", apiPrompt);
    }

    const mappedSize = getSizeFromAspectRatio(aspectRatio)
    
    console.log("📏 API请求尺寸:", mappedSize)

    const startTime = Date.now()
    
    console.log("📡 发送请求到 ismaque.org API...")
    console.log("📄 请求参数:", {
      prompt: apiPrompt.substring(0, 100) + "...",
      n: 1,
      model: "flux-kontext-pro",
      aspect_ratio: aspectRatio,
      input_image: input_image ? input_image.substring(0, 50) + "..." : undefined
    })
    
    // 完全按照示例代码的格式，只使用基本参数
    const myHeaders = new Headers()
    myHeaders.append("Authorization", `Bearer ${apiKey}`)
    myHeaders.append("Content-Type", "application/json")

    const rawObject: any = {
      "prompt": apiPrompt,
      "n": 1,
      "model": "flux-kontext-pro",
      "aspect_ratio": aspectRatio,
      ...(input_image && {"input_image": input_image})
    }

    const raw = JSON.stringify(rawObject)

    const requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: raw
    }

    const response = await fetch("https://ismaque.org/v1/images/generations", requestOptions)

    const requestTime = Date.now() - startTime
    console.log(`⏱️ ismaque.org API请求耗时: ${requestTime}ms`)
    console.log("📥 API响应状态:", response.status, response.statusText)

    // !!! 新增日志打印原始响应文本 !!!
    const responseText = await response.text();
    console.log("📄 原始 API 响应内容:", responseText);

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
          model: "flux-kontext-pro",
          aspectRatio: aspectRatio,
          promptLength: apiPrompt.length
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
