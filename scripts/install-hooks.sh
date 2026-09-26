#!/bin/bash
# 安装 Git hooks

set -e

HOOKS_DIR=".git/hooks"
SCRIPTS_DIR="scripts"

echo "🔧 安装 Git hooks..."

# 创建 pre-push hook
cat > "$HOOKS_DIR/pre-push" << 'EOF'
#!/bin/bash
# Pre-push hook: 在推送前检查是否需要打包

# 检查是否推送 tag
while read local_ref local_sha remote_ref remote_sha
do
  if [[ "$remote_ref" =~ refs/tags/v.* ]]; then
    echo "🏷️  检测到 tag 推送: $remote_ref"
    echo "⚠️  请确保已经运行过 'npm run release' 来打包最新版本"
    
    # 获取当前版本
    VERSION=$(node -p "require('./package.json').version")
    VSIX_FILE="antigravity-cockpit-${VERSION}.vsix"
    
    if [ ! -f "$VSIX_FILE" ]; then
      echo "❌ 错误: 未找到 $VSIX_FILE"
      echo "💡 请运行: npm run release"
      exit 1
    fi
    
    echo "✅ 找到 VSIX 包: $VSIX_FILE"
  fi
done

exit 0
EOF

chmod +x "$HOOKS_DIR/pre-push"

echo "✅ Git hooks 安装完成!"
echo ""
echo "已安装的 hooks:"
echo "  - pre-push: 推送 tag 前检查 VSIX 包是否存在"
echo ""
echo "💡 使用方法:"
echo "  1. 更新版本: npm version patch/minor/major"
echo "  2. 打包发布: npm run release"
echo "  3. 推送代码: git push && git push --tags"
