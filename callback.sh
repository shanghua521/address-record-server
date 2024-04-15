#!/bin/sh

# 获取脚本的第四、第五个参数
param4="$4"
param5="$5"

# 将第四、第五个参数使用英文冒号拼接
content="${param4}:${param5}"

# 使用环境变量获取Bearer Token和URL
bearerToken="$TOKEN"
url="$URL"

# 使用curl发起POST请求
curl -X POST $url \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $bearerToken" \
-d "{\"value\": \"$content\"}"