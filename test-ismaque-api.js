#!/usr/bin/env node

async function testIsmaqueAPI() {
  console.log('�� 测试 ismaque.org API - 新密钥格式...')
  
  // 测试1: 第一个新密钥格式
  console.log('\n📝 测试1: sk-9jXJzcI62bIyIscKZXgFyvYrNATC5cEo7zvNmJNgPDFdBrgq')
  await testWithConfig({
    headers: {
      "Authorization": "Bearer sk-9jXJzcI62bIyIscKZXgFyvYrNATC5cEo7zvNmJNgPDFdBrgq",
      "Content-Type": "application/json"
    },
    body: {
      "prompt": "A colorful sunset over the mountains",
      "n": 1,
      "model": "gpt-image-1",
      "size": "1024x1024"
    }
  })
  
  // 测试2: 第二个新密钥格式
  console.log('\n📝 测试2: v1-sk-9jXJzcI62bIyIscKZXgFyvYrNATC5cEo7zvNmJNgPDFdBrgq')
  await testWithConfig({
    headers: {
      "Authorization": "Bearer v1-sk-9jXJzcI62bIyIscKZXgFyvYrNATC5cEo7zvNmJNgPDFdBrgq",
      "Content-Type": "application/json"
    },
    body: {
      "prompt": "A colorful sunset over the mountains",
      "n": 1,
      "model": "gpt-image-1",
      "size": "1024x1024"
    }
  })
  
  // 测试3: 第一个密钥不带Bearer
  console.log('\n📝 测试3: 第一个密钥不带Bearer前缀')
  await testWithConfig({
    headers: {
      "Authorization": "sk-9jXJzcI62bIyIscKZXgFyvYrNATC5cEo7zvNmJNgPDFdBrgq",
      "Content-Type": "application/json"
    },
    body: {
      "prompt": "A colorful sunset over the mountains",
      "n": 1,
      "model": "gpt-image-1",
      "size": "1024x1024"
    }
  })
  
  // 测试4: 第二个密钥不带Bearer
  console.log('\n📝 测试4: 第二个密钥不带Bearer前缀')
  await testWithConfig({
    headers: {
      "Authorization": "v1-sk-9jXJzcI62bIyIscKZXgFyvYrNATC5cEo7zvNmJNgPDFdBrgq",
      "Content-Type": "application/json"
    },
    body: {
      "prompt": "A colorful sunset over the mountains",
      "n": 1,
      "model": "gpt-image-1",
      "size": "1024x1024"
    }
  })
}

async function testWithConfig(config) {
  try {
    console.log('🔑 Headers:', config.headers)
    console.log('📊 Body:', JSON.stringify(config.body))
    
    const response = await fetch("https://ismaque.org/v1/images/generations", {
      method: 'POST',
      headers: config.headers,
      body: JSON.stringify(config.body),
      redirect: 'follow'
    })
    
    console.log('📱 HTTP状态码:', response.status)
    
    const result = await response.text()
    console.log('📥 响应内容:', result.substring(0, 200) + (result.length > 200 ? '...' : ''))
    
    if (response.ok) {
      console.log('✅ 测试成功!')
      try {
        const jsonResult = JSON.parse(result)
        if (jsonResult.data && jsonResult.data[0] && jsonResult.data[0].url) {
          console.log('🖼️ 图片URL:', jsonResult.data[0].url)
        }
      } catch (e) {
        console.log('⚠️ 响应不是JSON格式')
      }
    } else {
      console.log('❌ 测试失败')
    }
    
  } catch (error) {
    console.error('💥 请求错误:', error.message)
  }
}

testIsmaqueAPI() 