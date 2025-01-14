# TruckTetris v2

TruckTetris v2 is an intelligent logistics management platform that optimizes truck loading patterns using AI. The system processes CSV order files, extracts relevant information, and generates efficient loading plans while considering various constraints and safety requirements.

## Case Study: Moran Logistics - Target Cardboard Supply Chain
The original TruckTetris was built for Moran Logistics to optimize their cardboard supply chain operations for Target stores. While the system showed promise, it proved overly complex for their needs. The key insight was that users primarily worked with CSV exports rather than PDFs, leading to the development of TruckTetris v2.

## Key Differences from v1
- Removed PDF processing in favor of direct CSV uploads
- Simplified architecture by removing Supabase, AWS Textract, and other complex infrastructure
- Streamlined UI focused on chat-based interaction
- Faster loading plan generation with reduced processing overhead
- Lower operational costs and maintenance requirements

## Key Features

### Order Processing
- Direct CSV file upload and processing
- Automatic item validation against master database
- Unit conversion handling (cases, rolls, etc.)
- Missing item information collection

### AI-Powered Loading Optimization
Uses Claude AI to generate optimal loading patterns considering:
- Truck dimensions and constraints
- Pallet sizes and quantities
- Stacking rules and restrictions
- Safety requirements and spacing

### User Interface
- Chat-based interaction with AI assistant
- Drag-and-drop CSV upload
- Real-time loading plan generation
- Dark mode support
- Mobile-responsive design

## Tech Stack

### Frontend
- Next.js 15.1
- React 19
- Tailwind CSS
- Radix UI Components

### Backend
- Next.js API Routes
- Anthropic Claude API (Loading Optimization)

## Architecture
The application follows a simplified architecture:

- Frontend Layer: Next.js application handling UI and client-side logic
- API Layer: Next.js API routes for CSV processing and AI communication
- Optimization Layer: Claude AI for loading pattern generation

## Creator
Built by Anthony Campos
[GitHub](https://github.com/yourusername)