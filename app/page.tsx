import { Button } from "@/components/ui/button";
import { Shield, Heart, UserCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[length:32px_32px]" />
      </div>
      
      <div className="container mx-auto px-4 py-8 relative">
        <nav className="flex justify-between items-center mb-16 animate-fade-in">
          <div className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-primary animate-float" />
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
              VictimVoice
            </span>
          </div>
          <div className="space-x-4">
            <Button variant="ghost" asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button className="bg-primary hover:bg-primary/90" asChild>
              <Link href="/login" className="group">
                Get Help Now
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </nav>

        <main>
          <div className="flex flex-col lg:flex-row items-center gap-12 mb-24">
            <div className="lg:w-1/2 space-y-6 animate-fade-in [animation-delay:200ms]">
              <h1 className="text-6xl font-bold leading-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary/90 to-primary/70">
                Your Voice Matters
              </h1>
              <p className="text-xl text-muted-foreground">
                A safe and anonymous platform for survivors to share their stories and seek support.
                We're here to listen, protect, and help you take action.
              </p>
              <div className="flex gap-4 pt-4">
                <Button size="lg" className="bg-primary hover:bg-primary/90" asChild>
                  <Link href="/login" className="group">
                    Share Your Story
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/about">Learn More</Link>
                </Button>
              </div>
            </div>
            <div className="lg:w-1/2 relative animate-float">
              <div className="relative w-full aspect-square max-w-md mx-auto">
                <Image
                  src="https://images.unsplash.com/photo-1544027993-37dbfe43562a?q=80&w=2070&auto=format&fit=crop"
                  alt="Supporting hands"
                  fill
                  className="object-cover rounded-2xl shadow-2xl"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent rounded-2xl" />
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-24">
            <div className="feature-card animate-scale-in [animation-delay:400ms]">
              <Shield className="h-12 w-12 text-primary mb-4" />
              <h2 className="text-xl font-semibold mb-2">Anonymous Reporting</h2>
              <p className="text-muted-foreground">
                Share your story safely and securely, knowing your identity is protected
              </p>
            </div>
            <div className="feature-card animate-scale-in [animation-delay:600ms]">
              <Heart className="h-12 w-12 text-primary mb-4" />
              <h2 className="text-xl font-semibold mb-2">Support Network</h2>
              <p className="text-muted-foreground">
                Connect with trained volunteers who are here to support and guide you
              </p>
            </div>
            <div className="feature-card animate-scale-in [animation-delay:800ms]">
              <UserCircle className="h-12 w-12 text-primary mb-4" />
              <h2 className="text-xl font-semibold mb-2">Take Action</h2>
              <p className="text-muted-foreground">
                Get help with next steps and resources to address your situation
              </p>
            </div>
          </div>

          <div className="text-center max-w-2xl mx-auto animate-fade-in [animation-delay:1000ms]">
            <h2 className="text-3xl font-bold mb-6">Ready to Take the First Step?</h2>
            <p className="text-muted-foreground mb-8">
              Your journey to healing starts here. We're committed to providing a safe space
              where your voice can be heard and your story can make a difference.
            </p>
            <Button size="lg" className="bg-primary hover:bg-primary/90" asChild>
              <Link href="/login" className="group">
                Get Started Now
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </main>

        <footer className="mt-24 text-center text-sm text-muted-foreground animate-fade-in [animation-delay:1200ms]">
          <p>© {new Date().getFullYear()} VictimVoice. All rights reserved.</p>
          <p className="mt-2">
            If you're in immediate danger, please call your local emergency services immediately.
          </p>
        </footer>
      </div>
    </div>
  );
}