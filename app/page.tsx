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
  const [quality, setQuality] = useState("standard")
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(null)
  const [referenceImage, setReferenceImage] = useState<File | null>(null)
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
    }
  }

  const generateImage = async () => {
    if (!prompt.trim()) {
      alert("请输入场景描述")
      return
    }

    setIsGenerating(true)
    setProgress(0)
    
    console.log("🚀 开始生成图片:", { prompt, aspectRatio, quality })

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
      
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          aspectRatio,
          quality,
        }),
      })

      const data = await response.json()
      const endTime = Date.now()
      const generationTime = ((endTime - startTime) / 1000).toFixed(1)
      
      console.log(`⏱️ 生成耗时: ${generationTime}秒`)

      if (data.success) {
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
        throw new Error(data.error || data.details || "生成失败")
      }
    } catch (error) {
      console.error("❌ 生成失败:", error)
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
      // 2秒后重置进度条
      setTimeout(() => {
        if (!isGenerating) setProgress(0)
      }, 2000)
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
                <div
                  className="border-2 border-dashed border-amber-600/30 rounded-lg p-8 text-center cursor-pointer hover:border-amber-500/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
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
                  {referenceImage && <p className="text-amber-400 text-sm mt-2">已选择: {referenceImage.name}</p>}
                </div>
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

              {/* Quality Mode */}
              <div className="mb-6">
                <label className="block text-amber-100 text-sm font-medium mb-3">Quality Mode 质量模式</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setQuality("standard")}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      quality === "standard"
                        ? "border-amber-500 bg-amber-500/20 text-amber-100"
                        : "border-amber-600/20 bg-slate-700/30 text-amber-200 hover:border-amber-500/50"
                    }`}
                  >
                    <div className="text-sm">Standard</div>
                  </button>
                  <button
                    onClick={() => setQuality("hd")}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      quality === "hd"
                        ? "border-amber-500 bg-amber-500/20 text-amber-100"
                        : "border-amber-600/20 bg-slate-700/30 text-amber-200 hover:border-amber-500/50"
                    }`}
                  >
                    <div className="text-sm">HD</div>
                  </button>
                </div>
              </div>

              {/* Generate Button */}
              <Button
                onClick={generateImage}
                disabled={isGenerating || !prompt.trim()}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    生成中...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    生成图片
                  </div>
                )}
              </Button>

              {/* Progress Bar */}
              {isGenerating && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-amber-200 mb-2">
                    <span>生成进度</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Output Panel */}
          <Card className="bg-slate-800/50 border-amber-600/20 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-amber-100 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  Output 输出
                </h2>
                {!currentImage && (
                  <div className="text-amber-400 text-sm bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                    ✨ Upgrade to Pro for faster generation and advanced features
                  </div>
                )}
              </div>

              <div className="aspect-square bg-slate-700/30 rounded-lg border border-amber-600/20 flex items-center justify-center overflow-hidden">
                {currentImage ? (
                  <img
                    src={currentImage.url || "/placeholder.svg"}
                    alt="Generated Ghibli style image"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center text-amber-200/50">
                    <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>生成的图片将在这里显示</p>
                    <p className="text-sm mt-1">Generated image will appear here</p>
                  </div>
                )}
              </div>

              {currentImage && (
                <div className="mt-6">
                  <Button
                    onClick={downloadImage}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium py-3 rounded-lg transition-all"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Image 下载图片
                  </Button>

                  <div className="mt-4 p-3 bg-slate-700/30 rounded-lg border border-amber-600/20">
                    <p className="text-amber-200/70 text-xs">
                      <strong>提示词:</strong> {currentImage.prompt}
                    </p>
                    <p className="text-amber-200/50 text-xs mt-1">
                      比例: {currentImage.aspectRatio} | 生成时间: {new Date(currentImage.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {progress === 100 && currentImage && (
                <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <p className="text-emerald-400 text-sm text-center">✅ 生成完成！Generation completed!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
