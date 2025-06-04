import { type NextRequest, NextResponse } from "next/server"

// 构建吉卜力风格提示词 - 简化版，避免触发安全过滤
const buildGhibliPrompt = (userPrompt: string) => {
  // 在这个版本的代码中，我们直接在主要逻辑中构造 prompt，所以这个函数暂时没有被直接使用
  // 但是保留它以防将来需要
  return `Studio Ghibli animation style, ${userPrompt}, hand-drawn 2D cel animation, watercolor painting technique, soft dreamlike atmosphere, peaceful mood`
}

// TODO: 实现图片上传到免费图库并返回URL的功能
// 您需要根据选择的图片托管服务（如 Imgur, Cloudinary 的免费层等）
// 查阅其API文档，并在这里编写实际的上传逻辑。
// 这个函数接收Base64格式的图片数据，应返回一个Promise，解析为图片的公开访问URL。
async function uploadImageToFreeHost(base64Data: string): Promise<string> {
    console.log("⚠️ 占位符函数：uploadImageToFreeHost 被调用，需要实际实现上传逻辑");
    // 这是一个模拟实现，总是返回一个假URL。请替换为实际的API调用。
    // const uploadApiUrl = "YOUR_IMAGE_HOSTING_UPLOAD_URL";
    // const apiKey = "YOUR_IMAGE_HOSTING_API_KEY"; // 如果需要

    // try {
    //     // 移除Data URL前缀，只保留Base64数据，如果API需要的话
    //     const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, '');

    //     const response = await fetch(uploadApiUrl, {
    //         method: 'POST',
    //         headers: {
    //             'Content-Type': 'application/json',
    //             // \'Authorization\': `Client-ID ${apiKey}`, // Imgur 示例
    //             // ... 其他可能需要的头部
    //         },
    //         body: JSON.stringify({ image: base64Clean }) // 根据API要求调整请求体，Imgur等通常需要{image: base64Data}
    //     });

    //     if (!response.ok) {
    //         const errorText = await response.text();
    //         console.error("❌ 图片上传失败:", response.status, errorText);\n    console.log("📏 API请求尺寸:", mappedSize)
    //         throw new Error(`图片上传服务返回错误: ${response.status} - ${errorText}`);
    //     }

    //     const uploadResult = await response.json();
    //     // 根据API响应结构提取图片URL
    //     // 例如对于 Imgur: return uploadResult.data.link;
    //     // 例如对于 Cloudinary: return uploadResult.secure_url;
    //     const imageUrl = "EXTRACT_URL_FROM_UPLOAD_RESULT"; // !!! 替换此处 !!!
    //     console.log("✅ 图片上传成功，URL:", imageUrl);
    //     return imageUrl;

    // } catch (error: any) {
    //     console.error("❌ 调用图片上传服务时发生错误:", error);
    //     throw new Error(`图片上传失败: ${error.message}`);
    // }

    // !!! 暂时返回一个假URL用于测试流程，实际使用时请删除此行并取消注释上面的代码 !!!
    return Promise.resolve("https://example.com/placeholder-uploaded-image.jpg");
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
    // 检查并获取请求体中的数据
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
    let imageUrlForApi: string | undefined = undefined; // 用于存储上传后的图片URL

    if (input_image) {
        console.log("接收到 input_image，尝试上传图片...");
        try {
            // 调用占位符函数上传图片
            // 注意：input_image 预计是 Data URL 格式 (e.g., data:image/jpeg;base64,...)
            imageUrlForApi = await uploadImageToFreeHost(input_image);
            // 使用上传后的URL构造 prompt，格式为 "图片URL 吉卜力风格的插画, 用户提示词"
            apiPrompt = `${imageUrlForApi} 吉卜力风格的插画, ${prompt}`;
            console.log("使用图生图（URL+Prompt）模式，构造新的 prompt:", apiPrompt.substring(0, 200) + "..."); // 打印部分 prompt
        } catch (uploadError: any) {
            console.error("❌ 图片上传流程失败:", uploadError.message);
            // 如果图片上传失败，返回错误
            return NextResponse.json({
                success: false,
                error: "图片上传失败",
                message: uploadError.message,
                details: uploadError.toString()
            }, { status: 500 });
        }
    } else {
        // 如果没有 input_image，则使用文本到图片模式
        apiPrompt = `${prompt}, 吉卜力风格的插画`; // 确保文本生成也带有吉卜力风格
        console.log("使用文本到图片模式，构造 prompt:", apiPrompt);
    }

    const mappedSize = getSizeFromAspectRatio(aspectRatio)

    console.log("📏 API请求尺寸:", mappedSize)

    const startTime = Date.now()

    console.log("📡 发送请求到 ismaque.org API...");
    console.log("📄 请求参数:");
    console.log("  model:", process.env.ISMAQUE_MODEL || "flux-kontext-pro");
    console.log("  prompt (partial):", apiPrompt.substring(0, 200) + "...");
    console.log("  aspect_ratio:", aspectRatio);
    // 注意：这里不再发送单独的 input_image 参数给麻雀 API，因为图片数据已通过 URL 嵌入到 prompt 中

    // 构造请求体
    const myHeaders = new Headers()
    myHeaders.append("Authorization", `Bearer ${apiKey}`)
    myHeaders.append("Content-Type", "application/json")

    const rawObject: any = {
      "prompt": apiPrompt,
      "n": 1,
      "model": "flux-kontext-pro",
      "aspect_ratio": aspectRatio,
      // 添加 webhook_url 参数，测试麻雀 API 是否支持异步回调
      "webhook_url": "https://your-vercel-deployment.vercel.app/api/webhook-callback", // 请替换为您的实际部署地址并考虑实现这个回调端点
      // 不再发送单独的 input_image 参数
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
        // 尝试解析错误响应，看是否有详细信息
        try {
          const errorJson = JSON.parse(responseText);
          if (errorJson && errorJson.error && errorJson.error.message) {
             throw new Error(`API请求被拒绝: ${errorJson.error.message}`);
          }
        } catch (parseError) {
           // 如果解析失败，使用原始文本
        }
        throw new Error("请求被安全系统拒绝，请尝试调整提示词或图片内容");
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

      // 在图生图模式下，如果图片上传成功，可能也希望返回上传后的URL
      // 这里可以选择返回，也可以不返回，取决于前端是否需要知道这个URL
      const responseData: any = {
        success: true,
        imageUrl: imageUrl,
        message: "图片生成成功！",
        stats: {
          totalTime: `${requestTime}ms`,
          model: "flux-kontext-pro",
          aspectRatio: aspectRatio,
          promptLength: apiPrompt.length
        }
      };

      if (imageUrlForApi) { // 如果是图生图模式且图片上传成功
          // responseData.uploadedImageUrl = imageUrlForApi; // 如果前端需要上传后的URL可以取消注释
      }


      return NextResponse.json(responseData)
    } else {
      throw new Error("无法获取生成的图片")
    }

  } catch (error: any) {
    console.error("❌ 图片生成或API调用错误:", error)

    return NextResponse.json({
      success: false,
      error: "图片生成失败",
      message: error.message || "生成失败，请稍后重试",
      details: error.toString()
    }, { status: 500 })
  }
}