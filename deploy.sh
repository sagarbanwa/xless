#!/bin/bash

echo "Xless Deployment Script"
echo "========================"
echo ""
echo "Choose deployment platform:"
echo "1) Vercel"
echo "2) Netlify"
read -p "Enter choice (1 or 2): " platform

if [ "$platform" == "1" ]; then
    echo ""
    echo "Deploying to Vercel..."
    echo ""
    
    # Link project first (this creates and connects the project)
    echo "Step 1: Linking project to Vercel..."
    vercel link
    
    echo ""
    echo "Step 2: Adding environment variables..."
    echo "(Press Enter to skip any you don't want to set)"
    echo ""

    # Required
    vercel env add IMGBB_API_KEY production

    # Notification channels
    vercel env add DISCORD_WEBHOOK_URL production
    vercel env add SLACK_INCOMING_WEBHOOK production

    # Email config
    vercel env add EMAIL_HOST production
    vercel env add EMAIL_PORT production
    vercel env add EMAIL_USER production
    vercel env add EMAIL_PASS production
    vercel env add EMAIL_FROM production
    vercel env add EMAIL_TO production

    echo ""
    echo "Step 3: Deploying..."
    vercel deploy --prod

elif [ "$platform" == "2" ]; then
    echo ""
    echo "Deploying to Netlify..."
    echo ""
    echo "Make sure you have Netlify CLI installed: npm install -g netlify-cli"
    echo ""
    
    # Deploy to Netlify
    netlify deploy --prod
    
    echo ""
    echo "Now set environment variables in Netlify dashboard:"
    echo "https://app.netlify.com/ -> Your Site -> Site settings -> Environment variables"
    echo ""
    echo "Required variables:"
    echo "  - IMGBB_API_KEY"
    echo ""
    echo "Notification channels (at least one):"
    echo "  - SLACK_INCOMING_WEBHOOK"
    echo "  - DISCORD_WEBHOOK_URL"
    echo ""
    echo "Email (configure your SMTP):"
    echo "  - EMAIL_HOST (e.g. Gmail, Outlook, etc.)"
    echo "  - EMAIL_PORT (e.g. 587)"
    echo "  - EMAIL_USER"
    echo "  - EMAIL_PASS"
    echo "  - EMAIL_FROM"
    echo "  - EMAIL_TO"
    
else
    echo "Invalid choice. Exiting."
    exit 1
fi
