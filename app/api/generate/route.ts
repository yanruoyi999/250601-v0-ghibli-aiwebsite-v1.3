import { type NextRequest, NextResponse } from "next/server"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { v4 as uuidv4 } from 'uuid';

// 构建吉卜力风格提示词 - 简化版，避免触发安全过滤
const buildGhibliPrompt = (userPrompt: string) => {
  // 在这个版本的代码中，我们直接在主要逻辑中构造 prompt，所以这个函数暂时没有被直接使用
  // 但是保留它以防将来需要
  return `Studio Ghibli animation style, ${userPrompt}, hand-drawn 2D cel animation, watercolor painting technique, soft dreamlike atmosphere, peaceful mood`
}

// 将图片上传到 Cloudflare R2
async function uploadImageToR2(base64Data: string): Promise<string> {
  
  // 从环境变量中获取 R2 配置
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;
  const publicUrlBase = process.env.R2_PUBLIC_URL_BASE;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicUrlBase) {
    throw new Error("Cloudflare R2 的环境变量未完整设置");
  }

  // 初始化 S3 客户端，指向 Cloudflare R2
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  try {
    const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Clean, 'base64');
    const fileExtension = base64Data.substring(base64Data.indexOf('/') + 1, base64Data.indexOf(';base64'));
    const fileName = `${uuidv4()}.${fileExtension}`;

    // 创建上传指令
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      Body: buffer,
      ContentType: `image/${fileExtension}`,
    });

    // 执行上传
    await s3.send(command);
    const imageUrl = `${publicUrlBase}/${fileName}`;
    
    console.log(`✅ 图片已成功上传到 R2: ${imageUrl}`);
    return imageUrl;
    
  } catch (error: any) {
    console.error("❌ 调用 R2 服务时发生错误:", error);
    throw new Error(`图片上传至 Cloudflare R2 失败: ${error.message}`);
  }
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

    let imageUrlForApi: string | undefined = undefined; // 用于存储上传后的图片URL
    const startTime = Date.now() // 记录请求开始时间

    if (input_image) {
      // --- 使用 Replicate API 进行图生图 ---
      const replicateApiKey = process.env.REPLICATE_API_TOKEN
      
      // 检查 R2 所需的所有环境变量是否都已设置
      const r2Configured = process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET_NAME && process.env.R2_PUBLIC_URL_BASE;

      if (!replicateApiKey || !r2Configured) {
        let errorMessage = "无法进行图生图, 环境变量缺失: ";
        if (!replicateApiKey) errorMessage += "REPLICATE_API_TOKEN ";
        if (!r2Configured) errorMessage += "一个或多个 R2 相关的密钥 ";
        return NextResponse.json({ error: errorMessage }, { status: 500 })
      }

      console.log("接收到 input_image，尝试上传图片到 R2 并调用 Replicate API 进行图生图...");
      try {
        imageUrlForApi = await uploadImageToR2(input_image);
        console.log("图片上传成功，URL:", imageUrlForApi);
      } catch (uploadError: any) {
        console.error("❌ 图片上传流程失败:", uploadError.message);
        return NextResponse.json({
          success: false,
          error: "图片上传失败",
          message: uploadError.message,
          details: uploadError.toString()
        }, { status: 500 });
      }

      // 构造一个强大且明确的指令，强制保留原图内容
      // 如果用户没有输入具体描述，使用一个更通用的占位符
      const userContent = prompt.trim() ? prompt.trim() : "the subject in the image";
      const apiPrompt = `Redraw the entire image in the style of "Studio Ghibli animation, hand-drawn, 2d cel animation, watercolor background, by Hayao Miyazaki". It is crucial to maintain the original subject, its colors, and the overall composition of the image. Only change the artistic style. The user's original prompt was: '${userContent}'.`;
      
      console.log(`🎨 flux-kontext-pro 图生图: {\n  userPrompt: '${prompt}',\n  finalApiPrompt: '${apiPrompt}'\n}`);

      const myHeaders = new Headers()
      myHeaders.append("Authorization", `Token ${replicateApiKey}`)
      myHeaders.append("Content-Type", "application/json")

      const rawObject: any = {
        "input": {
          "prompt": apiPrompt,
          "input_image": imageUrlForApi,
          "aspect_ratio": "match_input_image", // 强制匹配原图比例
          "output_format": "jpg",
          "safety_tolerance": 2
        }
      }

      const raw = JSON.stringify(rawObject)

      const requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw
      }
      
      const response = await fetch("https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-pro/predictions", requestOptions)
      const requestTime = Date.now() - startTime
      console.log(`⏱️ Replicate API请求耗时: ${requestTime}ms`)
      console.log("📥 Replicate API响应状态:", response.status, response.statusText)

      const responseText = await response.text();
      console.log("📄 原始 Replicate API 响应内容:", responseText);

      if (!response.ok) {
        console.error("❌ Replicate API错误:", response.status, responseText)
        try {
          const errorJson = JSON.parse(responseText);
          if (errorJson && errorJson.detail) {
            throw new Error(`Replicate API请求被拒绝: ${errorJson.detail}`);
          }
        } catch (parseError) {
          // 如果解析失败，使用原始文本
        }
        throw new Error(`Replicate API请求失败: ${response.status} - ${responseText}`);
      }

      let result
      try {
        result = JSON.parse(responseText)
      } catch (parseError) {
        console.error("❌ Replicate API JSON解析失败:", parseError)
        console.error("📄 原始响应:", responseText)
        throw new Error(`Replicate API返回非JSON格式数据: ${responseText.substring(0, 100)}...`)
      }

      console.log("📊 解析后的 Replicate 结果:", JSON.stringify(result, null, 2))

      let imageUrl = null

      // Replicate API 返回预测对象，需要轮询获取结果
      if (result.id && result.status) {
        console.log("📋 Replicate 预测ID:", result.id, "状态:", result.status)

        if (result.status === "succeeded" && result.output) {
          imageUrl = result.output
          console.log("✅ 找到生成的图片URL:", imageUrl)
        } else if (result.status === "processing" || result.status === "starting") {
          console.log("⏳ Replicate 预测正在处理中，开始轮询...")

          const pollUrl = result.urls?.get || `https://api.replicate.com/v1/predictions/${result.id}`
          const maxPolls = 30 // 最多轮询30次
          const pollInterval = 2000 // 每2秒轮询一次

          for (let i = 0; i < maxPolls; i++) {
            await new Promise(resolve => setTimeout(resolve, pollInterval))

            const pollResponse = await fetch(pollUrl, {
              headers: {
                'Authorization': `Token ${replicateApiKey}`,
                'Content-Type': 'application/json'
              }
            })

            if (pollResponse.ok) {
              const pollResult = await pollResponse.json()
              console.log(`📊 Replicate 轮询 ${i + 1}/${maxPolls}, 状态:`, pollResult.status)

              if (pollResult.status === "succeeded" && pollResult.output) {
                imageUrl = pollResult.output
                console.log("✅ Replicate 轮询成功，找到生成的图片URL:", imageUrl)
                break
              } else if (pollResult.status === "failed") {
                throw new Error(`Replicate 图片生成失败: ${pollResult.error || "未知错误"}`)
              }
            } else {
                console.error(`❌ Replicate 轮询请求失败: ${pollResponse.status} - ${await pollResponse.text()}`);
            }
          }

          if (!imageUrl) {
            throw new Error("Replicate 图片生成超时，请稍后重试")
          }
        } else if (result.status === "failed") {
          throw new Error(`Replicate 图片生成失败: ${result.error || "未知错误"}`)
        }
      } else {
        console.error("❌ 无法从 Replicate API 响应中提取预测信息:", result)
        throw new Error(`Replicate API返回数据格式异常: 无法找到预测数据`)
      }

      if (imageUrl) {
        console.log(`🎉 Replicate 图片生成完成: ${imageUrl.substring(0, 100)}...`)
        const totalTime = Date.now() - startTime
        const responseData: any = {
          success: true,
          imageUrl: imageUrl,
          message: "图片生成成功！",
          stats: {
            totalTime: `${totalTime}ms`,
            model: "flux-kontext-pro (Replicate)",
            aspectRatio: aspectRatio,
            promptLength: apiPrompt.length,
            predictionId: result.id
          }
        };
        return NextResponse.json(responseData)
      } else {
        throw new Error("无法获取 Replicate 生成的图片")
      }

    } else {
      // --- 使用麻雀 API 进行文生图 ---
      const ismaqueApiKey = process.env.ISMAQUE_API_KEY

      if (!ismaqueApiKey) {
        return NextResponse.json({ error: "ISMAQUE_API_KEY 环境变量未设置，无法进行文生图" }, { status: 500 })
      }

      console.log(`🎨 ismaque.org flux-kontext-pro 文生图: {\n  userPrompt: '${prompt}',\n  aspectRatio: '${aspectRatio}',\n  quality: '${quality}',\n  size: '${getSizeFromAspectRatio(aspectRatio)}',\n  promptLength: ${prompt.length}\n}`);

      const apiPrompt = `${prompt}, 吉卜力风格的插画`; // 确保文本生成也带有吉卜力风格
      const mappedSize = getSizeFromAspectRatio(aspectRatio)

      console.log("📏 API请求尺寸:", mappedSize)

      console.log("📡 发送请求到 ismaque.org API...");
      console.log("📄 请求参数:");
      console.log("  model:", process.env.ISMAQUE_MODEL || "flux-kontext-pro");
      console.log("  prompt (partial):", apiPrompt.substring(0, 200) + "...");
      console.log("  aspect_ratio:", aspectRatio);

      const myHeaders = new Headers()
      myHeaders.append("Authorization", `Bearer ${ismaqueApiKey}`)
      myHeaders.append("Content-Type", "application/json")

      const rawObject: any = {
        "prompt": apiPrompt,
        "n": 1,
        "model": "flux-kontext-pro",
        "aspect_ratio": aspectRatio,
        "webhook_url": "https://250601-v0-ghibli-aiwebsite-v1-3.vercel.app/api/webhook-callback",
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

      const responseText = await response.text();
      console.log("📄 原始 API 响应内容:", responseText);

      if (!response.ok) {
        console.error("❌ ismaque.org API错误:", response.status, responseText)
        if (response.status === 400) {
          try {
            const errorJson = JSON.parse(responseText);
            if (errorJson && errorJson.error && errorJson.error.message) {
              throw new Error(`API请求被拒绝: ${errorJson.error.message}`);
            }
          } catch (parseError) {
          }
          throw new Error("请求被安全系统拒绝，请尝试调整提示词内容");
        }
        throw new Error(`API请求失败: ${response.status} - ${responseText}`)
      }

      let result
      try {
        result = JSON.parse(responseText)
      } catch (parseError) {
        console.error("❌ JSON解析失败:", parseError)
        console.error("📄 原始响应:", responseText)
        throw new Error(`API返回非JSON格式数据: ${responseText.substring(0, 100)}...`)
      }

      console.log("📊 解析后的结果:", JSON.stringify(result, null, 2))

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
        const responseData: any = {
          success: true,
          imageUrl: imageUrl,
          message: "图片生成成功！",
          stats: {
            totalTime: `${requestTime}ms`,
            model: "flux-kontext-pro (Ismaque)",
            aspectRatio: aspectRatio,
            promptLength: apiPrompt.length
          }
        };
        return NextResponse.json(responseData)
      } else {
        throw new Error("无法获取生成的图片")
      }
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