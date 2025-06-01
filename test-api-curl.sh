#!/bin/bash

echo "🧪 开始测试WildCard代理 + OpenAI gpt-image-1 API..."

# 检查服务是否运行
echo "📡 检查localhost:3001是否可访问..."
if ! curl -s http://localhost:3001 > /dev/null; then
    echo "❌ 服务未运行，请先启动: npm run dev"
    exit 1
fi

echo "✅ 服务运行中，开始API测试..."

# 测试数据
TEST_DATA='{
  "prompt": "吉卜力风格测试，一个简单的小女孩站在草地上",
  "aspectRatio": "1:1", 
  "quality": "standard"
}'

echo "📊 测试数据: $TEST_DATA"
echo "⏱️ 开始发送请求..."

START_TIME=$(date +%s%3N)

# 发送POST请求
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d "$TEST_DATA" \
  --max-time 120 \
  http://localhost:3001/api/generate)

END_TIME=$(date +%s%3N)
DURATION=$((END_TIME - START_TIME))

# 分离响应体和状态码
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$RESPONSE" | head -n -1)

echo "📱 HTTP状态码: $HTTP_CODE"
echo "⏱️ 请求耗时: ${DURATION}ms"

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ API测试成功!"
    echo "📋 响应内容:"
    echo "$RESPONSE_BODY" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE_BODY"
    
    # 检查是否包含图片数据
    if echo "$RESPONSE_BODY" | grep -q "data:image"; then
        echo "🎉 图片生成成功!"
        IMAGE_LENGTH=$(echo "$RESPONSE_BODY" | grep -o 'data:image[^"]*' | wc -c)
        echo "💾 Base64图片数据长度: ${IMAGE_LENGTH}字符"
    else
        echo "⚠️ 响应中未发现图片数据"
    fi
else
    echo "❌ API测试失败!"
    echo "📋 错误内容:"
    echo "$RESPONSE_BODY"
fi

echo ""
echo "📋 测试完成，状态码: $HTTP_CODE，耗时: ${DURATION}ms" 