const OpenAI = require('openai').default;
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config({ path: '.env.local' });

async function testOpenAI() {
  console.log('🔍 测试OpenAI API连接...');
  
  // 检查API密钥
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ OpenAI API密钥未配置');
    return;
  }
  
  console.log('✅ API密钥已配置:', apiKey.substring(0, 20) + '...');
  
  try {
    // 初始化OpenAI客户端
    const openai = new OpenAI({
      apiKey: apiKey,
      timeout: 30000, // 30秒超时
    });
    
    console.log('📡 发送测试请求...');
    
    // 测试最简单的请求
    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt: "Studio Ghibli style, a simple cat",
      size: "1024x1024",
      n: 1,
      response_format: "b64_json"
    });
    
    console.log('✅ OpenAI API调用成功!');
    console.log('📊 响应数据:', {
      imageCount: response.data.length,
      hasBase64: !!response.data[0]?.b64_json,
      base64Length: response.data[0]?.b64_json?.length || 0
    });
    
    return response;
    
  } catch (error) {
    console.error('❌ OpenAI API调用失败:', {
      message: error.message,
      code: error.code,
      type: error.type,
      status: error.status
    });
    
    // 分析错误类型
    if (error.message.includes('API key')) {
      console.log('💡 建议: 检查API密钥是否正确');
    } else if (error.message.includes('timeout')) {
      console.log('💡 建议: 网络连接问题，检查网络或稍后重试');
    } else if (error.message.includes('quota') || error.message.includes('limit')) {
      console.log('💡 建议: API配额不足，检查OpenAI账户余额');
    } else if (error.message.includes('400')) {
      console.log('💡 建议: 请求参数问题，可能是模型或参数不支持');
    }
    
    return null;
  }
}

// 运行测试
testOpenAI().then(result => {
  if (result) {
    console.log('🎉 测试完成 - API工作正常');
  } else {
    console.log('💥 测试失败 - API有问题');
  }
  process.exit(0);
}).catch(error => {
  console.error('💥 测试脚本错误:', error);
  process.exit(1);
}); 