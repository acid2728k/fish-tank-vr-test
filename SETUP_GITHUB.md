# GitHub Repository Setup Instructions

## Step 1: Create Repository on GitHub

1. Open https://github.com/new
2. Repository name: `fish-tank-vr-test`
3. Description (optional): "Fish Tank VR prototype with Quad Reprojection"
4. Choose **Public** or **Private** (your choice)
5. **DO NOT** add README, .gitignore, or license (we already added them)
6. Click **"Create repository"**

## Step 2: Connect Local Repository to GitHub

After creating the repository, GitHub will show you commands. Execute them in terminal:

```bash
cd "/Users/sergys/Desktop/Cursor App - Rep/fish-tank-vr2"

# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/fish-tank-vr-test.git

# Or if using SSH:
# git remote add origin git@github.com:YOUR_USERNAME/fish-tank-vr-test.git

# Rename branch to main (if needed)
git branch -M main

# Push code to GitHub
git push -u origin main
```

## Alternative Method (via GitHub Web Interface)

If you already created a repository with README, execute:

```bash
cd "/Users/sergys/Desktop/Cursor App - Rep/fish-tank-vr2"

# Add remote
git remote add origin https://github.com/YOUR_USERNAME/fish-tank-vr-test.git

# Rename branch
git branch -M main

# Get changes from GitHub (if README exists there)
git pull origin main --allow-unrelated-histories

# Push code
git push -u origin main
```

## Verification

After executing commands, open https://github.com/YOUR_USERNAME/fish-tank-vr-test and verify that all files are uploaded.
