# 🌌 AuraAI — Behavioral Recommendation Intelligence

**A real-time multimodal recommendation platform** that analyzes how you browse and react to products using **on-device MediaPipe Face Mesh (468 landmarks)**, **smart embeddings**, and **dynamic taste profiling**.

> **Behavioral engagement analysis — not emotion detection.** All webcam processing happens locally in your browser.

![Stack](https://img.shields.io/badge/React%20%2B%20Vite-TypeScript-blue)
![Stack](https://img.shields.io/badge/MediaPipe%20Face%20Mesh-Real%20Face%20Tracking-22c55e)
![Stack](https://img.shields.io/badge/Firebase%20Auth-Google%20%7C%20GitHub%20%7C%20Email-FFCA28)


## Live Demo

[View AuraAI on Netlify](https://radiant-valkyrie-a20618.netlify.app)
[View AuraAI on Vercel.](https://aura-ai-auraai67.vercel.app)

## Features

- Firebase authentication with Google, GitHub, and Email/Password
- Secure local demo auth fallback when Firebase keys are missing
- Ecommerce-style product browsing grid
- Product detail drawer with engagement metrics
- Search and category filters
- Live webcam engagement tracker using MediaPipe Face Mesh
- Head pose, gaze direction, blink, and attention score
- Real-time recommendation carousel
- Explainable recommendations
- User taste profile with style persona and insights
- Aesthetic signature, color mood, price preference, brand/category affinity
- Analytics dashboard with charts, heatmaps, and session statistics
- Responsive modern dark UI with smooth animations

## Tech Stack

- React
- Vite
- TypeScript
- Tailwind CSS
- Framer Motion
- Recharts
- MediaPipe Face Landmarker
- Firebase Authentication
- Attribute-derived product embeddings
- Cosine similarity recommendation logic

## How It Works

AuraAI tracks product interactions such as dwell time, views, saved items, and engagement signals. When the webcam tracker is enabled, MediaPipe Face Landmarker runs in the browser to estimate face presence, head pose, gaze direction, and blink state.

These signals are combined into a behavioral engagement score. AuraAI then builds a weighted taste vector from the user's product interactions and uses cosine similarity to recommend similar products. The taste profile explains the user's dominant aesthetics, preferred categories, color mood, price range, and style persona.

## Getting Started


---
[![Netlify Status](https://api.netlify.com/api/v1/badges/d3f2ca80-1188-480d-bec5-f80d54db79c6/deploy-status)](https://app.netlify.com/projects/radiant-valkyrie-a20618/deploys)
## 🚀 Quick Start

```bash
npm install
cp .env.example .env
npm run dev

