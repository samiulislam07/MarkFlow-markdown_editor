"use client";
import {
  Users,
  Brain,
  Target,
  Heart,
  Lightbulb,
  Code,
  Rocket,
  Globe,
  Award,
  Github,
  Twitter,
  Mail,
  ArrowRight,
  Star,
  Sparkles,
  Zap,
  Shield,
  Clock,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

export default function AboutPage() {

  const values = [
    {
      icon: Users,
      title: "Community First",
      description: "We build for our users, with our users. Every feature starts with listening to the community.",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: Lightbulb,
      title: "Innovation",
      description: "We push the boundaries of what's possible in document editing and collaborative writing.",
      color: "from-yellow-500 to-orange-500",
    },
    {
      icon: Shield,
      title: "Privacy & Security",
      description: "Your documents are yours. We use end-to-end encryption and never access your content.",
      color: "from-green-500 to-emerald-500",
    },
    {
      icon: Heart,
      title: "Open Source",
      description: "We believe in transparency and giving back to the developer community that supports us.",
      color: "from-red-500 to-pink-500",
    },
  ];

  const milestones = [
    {
      year: "Jan 2025",
      title: "The Beginning",
      description: "MarkFlow was born from frustration with existing markdown editors during research work.",
      icon: Rocket,
    },
    {
      year: "Mar 2025",
      title: "First Beta Launch",
      description: "Released beta version with LaTeX support. 1,000 users in the first month.",
      icon: Star,
    },
    {
      year: "Jun 2025",
      title: "Real-time Collaboration",
      description: "Launched revolutionary real-time editing. Grew to 50,000+ active users.",
      icon: Users,
    },
    {
      year: "Aug 2025",
      title: "AI Integration",
      description: "Introduced AI-powered writing assistance. Now serving 2M+ documents monthly.",
      icon: Brain,
    },
  ];

  const stats = [
    { label: "Happy Users", value: "50,000+", icon: Users },
    { label: "Documents Created", value: "2M+", icon: Code },
    { label: "Countries", value: "150+", icon: Globe },
    { label: "Uptime", value: "99.9%", icon: Clock },
    { label: "Team Members", value: "25+", icon: Heart },
    { label: "Open Source Contributions", value: "500+", icon: Github },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-40 right-20 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-spin-slow" />
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl animate-bounce" />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 mb-8 border border-white/20">
              <Sparkles className="w-5 h-5 text-yellow-400 mr-2" />
              <span className="text-white">Empowering creators since January 2025</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-8 text-white leading-tight">
              We&apos;re building the
              <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                future of writing
              </span>
            </h1>

            <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              MarkFlow started as a simple idea in January 2025: what if markdown editing could be as powerful as 
              it is beautiful? Today, we&apos;re a passionate team building tools that empower millions 
              of creators, researchers, and teams worldwide.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-6 max-w-4xl mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="text-center bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                  <div className="flex justify-center mb-2">
                    <stat.icon className="w-6 h-6 text-blue-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-sm text-gray-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="relative z-10 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center bg-blue-500/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6 border border-blue-500/20">
                  <Target className="w-4 h-4 text-blue-400 mr-2" />
                  <span className="text-blue-300 text-sm">Our Mission</span>
                </div>
                <h2 className="text-4xl font-bold text-white mb-6">
                  Democratizing powerful writing tools
                </h2>
                <p className="text-gray-300 text-lg mb-6 leading-relaxed">
                  We believe that everyone deserves access to professional-grade writing tools, 
                  regardless of their technical background or budget. MarkFlow bridges the gap 
                  between simplicity and power, making advanced features like LaTeX rendering 
                  and real-time collaboration accessible to all.
                </p>
                <p className="text-gray-300 text-lg leading-relaxed">
                  Our vision is a world where ideas flow freely, where collaboration knows no 
                  boundaries, and where the technical barriers to great writing simply don&apos;t exist.
                </p>
              </div>
              <div className="relative">
                <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm rounded-3xl p-8 border border-white/10">
                  <div className="grid grid-cols-2 gap-6">
                    {[
                      { icon: Zap, label: "Fast & Responsive", value: "< 100ms" },
                      { icon: Shield, label: "Secure by Design", value: "End-to-End" },
                      { icon: Globe, label: "Global Access", value: "24/7" },
                      { icon: TrendingUp, label: "Always Improving", value: "Weekly Updates" },
                    ].map((item, index) => (
                      <div key={index} className="text-center bg-white/5 rounded-2xl p-4">
                        <item.icon className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                        <div className="text-white font-semibold text-sm">{item.label}</div>
                        <div className="text-blue-300 text-xs">{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="relative z-10 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Our Core Values</h2>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto">
              These principles guide every decision we make and every line of code we write.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {values.map((value, index) => (
              <div
                key={index}
                className="group bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:bg-white/10 transition-all duration-300 transform hover:scale-105"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${value.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <value.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{value.title}</h3>
                <p className="text-gray-400 leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="relative z-10 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Our Journey</h2>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto">
              From a simple idea in January 2025 to serving millions of users worldwide in just 8 months.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
              
              {milestones.map((milestone, index) => (
                <div key={index} className={`relative flex items-center mb-12 ${index % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                  <div className={`w-1/2 ${index % 2 === 0 ? 'pr-8 text-right' : 'pl-8 text-left'}`}>
                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                      <div className="flex items-center mb-3">
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center ${index % 2 === 0 ? 'ml-auto mr-3' : 'mr-auto ml-3'}`}>
                          <milestone.icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="text-blue-300 font-semibold text-lg">{milestone.year}</div>
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">{milestone.title}</h3>
                      <p className="text-gray-400">{milestone.description}</p>
                    </div>
                  </div>
                  
                  {/* Timeline dot */}
                  <div className="absolute left-1/2 transform -translate-x-1/2 w-4 h-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full border-4 border-slate-900"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Recognition Section */}
      <section className="relative z-10 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Recognition & Awards</h2>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto">
              We&apos;re honored to be recognized by the communities and organizations we serve.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              { title: "Product Hunt", subtitle: "#1 Product of the Day", year: "2024" },
              { title: "GitHub", subtitle: "Trending Repository", year: "2024" },
              { title: "Dev Awards", subtitle: "Best Developer Tool", year: "2024" },
              { title: "TechCrunch", subtitle: "Startup Spotlight", year: "2025" },
            ].map((award, index) => (
              <div key={index} className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 text-center">
                <Award className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-1">{award.title}</h3>
                <p className="text-gray-300 text-sm mb-2">{award.subtitle}</p>
                <p className="text-blue-300 text-xs">{award.year}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-sm rounded-3xl p-12 border border-white/10">
            <h2 className="text-4xl font-bold text-white mb-6">Join Our Mission</h2>
            <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
              Whether you&apos;re a creator, researcher, or just someone who believes in better tools, 
              we&apos;d love to have you as part of the MarkFlow community.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
              <Link
                href="/sign-up"
                className="group px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl text-lg font-semibold hover:from-blue-600 hover:to-purple-600 transition-all shadow-2xl transform hover:scale-105"
              >
                Start Creating Today
                <ArrowRight className="inline-block ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/careers"
                className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-xl text-lg font-semibold hover:bg-white/20 transition-all border border-white/20"
              >
                Join Our Team
              </Link>
            </div>

            <div className="flex justify-center space-x-6">
              <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                <Github className="w-6 h-6" />
              </Link>
              <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                <Twitter className="w-6 h-6" />
              </Link>
              <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                <Mail className="w-6 h-6" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
