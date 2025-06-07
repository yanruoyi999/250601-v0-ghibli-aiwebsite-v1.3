"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, Download, Sparkles, ImageIcon } from "lucide-react"

interface GeneratedImage {
  id: string
  url: string
  prompt: string
  aspectRatio: string
  timestamp: number
}

export default function GhibliAI() {
  const [prompt, setPrompt] = useState("")
  const [aspectRatio, setAspectRatio] = useState("1:1")
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [generationStatus, setGenerationStatus] = useState("")
  const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(null)
  const [referenceImage, setReferenceImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const aspectRatios = [
    { value: "1:1", label: "1:1", icon: "⬜" },
    { value: "4:3", label: "4:3", icon: "▭" },
    { value: "3:4", label: "3:4", icon: "▯" },
    { value: "16:9", label: "16:9", icon: "▬" },
    { value: "9:16", label: "9:16", icon: "▮" },
  ]

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setReferenceImage(file)
      const objectUrl = URL.createObjectURL(file)
      setPreviewUrl(objectUrl)
    }
  }

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const mockEvent = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileUpload(mockEvent);
    }
  };

  const removeReferenceImage = () => {
    setReferenceImage(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const generateImage = async () => {
    if (!prompt.trim() && !referenceImage) {
      alert("请输入场景描述或上传一张参考图片")
      return
    }

    setIsGenerating(true)
    setProgress(0)
    setGenerationStatus("准备开始...")
    
    // 如果用户没有输入提示词，但上传了图片，我们给一个默认值
    const finalPrompt = prompt.trim() || "A beautiful picture";

    console.log("🚀 开始生成图片:", { prompt: finalPrompt, aspectRatio })

    // 改进的进度条逻辑 - 更平滑且不超过100%
    let currentProgress = 5
    setProgress(currentProgress)
    
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 85) {
          const increment = Math.random() * 6 + 2 // 2-8%的随机增长
          const newProgress = Math.min(prev + increment, 85)
          return newProgress
        }
        return prev // 停在85%等待API返回
      })
    }, 300) // 每300ms更新一次，更平滑

    try {
      const startTime = Date.now()
      
      let requestBody: any = {
          prompt: finalPrompt,
          aspectRatio,
      };

      if (referenceImage) {
        setGenerationStatus("正在上传您的图片...")
        // 将图片转换为Base64
        const reader = new FileReader();
        const base64Image = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(referenceImage);
        });
        requestBody.input_image = base64Image;
        console.log("🖼️ 已将参考图片转换为Base64并添加到请求中");
      }
      
      setGenerationStatus("图片已发送，请求AI进行处理...")
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()
      const endTime = Date.now()
      const generationTime = ((endTime - startTime) / 1000).toFixed(1)
      
      console.log(`⏱️ 生成耗时: ${generationTime}秒`)

      if (data.success) {
        setGenerationStatus("生成成功！")
        // 快速跳到95%然后到100%
        setProgress(95)
        setTimeout(() => setProgress(100), 200)
        
        const newImage: GeneratedImage = {
          id: Date.now().toString(),
          url: data.imageUrl,
          prompt: data.prompt,
          aspectRatio,
          timestamp: Date.now(),
        }

        setCurrentImage(newImage)

        // 保存到 localStorage
        const savedImages = JSON.parse(localStorage.getItem("ghibli-images") || "[]")
        savedImages.unshift(newImage)
        localStorage.setItem("ghibli-images", JSON.stringify(savedImages.slice(0, 20)))
        
        console.log("✅ 图片生成成功!", newImage)
      } else {
        setGenerationStatus(`生成失败: ${data.message || '未知错误'}`)
        throw new Error(data.error || data.details || "生成失败")
      }
    } catch (error) {
      console.error("❌ 生成失败:", error)
      setGenerationStatus(`生成失败: ${error instanceof Error ? error.message : '请检查网络或联系管理员'}`)
      setProgress(0) // 重置进度条
      
      // 更好的错误提示
      const errorMessage = error instanceof Error ? error.message : "未知错误"
      if (errorMessage.includes("API请求失败")) {
        alert("API服务暂时不可用，请稍后重试")
      } else if (errorMessage.includes("网络")) {
        alert("网络连接问题，请检查网络后重试")
      } else {
        alert(`图片生成失败: ${errorMessage}`)
      }
    } finally {
      clearInterval(progressInterval)
      setIsGenerating(false)
      // 2秒后重置进度条和状态
      setTimeout(() => {
        if (!isGenerating) {
            setProgress(0);
            setGenerationStatus("");
        }
      }, 3000)
    }
  }

  const downloadImage = async () => {
    if (!currentImage) return

    try {
      const response = await fetch(currentImage.url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `ghibli-${currentImage.id}.png`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("下载失败:", error)
    }

  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-slate-800 to-amber-900">
      {/* Header */}
      <header className="border-b border-amber-600/20 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-amber-100">Ghibli AI</h1>
              <p className="text-sm text-amber-200/70">吉卜力风格AI图片生成器</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {/* Input Settings Panel */}
          <Card className="bg-slate-800/50 border-amber-600/20 backdrop-blur-sm">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold text-amber-100 mb-6 flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Input Settings 输入设置
              </h2>

              <p className="text-amber-200/70 text-sm mb-6">
                Upload an image or enter text to generate Ghibli style image
                <br />
                上传图像或输入文本以生成 Ghibli 样式图像
              </p>

              {/* Reference Image Upload */}
              <div className="mb-6">
                <label className="block text-amber-100 text-sm font-medium mb-3">
                  Reference Image (Optional)
                  <br />
                  <span className="text-amber-200/70">参考图片（可选）</span>
                </label>
                {previewUrl ? (
                  <div className="relative group">
                    <img src={previewUrl} alt="Preview" className="w-full rounded-lg object-contain max-h-60" />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={removeReferenceImage}
                      >
                        移除图片
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                      isDragging
                        ? 'border-amber-400 bg-amber-500/10'
                        : 'border-amber-600/30 hover:border-amber-500/50'
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    <Upload className="w-12 h-12 text-amber-400 mx-auto mb-3" />
                    <p className="text-amber-200">
                      Drag and drop or <span className="text-amber-400 underline">browse files</span>
                    </p>
                    <p className="text-amber-200/70 text-sm mt-1">拖放或浏览文件</p>
                    <p className="text-amber-200/50 text-xs mt-2">
                      Upload an image to transform into Ghibli style (JPG, PNG, GIF, WebP, up to 30MB)
                      <br />
                      上传图像以转换为吉卜力风格（JPG、PNG、GIF、WebP，最大 30MB）
                    </p>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </div>

              {/* Prompt Input */}
              <div className="mb-6">
                <label className="block text-amber-100 text-sm font-medium mb-3">Prompt 提示</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the image you want to generate..."
                  className="w-full h-32 px-4 py-3 bg-slate-700/50 border border-amber-600/20 rounded-lg text-amber-100 placeholder-amber-200/50 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 resize-none"
                  maxLength={500}
                />
                <div className="text-right text-amber-200/50 text-xs mt-1">{prompt.length}/500</div>
              </div>

              {/* Aspect Ratio */}
              <div className="mb-6">
                <label className="block text-amber-100 text-sm font-medium mb-3">Aspect Ratio 纵横比</label>
                <div className="grid grid-cols-5 gap-2">
                  {aspectRatios.map((ratio) => (
                    <button
                      key={ratio.value}
                      onClick={() => setAspectRatio(ratio.value)}
                      className={`p-3 rounded-lg border text-center transition-all ${
                        aspectRatio === ratio.value
                          ? "border-amber-500 bg-amber-500/20 text-amber-100"
                          : "border-amber-600/20 bg-slate-700/30 text-amber-200 hover:border-amber-500/50"
                      }`}
                    >
                      <div className="text-lg mb-1">{ratio.icon}</div>
                      <div className="text-xs">{ratio.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <div className="mt-8">
                <Button
                  onClick={generateImage}
                  disabled={isGenerating}
                  className="w-full h-14 text-lg font-bold bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-xl shadow-lg shadow-amber-500/20 transition-all duration-300 transform hover:scale-105 disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed disabled:scale-100"
                >
                  {isGenerating ? (
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                      <span>生成中... ({Math.round(progress)}%)</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-6 h-6" />
                      <span>生成图片</span>
                    </div>
                  )}
                </Button>
                {isGenerating && (
                  <div className="w-full bg-slate-700 rounded-full h-2.5 mt-4 overflow-hidden">
                    <div className="bg-amber-500 h-2.5 rounded-full" style={{ width: `${progress}%`, transition: 'width 0.5s ease-in-out' }}></div>
                  </div>
                )}
                {generationStatus && (
                  <p className="text-center text-amber-200/80 text-sm mt-3 animate-pulse">
                    {generationStatus}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Result Image Display */}
          <div className="bg-slate-900/50 border border-amber-600/20 rounded-2xl flex flex-col items-center justify-start p-4 min-h-[50vh] lg:min-h-full">
            {isGenerating ? (
              <div className="flex-grow flex items-center justify-center text-center text-amber-200">
                <div>
                  <div className="w-10 h-10 border-4 border-t-transparent border-amber-500 rounded-full animate-spin mb-4 mx-auto"></div>
                  <p className="text-lg">正在为您生成艺术作品...</p>
                  <p className="text-sm text-amber-200/70">{generationStatus}</p>
                </div>
              </div>
            ) : currentImage ? (
              <div className="w-full h-full flex flex-col gap-4">
                <div className="flex-grow flex items-center justify-center min-h-0">
                  <img
                    src={currentImage.url}
                    alt={currentImage.prompt || 'Generated Ghibli style image'}
                    className="w-full h-auto object-contain rounded-lg max-h-[70vh]"
                  />
                </div>
                <div className="flex-shrink-0 w-full">
                  <Button
                    onClick={downloadImage}
                    className="w-full h-14 text-lg font-bold bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-xl shadow-lg shadow-amber-500/20 transition-all duration-300"
                  >
                    <Download className="w-6 h-6 mr-2" />
                    下载图片
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex-grow flex items-center justify-center text-center text-amber-300/50">
                <div>
                  <ImageIcon size={64} className="mx-auto mb-4" />
                  <h3 className="text-xl font-medium">生成的图片将在这里显示</h3>
                  <p className="text-base">Generated image will appear here</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

