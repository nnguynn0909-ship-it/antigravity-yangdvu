#!/bin/bash

# 自动发布脚本
# 用法: ./scripts/release.sh [版本号]
# 如果不提供版本号,将使用 package.json 中的当前版本

set -e

# 如果提供了版本号参数,则更新版本
if [ -n "$1" ]; then
    VERSION=$1
    echo "📝 更新版本号到: ${VERSION}"
    
    # 检查是否有未提交的改动
    if ! git diff-index --quiet HEAD --; then
        echo "⚠️  检测到未提交的改动,请先提交或贮藏"
        git status --short
        exit 1
    fi
    
    # 更新 package.json 中的版本号
    sed -i '' "s/\"version\": \".*\"/\"version\": \"${VERSION}\"/" package.json
    
    # 提交版本号更新
    git add package.json
    git commit -m "chore: bump version to ${VERSION}"
else
    # 使用当前版本
    VERSION=$(node -p "require('./package.json').version")
    echo "📌 使用当前版本: ${VERSION}"
fi

TAG="v${VERSION}"

echo ""
echo "🚀 开始发布流程: ${VERSION}"
echo ""

# 1. 清理旧的构建产物
echo "🧹 清理旧的构建产物..."
rm -rf out
rm -f *.vsix

# 2. 运行 lint 检查
echo "🔍 运行 lint 检查..."
npm run lint

# 3. 编译生产版本
echo "⚙️  编译生产版本..."
npm run build:prod

# 4. 打包 VSIX
echo "📦 打包 VSIX..."
npm run package

# 5. 检查 VSIX 文件
VSIX_FILE="antigravity-cockpit-${VERSION}.vsix"
if [ ! -f "$VSIX_FILE" ]; then
    echo "❌ 错误: 未找到 $VSIX_FILE"
    exit 1
fi

echo "✅ 打包成功: $VSIX_FILE ($(ls -lh "$VSIX_FILE" | awk '{print $5}'))"
echo ""

# 6. 创建 tag (如果不存在)
if git rev-parse "$TAG" >/dev/null 2>&1; then
    echo "⚠️  Tag ${TAG} 已存在,跳过创建"
else
    echo "🏷️  创建 tag: ${TAG}..."
    git tag -a "${TAG}" -m "Release ${VERSION}"
fi

# 7. 推送到 GitHub
echo "🚀 推送到 GitHub..."
git push origin main
git push origin "${TAG}"

echo ""
echo "✅ 发布流程已启动！"
echo ""
echo "📊 查看发布进度:"
echo "   https://github.com/jlcodes99/vscode-antigravity-cockpit/actions"
echo ""
echo "📦 发布完成后可在此查看:"
echo "   https://open-vsx.org/extension/jlcodes/antigravity-cockpit"
echo ""
echo "💡 提示: GitHub Actions 会自动:"
echo "   - 发布到 GitHub Release"
echo "   - 发布到 Open VSX Registry"
