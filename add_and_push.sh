#!/bin/bash
# Initialize git and push to GitHub

set -e

cd "$(dirname "$0")"

# Init git
git init
git checkout -b main

# Create .gitignore
cat > .gitignore << 'EOF'
node_modules/
.DS_Store
*.log
EOF

# Add everything
git add .

# Commit
git commit -m "Initial commit: Snake Clash! game + Android wrapper"

# Add remote
git remote add origin git@github.com:fredfelix53/snake-clash.git

# Push
git push -u origin main --force

echo ""
echo "✅ Snake Clash! pushed to GitHub: https://github.com/fredfelix53/snake-clash"
