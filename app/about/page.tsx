import { Button } from "@/components/ui/button";
import { Shield, Heart, Users, ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary">
      <div className="container mx-auto px-4 py-8">
        <nav className="flex justify-between items-center mb-16 animate-fade-in">
          <Link href="/" className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">VictimVoice</span>
          </Link>
          <Button className="bg-primary hover:bg-primary/90" asChild>
            <Link href="/login">Get Help Now</Link>
          </Button>
        </nav>

        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16 animate-fade-in">
            <h1 className="text-4xl font-bold mb-6">About VictimVoice</h1>
            <p className="text-xl text-muted-foreground">
              Empowering survivors to speak up and find support in a safe, anonymous environment.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 mb-16">
            <div className="relative h-[400px] animate-fade-in">
              <Image
                src="https://images.unsplash.com/photo-1531206715517-5c0ba140b2b8?q=80&w=2070&auto=format&fit=crop"
                alt="Supporting community"
                fill
                className="object-cover rounded-2xl"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent rounded-2xl" />
            </div>

            <div className="space-y-6 animate-fade-in [animation-delay:200ms]">
              <h2 className="text-3xl font-bold">Our Mission</h2>
              <p className="text-muted-foreground">
                VictimVoice was created with a singular purpose: to provide a safe haven for 
                those who have experienced abuse or harassment. We believe that every voice 
                deserves to be heard, and every story matters in the journey toward healing 
                and justice.
              </p>
              <p className="text-muted-foreground">
                Our platform connects survivors with dedicated volunteers who provide support, 
                guidance, and resources while maintaining complete anonymity and confidentiality.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="feature-card animate-scale-in">
              <Shield className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Safe & Secure</h3>
              <p className="text-muted-foreground">
                Your privacy and security are our top priorities. All reports are encrypted 
                and anonymized.
              </p>
            </div>
            <div className="feature-card animate-scale-in [animation-delay:200ms]">
              <Heart className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Compassionate Support</h3>
              <p className="text-muted-foreground">
                Our trained volunteers provide empathetic support and guidance throughout 
                your journey.
              </p>
            </div>
            <div className="feature-card animate-scale-in [animation-delay:400ms]">
              <Users className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Community Action</h3>
              <p className="text-muted-foreground">
                Together, we work to create awareness and prevent future incidents of abuse.
              </p>
            </div>
          </div>

          <div className="text-center bg-card rounded-2xl p-8 shadow-lg animate-fade-in [animation-delay:600ms]">
            <h2 className="text-3xl font-bold mb-6">Ready to Share Your Story?</h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              Take the first step towards healing. Our platform provides a safe space where 
              you can share your experience and connect with supportive volunteers who are 
              here to help.
            </p>
            <Button size="lg" className="bg-primary hover:bg-primary/90" asChild>
              <Link href="/login" className="group">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </div>

        <footer className="mt-16 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} VictimVoice. All rights reserved.</p>
          <p className="mt-2">
            If you're in immediate danger, please call your local emergency services immediately.
          </p>
        </footer>
      </div>
    </div>
  );
}