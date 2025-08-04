"use client";
import { useState, useEffect } from "react";
import "katex/dist/katex.min.css";
import { MathJax, MathJaxContext } from "better-react-mathjax";

import {
  Users,
  Brain,
  Calculator,
  FileText,
  Github,
  Twitter,
  Mail,
  ArrowRight,
  Star,
  Sparkles,
  Eye,
} from "lucide-react";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import GuestLoginButton from "@/components/ui/GuestLoginButton";

export default function Home() {
  const [currentFeature, setCurrentFeature] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % 4);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  //features and testimonials
  const features = [
    {
      icon: Calculator,
      title: "LaTeX Math Support",
      description:
        "Write complex mathematical equations with full LaTeX rendering",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: Eye,
      title: "Live Preview",
      description: "See your markdown rendered in real-time as you type",
      color: "from-purple-500 to-pink-500",
    },
    {
      icon: Users,
      title: "Real-time Collaboration",
      description: "Work together with your team in real-time",
      color: "from-green-500 to-emerald-500",
    },
    {
      icon: Brain,
      title: "AI-Powered Writing",
      description: "Get intelligent suggestions and auto-completion",
      color: "from-orange-500 to-red-500",
    },
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Research Scientist",
      avatar: "SC",
      content:
        "MarkFlow has revolutionized how I write research papers. The LaTeX support is flawless!",
    },
    {
      name: "Mike Rodriguez",
      role: "Technical Writer",
      avatar: "MR",
      content:
        "The real-time collaboration features make team documentation incredibly efficient.",
    },
    {
      name: "Dr. Emily Watson",
      role: "Professor",
      avatar: "EW",
      content:
        "My students love using MarkFlow for their assignments. The math rendering is perfect.",
    },
  ];

  const mathConfig = {
    loader: { load: ["input/tex", "output/chtml"] },
    tex: {
      inlineMath: [
        ["$", "$"],
        ["\\(", "\\)"],
      ],
      displayMath: [
        ["$$", "$$"],
        ["\\[", "\\]"],
      ],
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      {/* <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl animate-spin-slow" />
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-bounce" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
      </div> */}

      {/* Navigation */}
      <nav className="relative z-50 p-6 flex justify-between items-center container mx-auto">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">MarkFlow</h1>
        </div>
        <div>
          <SignedOut>
            <div className="flex items-center space-x-4">
              <Link
                href="/features"
                className="text-gray-300 hover:text-white transition-colors"
              >
                Features
              </Link>
              <Link
                href="/pricing"
                className="text-gray-300 hover:text-white transition-colors"
              >
                Pricing
              </Link>
              <GuestLoginButton />
              <Link
                href="/sign-in"
                className="bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-all border border-white/20"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg"
              >
                Sign Up
              </Link>
            </div>
          </SignedOut>
          <SignedIn>
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="text-gray-300 hover:text-white transition-colors"
              >
                Dashboard
              </Link>
              <UserButton afterSignOutUrl="/" />
            </div>
          </SignedIn>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 container mx-auto px-4 py-16">
        <div className="text-center mb-20">
          <div className="inline-flex items-center bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-8 border border-white/20">
            <Star className="w-4 h-4 text-yellow-400 mr-2" />
            <span className="text-white text-sm">
              New: AI-powered writing assistant
            </span>
          </div>

          <h1 className="text-6xl md:text-7xl font-bold mb-6 text-white leading-tight">
            The Future of
            <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent animate-pulse">
              Markdown Editing
            </span>
          </h1>

          <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            Create beautiful documents with LaTeX math, collaborate in
            real-time, and harness the power of AI. MarkFlow is the only editor
            you&#39;ll ever need.
          </p>

          <SignedOut>
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
              <Link
                href="/sign-up"
                className="group px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl text-lg font-semibold hover:from-blue-600 hover:to-purple-600 transition-all shadow-2xl hover:shadow-blue-500/25 transform hover:scale-105"
              >
                Start Creating Now
                <ArrowRight className="inline-block ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <div className="flex flex-col sm:flex-row gap-4">
                <GuestLoginButton />
                <Link
                  href="/demo"
                  className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-xl text-lg font-semibold hover:bg-white/20 transition-all border border-white/20 text-center"
                >
                  Watch Demo
                </Link>
              </div>
            </div>
          </SignedOut>

          <SignedIn>
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
              <Link
                href="/dashboard"
                className="group px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl text-lg font-semibold hover:from-blue-600 hover:to-purple-600 transition-all shadow-2xl transform hover:scale-105"
              >
                Go to Dashboard
                <ArrowRight className="inline-block ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/editor"
                className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-xl text-lg font-semibold hover:bg-white/20 transition-all border border-white/20"
              >
                New Document
              </Link>
            </div>
          </SignedIn>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-2xl mx-auto">
            {[
              { label: "Active Users", value: "50K+", icon: Users },
              { label: "Documents Created", value: "2M+", icon: FileText },
              { label: "Lines of LaTeX", value: "10M+", icon: Calculator },
              { label: "Teams", value: "5K+", icon: Sparkles },
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="flex justify-center mb-2">
                  <stat.icon className="w-6 h-6 text-blue-400" />
                </div>
                <div className="text-2xl font-bold text-white">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Features Section */}
        <section className="mb-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Everything you need to create amazing content
            </h2>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto">
              From mathematical equations to collaborative editing, MarkFlow has
              all the tools you need.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`group p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300 transform hover:scale-105 ${
                  currentFeature === index ? "ring-2 ring-blue-400" : ""
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                >
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Demo Preview */}
        <section className="mb-20">
          <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-8 border border-white/10">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-4">
                See MarkFlow in Action
              </h2>
              <p className="text-gray-300">
                Watch how easy it is to create beautiful documents
              </p>
            </div>

            <div className="bg-gray-900 rounded-2xl p-6 max-w-4xl mx-auto">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-400 text-sm ml-4">
                  MarkFlow Editor
                </span>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                {/* MathJax-based Markdown Input */}
                <MathJaxContext version={3} config={mathConfig}>
                  <div>
                    <div className="text-gray-400 text-sm mb-2">
                      Markdown Input
                    </div>
                    <div className="bg-gray-800 rounded-lg p-4 font-mono text-sm text-green-400">
                      <div># Quantum Mechanics</div>
                      <div className="mt-2">The Schrödinger equation:</div>
                      <div className="mt-2 text-blue-400">
                        <MathJax dynamic>
                          {
                            "\\[ i\\hbar\\frac{\\partial}{\\partial t}\\left|\\psi\\right\\rangle = \\hat{H}\\left|\\psi\\right\\rangle \\]"
                          }
                        </MathJax>
                      </div>
                    </div>
                  </div>
                </MathJaxContext>

                {/* Live Preview Block */}
                <div>
                  <div className="text-gray-400 text-sm mb-2">Live Preview</div>
                  <div className="bg-white rounded-lg p-4 text-gray-900">
                    <h1 className="text-2xl font-bold mb-2">
                      Quantum Mechanics
                    </h1>
                    <p className="mb-2">The Schrödinger equation:</p>
                    <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-500 font-mono text-center">
                      i ℏ ∂/∂t |ψ⟩ = Ĥ |ψ⟩
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="mb-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Loved by creators worldwide
            </h2>
            <p className="text-gray-300 text-lg">
              Join thousands of satisfied users who trust MarkFlow
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10"
              >
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold mr-4">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="text-white font-semibold">
                      {testimonial.name}
                    </div>
                    <div className="text-gray-400 text-sm">
                      {testimonial.role}
                    </div>
                  </div>
                </div>
                <p className="text-gray-300 italic">{testimonial.content}</p>
                <div className="flex mt-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 text-yellow-400 fill-current"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-sm rounded-3xl p-12 border border-white/10">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to transform your writing?
          </h2>
          <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
            Join thousands of writers, researchers, and teams who trust MarkFlow
            for their documentation needs.
          </p>

          <SignedOut>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                href="/sign-up"
                className="group px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl text-lg font-semibold hover:from-blue-600 hover:to-purple-600 transition-all shadow-2xl transform hover:scale-105"
              >
                Get Started Free
                <ArrowRight className="inline-block ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/contact"
                className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-xl text-lg font-semibold hover:bg-white/20 transition-all border border-white/20"
              >
                Contact Sales
              </Link>
            </div>
          </SignedOut>

          <SignedIn>
            <Link
              href="/editor"
              className="group inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl text-lg font-semibold hover:from-blue-600 hover:to-purple-600 transition-all shadow-2xl transform hover:scale-105"
            >
              Create Your First Document
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </SignedIn>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">MarkFlow</h3>
              </div>
              <p className="text-gray-400">
                The ultimate markdown editor for creators, researchers, and
                teams.
              </p>
              <div className="flex space-x-4 mt-4">
                <Github className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
                <Twitter className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
                <Mail className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
              </div>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link
                    href="/features"
                    className="hover:text-white transition-colors"
                  >
                    Features
                  </Link>
                </li>
                <li>
                  <Link
                    href="/pricing"
                    className="hover:text-white transition-colors"
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    href="/integrations"
                    className="hover:text-white transition-colors"
                  >
                    Integrations
                  </Link>
                </li>
                <li>
                  <Link
                    href="/api"
                    className="hover:text-white transition-colors"
                  >
                    API
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link
                    href="/about"
                    className="hover:text-white transition-colors"
                  >
                    About
                  </Link>
                </li>
                <li>
                  <Link
                    href="/blog"
                    className="hover:text-white transition-colors"
                  >
                    Blog
                  </Link>
                </li>
                <li>
                  <Link
                    href="/careers"
                    className="hover:text-white transition-colors"
                  >
                    Careers
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="hover:text-white transition-colors"
                  >
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link
                    href="/help"
                    className="hover:text-white transition-colors"
                  >
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link
                    href="/docs"
                    className="hover:text-white transition-colors"
                  >
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link
                    href="/community"
                    className="hover:text-white transition-colors"
                  >
                    Community
                  </Link>
                </li>
                <li>
                  <Link
                    href="/status"
                    className="hover:text-white transition-colors"
                  >
                    Status
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400">
              &copy; 2025 MarkFlow. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link
                href="/privacy"
                className="text-gray-400 hover:text-white transition-colors"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="text-gray-400 hover:text-white transition-colors"
              >
                Terms
              </Link>
              <Link
                href="/security"
                className="text-gray-400 hover:text-white transition-colors"
              >
                Security
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
