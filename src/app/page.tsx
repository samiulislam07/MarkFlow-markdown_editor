export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-5xl font-bold text-center mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
          MarkFlow
        </h1>
        <p className="text-xl text-center text-gray-600 mb-12">
          The collaborative Markdown editor with LaTeX, real-time sync, and AI.
        </p>
        <div className="flex justify-center gap-4">
          <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            Get Started
          </button>
          <button className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
            Learn More
          </button>
        </div>
      </div>
    </main>
  )
}