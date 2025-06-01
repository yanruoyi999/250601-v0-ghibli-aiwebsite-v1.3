#!/usr/bin/env node

const axios = require('axios')

async function testAPI() {
  console.log('🧪 开始测试WildCard代理 + OpenAI gpt-image-1 API...')
  
  const testData = {
    prompt: '吉卜力风格测试，一个简单的小女孩站在草地上',
    aspectRatio: '1:1',
    quality: 'standard'
  }
  
  try {
    console.log('📡 发送请求到 http://localhost:3001/api/generate')
    console.log('📊 测试数据:', testData)
    
    const startTime = Date.now()
    
    const response = await axios.post('http://localhost:3001/api/generate', testData, {
      timeout: 120000, // 2分钟超时
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    const totalTime = Date.now() - startTime
    
    if (response.status === 200) {
      console.log('✅ API测试成功!')
      console.log('⏱️ 总用时:', `${totalTime}ms`)
      console.log('📸 图片尺寸:', response.data.settings?.size)
      console.log('🎨 提供商:', response.data.settings?.provider)
      console.log('📝 提示词长度:', response.data.settings?.promptLength)
      console.log('🔧 完整设置:', JSON.stringify(response.data.settings, null, 2))
      
      if (response.data.imageUrl) {
        console.log('🎉 图片生成成功! Base64图片数据长度:', response.data.imageUrl.length)
        console.log('💾 图片数据格式:', response.data.imageUrl.substring(0, 50) + '...')
      }
      
      return {
        success: true,
        result: response.data,
        timing: `${totalTime}ms`
      }
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
  } catch (error) {
    console.error('❌ API测试失败:')
    
    if (error.response) {
      console.error('📱 HTTP状态:', error.response.status)
      console.error('📋 错误内容:', error.response.data)
    } else if (error.request) {
      console.error('🌐 网络错误:', error.message)
    } else {
      console.error('⚠️ 其他错误:', error.message)
    }
    
    return {
      success: false,
      error: error.message,
      details: error.response?.data
    }
  }
}

// 运行测试
testAPI().then(result => {
  console.log('\n📋 测试结果总结:')
  console.log(JSON.stringify(result, null, 2))
  process.exit(result.success ? 0 : 1)
}).catch(err => {
  console.error('💥 脚本执行失败:', err)
  process.exit(1)
}) 