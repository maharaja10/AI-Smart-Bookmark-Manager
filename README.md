# Simple Bookmark Manager

A full-stack web application for organizing and managing bookmarks with modern features like tag-based filtering, OpenGraph preview, dark/light mode, and AI-assisted tag suggestions.

## Features

### Core Features
- **User Authentication**
  - Sign up / Login with JWT and NextAuth
  - Password hashing with bcrypt

- **Bookmark Management**
  - Add new bookmarks (title, URL, tags, description)
  - View all bookmarks (for the logged-in user only)
  - Edit and delete bookmarks
  - Auto-fetch metadata from URLs

- **Organization**
  - Folder system for grouping bookmarks
  - Tag-based filtering and search
  - Search by title or URL

### Advanced Features
- **AI Tag Suggestion**
  - Auto-suggest tags based on URL metadata using OpenAI

- **Rich Previews**
  - Show preview using OpenGraph metadata (image + description)
  - Display favicon and site information

- **Dark/Light Mode**
  - Theme toggle with system preference support

- **Bookmark Sharing**
  - Public links for sharing bookmarks

- **Favorites & Read Later**
  - Save bookmarks to read later
  - Mark bookmarks as favorites

## Tech Stack

- **Frontend**: Next.js 14+ with App Router & React 18
- **Backend**: Next.js API Routes
- **Authentication**: NextAuth.js with JWT
- **Database**: MongoDB
- **ORM**: Mongoose
- **Styling**: Tailwind CSS
- **AI**: OpenAI API for tag suggestions

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- MongoDB (local or Atlas)
- OpenAI API key (optional, for AI tag suggestions)

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/simple-bookmark-manager.git
cd simple-bookmark-manager
```

2. Install dependencies
```bash
npm install
```

3. Create a `.env.local` file in the root directory with the following variables:
```
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/bookmark-manager
# Or use MongoDB Atlas:
# MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/bookmark-manager

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_key_here

# JWT Secret (for custom JWT implementation)
JWT_SECRET=your_jwt_secret_key_here

# OpenAI API Key (for AI tag suggestions)
OPENAI_API_KEY=your_openai_api_key_here
```

4. Start the development server
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/             # API Routes
│   │   ├── auth/            # Authentication pages
│   │   ├── dashboard/       # Dashboard pages
│   │   └── ...
│   ├── components/          # React components
│   │   ├── dashboard/       # Dashboard components
│   │   ├── ui/              # UI components
│   │   └── ...
│   ├── lib/                 # Utility functions
│   │   ├── mongodb.ts       # MongoDB connection
│   │   ├── auth.ts          # Auth configuration
│   │   └── ...
│   └── models/              # MongoDB models
│       ├── User.ts
│       ├── Bookmark.ts
│       └── Folder.ts
├── public/                  # Static files
└── ...
```

## License

This project is licensed under the MIT License. 