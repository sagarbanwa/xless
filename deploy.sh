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
    
    # Check if Netlify CLI is installed
    if ! command -v netlify &> /dev/null; then
        echo "Netlify CLI not found. Installing..."
        npm install -g netlify-cli
    fi

    # Install dependencies
    echo "Installing dependencies..."
    npm install

    # Step 1: Link site
    echo ""
    echo "Step 1: Linking site to Netlify..."
    netlify link
    
    # Step 2: Environment variables
    echo ""
    echo "Step 2: Environment variables"
    echo ""

    if [ -f ".env" ]; then
        echo "✅ Found existing .env file with the following config:"
        echo "────────────────────────────────────────"
        while IFS='=' read -r key value; do
            # Skip empty lines and comments
            [[ -z "$key" || "$key" == \#* ]] && continue
            # Mask sensitive values
            if [[ "$key" == *"PASS"* || "$key" == *"KEY"* || "$key" == *"WEBHOOK"* ]]; then
                masked="${value:0:4}****${value: -4}"
                echo "  $key = $masked"
            else
                echo "  $key = $value"
            fi
        done < .env
        echo "────────────────────────────────────────"
        echo ""
        read -p "Use existing .env values? (Y/n): " use_existing
        
        if [[ "$use_existing" != "n" && "$use_existing" != "N" ]]; then
            echo ""
            echo "Importing .env to Netlify..."
            netlify env:import .env
            echo "✅ Environment variables imported!"
        else
            echo ""
            echo "Enter new values (leave blank to skip):"
            echo ""
            read -p "IMGBB_API_KEY: " val && [ -n "$val" ] && netlify env:set IMGBB_API_KEY "$val"
            read -p "DISCORD_WEBHOOK_URL: " val && [ -n "$val" ] && netlify env:set DISCORD_WEBHOOK_URL "$val"
            read -p "SLACK_INCOMING_WEBHOOK: " val && [ -n "$val" ] && netlify env:set SLACK_INCOMING_WEBHOOK "$val"
            read -p "EMAIL_HOST: " val && [ -n "$val" ] && netlify env:set EMAIL_HOST "$val"
            read -p "EMAIL_PORT [587]: " val; val=${val:-587} && netlify env:set EMAIL_PORT "$val"
            read -p "EMAIL_USER: " val && [ -n "$val" ] && netlify env:set EMAIL_USER "$val"
            read -p "EMAIL_PASS: " val && [ -n "$val" ] && netlify env:set EMAIL_PASS "$val"
            read -p "EMAIL_FROM: " val && [ -n "$val" ] && netlify env:set EMAIL_FROM "$val"
            read -p "EMAIL_TO: " val && [ -n "$val" ] && netlify env:set EMAIL_TO "$val"
        fi
    else
        echo "⚠️  No .env file found."
        echo "Enter values manually (leave blank to skip):"
        echo ""
        read -p "IMGBB_API_KEY: " val && [ -n "$val" ] && netlify env:set IMGBB_API_KEY "$val"
        read -p "DISCORD_WEBHOOK_URL: " val && [ -n "$val" ] && netlify env:set DISCORD_WEBHOOK_URL "$val"
        read -p "SLACK_INCOMING_WEBHOOK: " val && [ -n "$val" ] && netlify env:set SLACK_INCOMING_WEBHOOK "$val"
        read -p "EMAIL_HOST: " val && [ -n "$val" ] && netlify env:set EMAIL_HOST "$val"
        read -p "EMAIL_PORT [587]: " val; val=${val:-587} && netlify env:set EMAIL_PORT "$val"
        read -p "EMAIL_USER: " val && [ -n "$val" ] && netlify env:set EMAIL_USER "$val"
        read -p "EMAIL_PASS: " val && [ -n "$val" ] && netlify env:set EMAIL_PASS "$val"
        read -p "EMAIL_FROM: " val && [ -n "$val" ] && netlify env:set EMAIL_FROM "$val"
        read -p "EMAIL_TO: " val && [ -n "$val" ] && netlify env:set EMAIL_TO "$val"
    fi
    
    # Step 3: Deploy
    echo ""
    echo "Step 3: Deploying to production..."
    netlify deploy --prod
    
else
    echo "Invalid choice. Exiting."
    exit 1
fi
