"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, Download, Sparkles, ImageIcon, Wand2 } from "lucide-react"

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
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const aspectRatios = [
    { value: "1:1", label: "1:1", icon: "⬜" },
    { value: "4:3", label: "4:3", icon: "▭" },
    { value: "3:4", label: "3:4", icon: "▯" },
    { value: "16:9", label: "16:9", icon: "▬" },
    { value: "9:16", label: "9:16", icon: "▮" },
  ]

  const examplePrompts = [
    "A peaceful forest village with floating islands in the sky, Studio Ghibli style",
    "A magical train station in the clouds with steam locomotives, whimsical and colorful",
    "A cozy cottage by a crystal clear lake surrounded by ancient trees and mystical creatures",
    "A bustling market street in a steampunk city with airships flying overhead",
    "A serene garden with glowing flowers and friendly spirits, painted in watercolor style"
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPromptIndex((prev) => (prev + 1) % examplePrompts.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

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

  const handlePromptClick = (selectedPrompt: string) => {
    setPrompt(selectedPrompt)
  }

  const generateImage = async () => {
    if (!prompt.trim() && !referenceImage) {
      alert("请输入场景描述或上传一张参考图片")
      return
    }

    setIsGenerating(true)
    setProgress(0)
    setGenerationStatus("准备开始...")
    
    // 如果用户没有输入提示词，但上传了图片，我们给一个更详细的默认值
    const finalPrompt = prompt.trim() || "A beautiful magical landscape with rolling hills, ancient trees, and peaceful atmosphere";

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
      console.log("📥 后端返回数据:", data); // 打印后端返回的完整数据

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
        
        // 显示成功消息
        setTimeout(() => {
          setGenerationStatus("✅ 生成完成！")
        }, 500)
        
        console.log("✅ 图片生成成功!", newImage)
      } else {
        console.error("❌ 生成失败:", data.error || data.details || "生成失败")
        setGenerationStatus(`生成失败: ${data.message || '未知错误'}`)
        throw new Error(data.error || data.details || "生成失败")
      }
    } catch (error) {
      console.error("❌ 生成失败:", error)
      setGenerationStatus(`生成失败: ${error instanceof Error ? error.message : '请检查网络或联系管理员'}`)
      setProgress(0) // 重置进度条
      
      // 更好的错误提示
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'string' 
          ? error 
          : '生成失败，请稍后重试'
      
      setTimeout(() => setGenerationStatus(errorMessage), 1000)
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
    if (!currentImage?.url) return
    
    try {
      const response = await fetch(currentImage.url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      
      const a = document.createElement("a")
      a.style.display = "none"
      a.href = url
      a.download = `ghibli-ai-${currentImage.id}.png`
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
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-emerald-400 mb-4">
            Ghibli AI
          </h1>
          <p className="text-amber-200/80 text-lg md:text-xl max-w-2xl mx-auto">
            将您的想象转化为宫崎骏风格的艺术作品
            <br />
            <span className="text-base">Transform your ideas into Ghibli-style masterpieces</span>
          </p>
        </header>

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
                    <img src={previewUrl} alt="Preview" className="w-full rounded-2xl object-contain max-h-60" />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl">
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
                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
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
                  className="w-full h-32 px-4 py-3 bg-slate-700/50 border border-amber-600/20 rounded-2xl text-amber-100 placeholder-amber-200/50 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 resize-none"
                  maxLength={500}
                />
                <div className="text-right text-amber-200/50 text-xs mt-1">{prompt.length}/500</div>
                
                {/* Example Prompts */}
                <div className="mt-4 p-4 bg-slate-700/30 border border-amber-600/20 rounded-2xl">
                  <div className="flex items-center gap-2 mb-3">
                    <Wand2 className="w-4 h-4 text-amber-400" />
                    <span className="text-amber-200 text-sm font-medium">灵感提示词 / Example Prompts</span>
                  </div>
                  <div 
                    className="cursor-pointer p-3 bg-slate-800/50 border border-amber-600/20 rounded-2xl hover:border-amber-500/50 transition-all duration-300 hover:bg-slate-700/50"
                    onClick={() => handlePromptClick(examplePrompts[currentPromptIndex])}
                  >
                    <p className="text-amber-100 text-sm leading-relaxed">
                      {examplePrompts[currentPromptIndex]}
                    </p>
                    <p className="text-amber-400/70 text-xs mt-1">点击使用此提示词 / Click to use this prompt</p>
                  </div>
                </div>
              </div>

              {/* Aspect Ratio */}
              <div className="mb-6">
                <label className="block text-amber-100 text-sm font-medium mb-3">Aspect Ratio 纵横比</label>
                <div className="grid grid-cols-5 gap-2">
                  {aspectRatios.map((ratio) => (
                    <button
                      key={ratio.value}
                      onClick={() => setAspectRatio(ratio.value)}
                      className={`p-3 rounded-2xl border text-center transition-all ${
                        aspectRatio === ratio.value
                          ? "border-amber-500 bg-amber-500/20 text-amber-100"
                          : "border-amber-600/20 bg-slate-700/30 text-amber-200 hover:border-amber-500/50"
                      }`}
                    >
                      <div className="text-2xl mb-1">{ratio.icon}</div>
                      <div className="text-xs">{ratio.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-8">
                <Button
                  onClick={generateImage}
                  disabled={isGenerating}
                  className="w-full h-14 text-lg font-bold bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-2xl shadow-lg shadow-amber-500/20 transition-all duration-300 transform hover:scale-105 disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed disabled:scale-100"
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
                  <div className="w-full bg-slate-700 rounded-2xl h-2.5 mt-4 overflow-hidden">
                    <div className="bg-amber-500 h-2.5 rounded-2xl" style={{ width: `${progress}%`, transition: 'width 0.5s ease-in-out' }}></div>
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
          <Card className="bg-slate-800/50 border-amber-600/20 backdrop-blur-sm">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold text-amber-100 mb-6 flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Output 输出
              </h2>

              <div className="bg-slate-900/50 border border-amber-600/20 rounded-2xl flex flex-col items-center justify-center p-6 min-h-[400px] mb-8">
                {isGenerating ? (
                  <div className="flex flex-col items-center justify-center text-center text-amber-200">
                    <div className="w-10 h-10 border-4 border-t-transparent border-amber-500 rounded-full animate-spin mb-4"></div>
                    <p className="text-lg">正在为您生成艺术作品...</p>
                    <p className="text-sm text-amber-200/70">{generationStatus}</p>
                  </div>
                ) : currentImage ? (
                  <img
                    src={currentImage.url}
                    alt={currentImage.prompt || 'Generated Ghibli style image'}
                    className="w-full h-auto object-contain rounded-2xl max-h-[400px]"
                  />
                ) : (
                  <div className="text-center text-amber-300/50">
                    <ImageIcon size={64} className="mx-auto mb-4" />
                    <h3 className="text-xl font-medium">生成的图片将在这里显示</h3>
                    <p className="text-base">Generated image will appear here</p>
                  </div>
                )}
              </div>

              <div className="mt-8">
                <Button
                  onClick={downloadImage}
                  disabled={!currentImage}
                  className="w-full h-14 text-lg font-bold bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-2xl shadow-lg shadow-amber-500/20 transition-all duration-300 disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  <Download className="w-6 h-6 mr-2" />
                  下载图片
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 