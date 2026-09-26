#!/bin/bash
# Pre-version hook: 在版本更新前自动编译和打包

set -e  # 遇到错误立即退出

echo "🔨 开始编译和打包..."

# 1. 清理旧的构建产物
echo "📦 清理旧的构建产物..."
rm -rf out
rm -f *.vsix

# 2. 安装依赖(如果需要)
if [ ! -d "node_modules" ]; then
  echo "📥 安装依赖..."
  npm ci
fi

# 3. 运行 lint 检查
echo "🔍 运行 lint 检查..."
npm run lint

# 4. 编译生产版本
echo "⚙️  编译生产版本..."
npm run build:prod

# 5. 打包 VSIX
echo "📦 打包 VSIX..."
npm run package

# 6. 获取版本号
VERSION=$(node -p "require('./package.json').version")
VSIX_FILE="antigravity-cockpit-${VERSION}.vsix"

if [ -f "$VSIX_FILE" ]; then
  echo "✅ 打包成功: $VSIX_FILE"
  ls -lh "$VSIX_FILE"
else
  echo "❌ 打包失败: 未找到 $VSIX_FILE"
  exit 1
fi

echo "🎉 编译和打包完成!"
