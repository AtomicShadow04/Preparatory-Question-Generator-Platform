# 📚 AI-Powered Question Generation App

An intelligent web application that automatically generates assessment questions from uploaded documents using advanced AI and natural language processing. Perfect for educators, trainers, and content creators who need to quickly create comprehensive assessments.

## ✨ Features

### 🚀 Core Functionality

- **Document Upload**: Support for PDF, DOCX, DOC, and TXT files
- **AI-Powered Question Generation**: Uses OpenAI GPT models to create relevant questions
- **Multiple Question Types**: Radio options, checkboxes, yes/no, scaled ratings, and text responses
- **Assessment Organization**: Groups questions by learning outcomes and topics
- **Interactive Testing Interface**: User-friendly question display with real-time responses

### 🎯 Question Types Supported

- **Radio Options**: Single-choice questions with multiple options
- **Checkboxes**: Multiple selection questions
- **Yes/No**: Binary choice questions
- **Scaled**: Numeric range questions (1-10 scale)
- **Rating**: 1-5 star rating questions
- **Text Response**: Open-ended questions

### 🗄️ Data Management

- **SQLite Database**: Efficient storage of vector embeddings and document chunks
- **Vector Search**: Fast similarity search using embedded document chunks
- **Persistent Storage**: All documents and questions stored securely
- **Metadata Tracking**: File information, upload dates, and processing statistics

### 🎨 User Interface

- **Modern Design**: Clean, responsive interface built with Tailwind CSS
- **Drag & Drop**: Intuitive file upload experience
- **Progress Tracking**: Real-time feedback during document processing
- **Mobile Friendly**: Responsive design that works on all devices

## 🛠️ Technology Stack

### Frontend

- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Accessible component primitives
- **Lucide React**: Beautiful icons

### Backend

- **Next.js API Routes**: Serverless API endpoints
- **LangChain**: AI orchestration and prompt management
- **OpenAI GPT-4**: Advanced language model for question generation
- **SQLite**: Lightweight database for data persistence

### AI/ML

- **OpenAI Embeddings**: Text embeddings for semantic search
- **Recursive Text Splitting**: Intelligent document chunking
- **Prompt Engineering**: Optimized prompts for question generation

## 📋 Prerequisites

- Node.js 18+ and npm
- OpenAI API key
- SQLite3 (automatically installed)

## 🚀 Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd question-generation-app
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file in the root directory:

   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   ```

4. **Run the development server**

   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📖 Usage

### 1. Upload a Document

- Drag and drop or click to select a PDF, DOCX, DOC, or TXT file
- Maximum file size: 10MB
- The app will automatically process and chunk the document

### 2. Generate Questions

- Click "Upload and Generate Questions"
- The AI will analyze the document content
- Questions are generated based on learning outcomes and key concepts

### 3. Take the Assessment

- Navigate to the test page using the provided link
- Answer questions using the interactive interface
- Questions are organized by category for better assessment flow

### 4. Review Results

- Submit answers to see detailed feedback
- View performance analysis and recommendations
- Retake the assessment as needed

## 🔧 API Endpoints

### Document Management

- `POST /api/upload` - Upload and process documents
- `GET /api/upload` - Health check

### Question Generation

- `POST /api/questions` - Generate questions from processed documents
  ```json
  {
    "documentId": "doc_1234567890_file.pdf",
    "count": 10
  }
  ```

### Assessment Grading

- `POST /api/grade` - Grade submitted answers
- `GET /api/grade` - Health check

## 🗃️ Database Schema

The application uses SQLite with the following tables:

### `document_stores`

- `document_id` (TEXT, PRIMARY KEY)
- `original_content` (TEXT)
- `created_at` (DATETIME)
- `updated_at` (DATETIME)

### `vector_chunks`

- `id` (INTEGER, PRIMARY KEY)
- `document_id` (TEXT, FOREIGN KEY)
- `chunk_text` (TEXT)
- `chunk_index` (INTEGER)
- `embedding` (TEXT) - JSON string of vector embeddings
- `metadata` (TEXT) - JSON string of chunk metadata
- `created_at` (DATETIME)

## ⚙️ Configuration

### Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key (required)
- `NODE_ENV`: Environment mode (development/production)

### Document Processing Settings

- **Chunk Size**: 1000 characters
- **Overlap**: 200 characters
- **Embedding Model**: text-embedding-3-small
- **Language Model**: gpt-4o-mini

## 🏗️ Project Structure

```
my-app/
├── app/
│   ├── api/
│   │   ├── upload/route.ts      # Document upload endpoint
│   │   ├── questions/route.ts   # Question generation
│   │   ├── grade/route.ts       # Answer grading
│   │   └── test/route.ts        # Test utilities
│   ├── test/page.tsx            # Assessment interface
│   ├── page.tsx                 # Upload page
│   └── layout.tsx               # App layout
├── components/
│   ├── ui/                      # Reusable UI components
│   └── question-display.tsx     # Question rendering
├── lib/
│   ├── document-store.ts        # SQLite database service
│   └── utils.ts                 # Utility functions
├── data/                        # SQLite database files
├── uploads/                     # Temporary file storage
└── public/                      # Static assets
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Use TypeScript for all new code
- Follow the existing code style and patterns
- Add tests for new features
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI** for providing powerful language models
- **LangChain** for AI orchestration framework
- **Next.js** for the excellent React framework
- **Tailwind CSS** for beautiful styling utilities
- **Radix UI** for accessible component primitives

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/your-repo/issues) page
2. Create a new issue with detailed information
3. Contact the maintainers

## 🚀 Future Enhancements

- [ ] Support for additional file formats (PPT, XLS, etc.)
- [ ] Advanced question customization options
- [ ] Collaborative assessment creation
- [ ] Integration with learning management systems
- [ ] Analytics dashboard for assessment performance
- [ ] Multi-language support
- [ ] Question bank management
- [ ] Automated difficulty assessment
- [ ] Integration with external quiz platforms

---

**Made with ❤️ using Next.js, TypeScript, and AI**
