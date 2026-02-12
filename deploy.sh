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
    
    read -p "Enter Xless project name: " "project_name"
    vercel project add "$project_name"

    # Required
    vercel env add IMGBB_API_KEY

    # Notification channels (at least one required)
    vercel env add SLACK_INCOMING_WEBHOOK
    vercel env add DISCORD_WEBHOOK_URL

    # Email fallback (optional)
    vercel env add EMAIL_HOST
    vercel env add EMAIL_PORT
    vercel env add EMAIL_USER
    vercel env add EMAIL_PASS
    vercel env add EMAIL_FROM
    vercel env add EMAIL_TO

    vercel deploy

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
    echo "Email fallback (optional):"
    echo "  - EMAIL_HOST=smtp.gmail.com"
    echo "  - EMAIL_PORT=587"
    echo "  - EMAIL_USER"
    echo "  - EMAIL_PASS"
    echo "  - EMAIL_FROM"
    echo "  - EMAIL_TO"
    
else
    echo "Invalid choice. Exiting."
    exit 1
fi
