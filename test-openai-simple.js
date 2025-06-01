const OpenAI = require('openai').default;
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config({ path: '.env.local' });

async function testOpenAIConnection() {
  console.log('🔍 测试OpenAI基本连接...');
  
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
      timeout: 15000, // 15秒超时
    });
    
    console.log('📡 测试简单的ChatGPT调用...');
    
    // 测试最简单的ChatGPT请求
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "说一个字：好" }],
      max_tokens: 10
    });
    
    console.log('✅ ChatGPT API调用成功!');
    console.log('📊 响应:', response.choices[0].message.content);
    
    // 现在测试图像模型列表
    console.log('📡 获取可用模型列表...');
    const models = await openai.models.list();
    const imageModels = models.data.filter(model => 
      model.id.includes('gpt-image') || 
      model.id.includes('dall-e') ||
      model.id.includes('image')
    );
    
    console.log('🎨 可用的图像模型:');
    imageModels.forEach(model => {
      console.log(`  - ${model.id} (创建时间: ${new Date(model.created * 1000).toISOString()})`);
    });
    
    if (imageModels.length === 0) {
      console.log('⚠️ 没有找到图像生成模型，可能gpt-image-1不可用');
      console.log('💡 建议: 尝试使用dall-e-3模型');
    }
    
    return { success: true, imageModels };
    
  } catch (error) {
    console.error('❌ OpenAI API调用失败:', {
      message: error.message,
      code: error.code,
      type: error.type,
      status: error.status
    });
    
    // 分析错误类型
    if (error.message.includes('API key') || error.status === 401) {
      console.log('💡 问题: API密钥无效或过期');
      console.log('💡 解决方案: 检查OpenAI账户并重新生成API密钥');
    } else if (error.message.includes('timeout')) {
      console.log('💡 问题: 网络连接超时');
      console.log('💡 解决方案: 检查网络连接，可能需要VPN或稍后重试');
    } else if (error.message.includes('quota') || error.status === 429) {
      console.log('💡 问题: API配额不足');
      console.log('💡 解决方案: 检查OpenAI账户余额和使用限制');
    } else if (error.status === 400) {
      console.log('💡 问题: 请求参数错误');
    }
    
    return { success: false, error };
  }
}

// 运行测试
testOpenAIConnection().then(result => {
  if (result.success) {
    console.log('🎉 OpenAI连接测试成功');
    if (result.imageModels.some(m => m.id.includes('gpt-image'))) {
      console.log('✅ gpt-image模型可用');
    } else {
      console.log('⚠️ gpt-image模型不可用，建议使用dall-e-3');
    }
  } else {
    console.log('💥 OpenAI连接测试失败');
  }
  process.exit(0);
}).catch(error => {
  console.error('💥 测试脚本错误:', error);
  process.exit(1);
}); 