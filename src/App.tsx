import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, 
  Instagram, 
  Twitter, 
  Mail, 
  ExternalLink, 
  X, 
  Menu,
  ChevronRight,
  ArrowUpRight,
  Upload,
  Plus,
  Filter,
  Check,
  Sparkles,
  Loader2
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ArtPiece {
  id: string;
  title: string;
  category: string;
  year: string;
  image: string;
  description: string;
  tags?: string[];
  price?: string;
}

const INITIAL_ART_WORKS: ArtPiece[] = [
  {
    id: '1',
    title: 'NEON GENESIS',
    category: 'Digital Abstract',
    year: '2024',
    image: 'https://picsum.photos/seed/neon-abstract/1200/1600',
    description: 'An exploration of light and geometry in a post-digital landscape. This piece investigates the intersection of organic forms and synthetic luminescence.',
    tags: ['Abstract', 'Neon', 'Geometric'],
    price: '$450'
  },
  {
    id: '2',
    title: 'SILICON SOUL',
    category: 'Cybernetic Portrait',
    year: '2023',
    image: 'https://picsum.photos/seed/cyber-portrait/1200/1600',
    description: 'A study on the evolution of consciousness within digital substrates. The portrait captures the ephemeral nature of identity in the cloud.',
    tags: ['Portrait', 'Cyber', 'Human'],
    price: '$800'
  },
  {
    id: '3',
    title: 'ETHER FLOW',
    category: 'Generative Art',
    year: '2024',
    image: 'https://picsum.photos/seed/ether-flow/1600/1200',
    description: 'Fluid dynamics simulated through algorithmic constraints. Each curve is a result of mathematical precision meeting chaotic variables.',
    tags: ['Generative', 'Fluid', 'Math'],
    price: '$1,200'
  }
];

export default function App() {
  const [artWorks, setArtWorks] = useState<ArtPiece[]>([]);
  const [selectedArt, setSelectedArt] = useState<ArtPiece | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  
  // Form state
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    year: new Date().getFullYear().toString(),
    description: '',
    tags: '',
    price: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    fetchArt();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchArt = async () => {
    try {
      const res = await fetch('/api/art');
      if (res.ok) {
        const data = await res.json();
        setArtWorks(data.length > 0 ? data : INITIAL_ART_WORKS);
      } else {
        setArtWorks(INITIAL_ART_WORKS);
      }
    } catch (e) {
      setArtWorks(INITIAL_ART_WORKS);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    const data = new FormData();
    data.append('image', selectedFile);
    data.append('title', formData.title);
    data.append('category', formData.category);
    data.append('year', formData.year);
    data.append('description', formData.description);
    data.append('price', formData.price);
    
    const tagsArray = formData.tags.split(',').map(t => t.trim()).filter(t => t !== '');
    data.append('tags', JSON.stringify(tagsArray));

    try {
      const res = await fetch('/api/art', {
        method: 'POST',
        body: data,
      });

      if (res.ok) {
        await fetchArt();
        setIsPublishModalOpen(false);
        resetForm();
      }
    } catch (error) {
      console.error('Upload failed', error);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this piece?')) return;
    
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/art/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchArt();
        setSelectedArt(null);
      }
    } catch (error) {
      console.error('Delete failed', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleShare = (art: ArtPiece) => {
    const text = `Check out "${art.title}" by Aura Digital Art!`;
    const url = process.env.APP_URL || window.location.href;
    if (navigator.share) {
      navigator.share({ title: art.title, text, url });
    } else {
      navigator.clipboard.writeText(`${text} ${url}`);
      alert('Link copied to clipboard!');
    }
  };

  const generateAIDescription = async () => {
    if (!selectedFile) return;
    setIsGeneratingAI(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(selectedFile);
      });
      const base64Data = await base64Promise;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { inlineData: { data: base64Data, mimeType: selectedFile.type } },
              { text: "Analyze this digital artwork. Provide a poetic, editorial-style description (2-3 sentences) and 5 relevant tags (comma separated). Format your response as JSON with 'description' and 'tags' fields." }
            ]
          }
        ],
        config: { responseMimeType: "application/json" }
      });

      const result = JSON.parse(response.text || "{}");
      setFormData(prev => ({
        ...prev,
        description: result.description || prev.description,
        tags: result.tags ? (Array.isArray(result.tags) ? result.tags.join(', ') : result.tags) : prev.tags
      }));
    } catch (error) {
      console.error("AI Generation failed", error);
      alert("Failed to generate AI description. Please try again.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      category: '',
      year: new Date().getFullYear().toString(),
      description: '',
      tags: '',
      price: ''
    });
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const allTags = Array.from(new Set(['All', ...artWorks.flatMap(w => w.tags || [])]));
  const filteredWorks = activeFilter === 'All' 
    ? artWorks 
    : artWorks.filter(w => w.tags?.includes(activeFilter));

  return (
    <div className="min-h-screen bg-ink selection:bg-accent selection:text-ink">
      {/* Navigation */}
      <nav className={cn(
        "fixed top-0 left-0 w-full z-50 transition-all duration-500 px-6 py-4 flex justify-between items-center",
        scrolled ? "bg-ink/80 backdrop-blur-md border-b border-paper/10 py-3" : "bg-transparent"
      )}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
            <span className="text-ink font-display text-lg">A</span>
          </div>
          <span className="font-display text-xl tracking-wider uppercase">Aura</span>
        </div>

        <div className="hidden md:flex items-center gap-12">
          {['Gallery', 'About', 'Contact'].map((item) => (
            <a 
              key={item} 
              href={`#${item.toLowerCase()}`}
              className="text-xs uppercase tracking-[0.2em] font-semibold hover:text-accent transition-colors"
            >
              {item}
            </a>
          ))}
          <button 
            onClick={() => setIsPublishModalOpen(true)}
            className="px-6 py-2 bg-accent text-ink rounded-full text-xs uppercase tracking-widest font-bold hover:bg-paper transition-all duration-300 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Publish Art
          </button>
        </div>

        <button 
          className="md:hidden text-paper"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X /> : <Menu />}
        </button>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-ink pt-24 px-8 flex flex-col gap-8 md:hidden"
          >
            {['Gallery', 'About', 'Contact'].map((item) => (
              <a 
                key={item} 
                href={`#${item.toLowerCase()}`}
                onClick={() => setIsMenuOpen(false)}
                className="text-4xl font-display uppercase tracking-tight"
              >
                {item}
              </a>
            ))}
            <button 
              onClick={() => {
                setIsMenuOpen(false);
                setIsPublishModalOpen(true);
              }}
              className="w-full py-4 bg-accent text-ink rounded-xl text-lg uppercase tracking-widest font-bold"
            >
              Publish Art
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <header className="relative h-screen flex flex-col justify-center items-center overflow-hidden px-6">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://picsum.photos/seed/aura-hero/1920/1080?blur=10" 
            className="w-full h-full object-cover opacity-30"
            alt="Hero Background"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/20 via-ink/60 to-ink" />
        </div>

        <div className="relative z-10 text-center max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="text-accent text-xs uppercase tracking-[0.4em] font-bold mb-6 block">
              Digital Art Portfolio
            </span>
            <h1 className="text-[15vw] md:text-[12vw] font-display leading-[0.85] uppercase tracking-tighter mb-8">
              Aura <br />
              <span className="text-stroke">Gallery</span>
            </h1>
            <p className="max-w-xl mx-auto text-paper/60 font-serif italic text-lg md:text-xl leading-relaxed">
              "Where the digital pulse meets human emotion. A collection of generative landscapes and cybernetic visions."
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
            className="mt-16"
          >
            <a href="#gallery" className="group flex flex-col items-center gap-4">
              <span className="text-[10px] uppercase tracking-[0.5em] text-paper/40 group-hover:text-accent transition-colors">Scroll to Explore</span>
              <div className="w-[1px] h-16 bg-gradient-to-b from-accent to-transparent" />
            </a>
          </motion.div>
        </div>
      </header>

      {/* Gallery Section */}
      <section id="gallery" className="py-32 px-6 max-w-[1600px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
          <div className="max-w-2xl">
            <h2 className="text-5xl md:text-7xl font-display uppercase mb-6">Selected <br />Works</h2>
            <p className="text-paper/50 font-serif text-lg">A curated selection of digital explorations from 2023-2024.</p>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <Filter className="w-4 h-4 text-accent mr-2" />
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setActiveFilter(tag)}
                className={cn(
                  "text-[10px] uppercase tracking-widest px-4 py-2 rounded-full border transition-all",
                  activeFilter === tag 
                    ? "bg-accent text-ink border-accent font-bold" 
                    : "border-paper/20 text-paper/50 hover:border-paper/60"
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
          {filteredWorks.map((work, index) => (
            <motion.div 
              key={work.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group cursor-pointer"
              onClick={() => setSelectedArt(work)}
            >
              <div className="relative aspect-[3/4] overflow-hidden mb-6 bg-paper/5">
                <img 
                  src={work.image} 
                  alt={work.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-ink/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-paper/10 backdrop-blur-md border border-paper/20 flex items-center justify-center scale-75 group-hover:scale-100 transition-transform duration-500">
                    <ArrowUpRight className="text-paper" />
                  </div>
                </div>
                <div className="absolute top-4 left-4">
                  <span className="text-[10px] uppercase tracking-widest bg-ink/80 backdrop-blur-md px-3 py-1 rounded-full border border-paper/10">
                    {work.year}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-display uppercase tracking-tight group-hover:text-accent transition-colors">{work.title}</h3>
                  <p className="text-xs uppercase tracking-[0.2em] text-paper/40 mt-1">{work.category}</p>
                </div>
                <ChevronRight className="w-5 h-5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-32 bg-paper/5 border-y border-paper/10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="relative">
            <div className="aspect-square bg-accent/20 rounded-3xl overflow-hidden">
              <img 
                src="https://picsum.photos/seed/artist-profile/800/800" 
                className="w-full h-full object-cover mix-blend-overlay grayscale hover:grayscale-0 transition-all duration-700"
                alt="Artist Profile"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-ink border border-paper/10 p-6 rounded-2xl hidden md:block">
              <span className="text-[10px] uppercase tracking-widest text-accent font-bold mb-4 block">Artist Statement</span>
              <p className="text-[11px] leading-relaxed text-paper/60 font-serif italic">
                "I believe digital art is the new frontier of human expression. My work aims to bridge the gap between the cold logic of machines and the warmth of the human spirit."
              </p>
            </div>
          </div>
          <div>
            <span className="text-accent text-xs uppercase tracking-[0.4em] font-bold mb-6 block">The Visionary</span>
            <h2 className="text-5xl md:text-7xl font-display uppercase mb-8">Creative <br />Intelligence</h2>
            <div className="space-y-6 text-paper/70 text-lg font-serif">
              <p>
                Aura is the digital moniker of a multidisciplinary artist pushing the boundaries of generative systems and digital sculpture. With over a decade of experience in traditional fine arts, the transition to digital was a natural evolution.
              </p>
              <p>
                Each piece in this gallery is a conversation between human intent and algorithmic possibility. By leveraging custom-built tools and neural networks, Aura creates worlds that feel both alien and intimately familiar.
              </p>
            </div>
            <div className="mt-12 flex gap-8">
              <div className="flex flex-col">
                <span className="text-3xl font-display text-accent">50+</span>
                <span className="text-[10px] uppercase tracking-widest opacity-40">Exhibitions</span>
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-display text-accent">12</span>
                <span className="text-[10px] uppercase tracking-widest opacity-40">Awards</span>
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-display text-accent">2024</span>
                <span className="text-[10px] uppercase tracking-widest opacity-40">Current Era</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-6xl md:text-9xl font-display uppercase mb-12 tracking-tighter">Let's <br />Connect</h2>
          <p className="text-xl md:text-2xl text-paper/60 font-serif mb-16 max-w-2xl mx-auto">
            Available for commissions, collaborations, and digital art consulting.
          </p>
          
          <div className="flex flex-wrap justify-center gap-6 mb-20">
            <a href="mailto:hello@aura.art" className="group flex items-center gap-3 px-8 py-4 bg-paper text-ink rounded-full font-bold uppercase text-sm tracking-widest hover:bg-accent transition-colors">
              <Mail className="w-4 h-4" />
              Send an Email
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
            <div className="flex gap-4">
              <button className="w-14 h-14 rounded-full border border-paper/20 flex items-center justify-center hover:bg-paper hover:text-ink transition-all">
                <Instagram className="w-5 h-5" />
              </button>
              <button className="w-14 h-14 rounded-full border border-paper/20 flex items-center justify-center hover:bg-paper hover:text-ink transition-all">
                <Twitter className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="pt-20 border-t border-paper/10 flex flex-col md:flex-row justify-between items-center gap-8 text-[10px] uppercase tracking-[0.3em] opacity-40">
            <span>&copy; 2024 Aura Digital Art</span>
            <div className="flex gap-8">
              <a href="#" className="hover:text-accent">Privacy Policy</a>
              <a href="#" className="hover:text-accent">Terms of Service</a>
            </div>
            <span>Built with Passion & Pixels</span>
          </div>
        </div>
      </section>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedArt && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10"
          >
            <div 
              className="absolute inset-0 bg-ink/95 backdrop-blur-xl"
              onClick={() => setSelectedArt(null)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-6xl bg-ink border border-paper/10 rounded-3xl overflow-hidden flex flex-col lg:flex-row max-h-[90vh]"
            >
              <button 
                className="absolute top-6 right-6 z-10 w-10 h-10 rounded-full bg-ink/50 backdrop-blur-md border border-paper/10 flex items-center justify-center hover:bg-accent hover:text-ink transition-all"
                onClick={() => setSelectedArt(null)}
              >
                <X className="w-5 h-5" />
              </button>

              <div className="lg:w-3/5 h-[40vh] lg:h-auto bg-paper/5">
                <img 
                  src={selectedArt.image} 
                  alt={selectedArt.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="lg:w-2/5 p-8 md:p-12 overflow-y-auto flex flex-col">
                <div className="mb-8">
                  <span className="text-accent text-xs uppercase tracking-[0.4em] font-bold mb-4 block">
                    {selectedArt.category} &bull; {selectedArt.year}
                  </span>
                  <h2 className="text-4xl md:text-5xl font-display uppercase mb-6 leading-none">{selectedArt.title}</h2>
                  <div className="flex items-center gap-4 mb-6">
                    {selectedArt.price && (
                      <span className="text-2xl font-display text-accent">{selectedArt.price}</span>
                    )}
                    <button 
                      onClick={() => handleShare(selectedArt)}
                      className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-paper/40 hover:text-paper transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Share
                    </button>
                    <button 
                      onClick={() => handleDelete(selectedArt.id)}
                      disabled={isDeleting}
                      className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-red-500/60 hover:text-red-500 transition-colors disabled:opacity-50"
                    >
                      <X className="w-3 h-3" />
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                  <p className="text-paper/70 font-serif text-lg leading-relaxed">
                    {selectedArt.description}
                  </p>
                  {selectedArt.tags && (
                    <div className="flex flex-wrap gap-2 mt-6">
                      {selectedArt.tags.map(tag => (
                        <span key={tag} className="text-[10px] uppercase tracking-widest px-3 py-1 bg-paper/10 rounded-full border border-paper/10">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-auto space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-paper/5 border border-paper/10 rounded-xl">
                      <span className="text-[10px] uppercase tracking-widest opacity-40 block mb-1">Dimensions</span>
                      <span className="text-sm font-mono">4000 x 6000 PX</span>
                    </div>
                    <div className="p-4 bg-paper/5 border border-paper/10 rounded-xl">
                      <span className="text-[10px] uppercase tracking-widest opacity-40 block mb-1">Format</span>
                      <span className="text-sm font-mono">PNG / NFT</span>
                    </div>
                  </div>
                  
                  <button className="w-full py-4 bg-accent text-ink font-bold uppercase text-xs tracking-[0.3em] rounded-xl hover:bg-paper transition-colors flex items-center justify-center gap-2">
                    Inquire for Purchase
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Publish Modal */}
      <AnimatePresence>
        {isPublishModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10"
          >
            <div 
              className="absolute inset-0 bg-ink/95 backdrop-blur-xl"
              onClick={() => setIsPublishModalOpen(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-ink border border-paper/10 rounded-3xl overflow-hidden p-8 md:p-12 max-h-[90vh] overflow-y-auto"
            >
              <button 
                className="absolute top-6 right-6 z-10 w-10 h-10 rounded-full bg-ink/50 backdrop-blur-md border border-paper/10 flex items-center justify-center hover:bg-accent hover:text-ink transition-all"
                onClick={() => setIsPublishModalOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-4xl font-display uppercase mb-8">Publish Artwork</h2>
              
              <form onSubmit={handlePublish} className="space-y-6">
                <div 
                  className={cn(
                    "relative aspect-video rounded-2xl border-2 border-dashed border-paper/20 flex flex-col items-center justify-center cursor-pointer hover:border-accent transition-all overflow-hidden",
                    previewUrl && "border-solid border-accent"
                  )}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {previewUrl ? (
                    <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-paper/20 mb-4" />
                      <span className="text-xs uppercase tracking-widest text-paper/40">Drop artwork or click to upload</span>
                    </>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleFileChange}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-paper/40 ml-2">Title</label>
                    <input 
                      type="text" 
                      required
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      className="w-full bg-paper/5 border border-paper/10 rounded-xl px-4 py-3 text-sm focus:border-accent outline-none transition-all"
                      placeholder="e.g. NEON GENESIS"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-paper/40 ml-2">Category</label>
                    <input 
                      type="text" 
                      required
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                      className="w-full bg-paper/5 border border-paper/10 rounded-xl px-4 py-3 text-sm focus:border-accent outline-none transition-all"
                      placeholder="e.g. Digital Abstract"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-paper/40 ml-2">Price (optional)</label>
                    <input 
                      type="text" 
                      value={formData.price}
                      onChange={e => setFormData({...formData, price: e.target.value})}
                      className="w-full bg-paper/5 border border-paper/10 rounded-xl px-4 py-3 text-sm focus:border-accent outline-none transition-all"
                      placeholder="e.g. $450"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-paper/40 ml-2">Year</label>
                    <input 
                      type="text" 
                      required
                      value={formData.year}
                      onChange={e => setFormData({...formData, year: e.target.value})}
                      className="w-full bg-paper/5 border border-paper/10 rounded-xl px-4 py-3 text-sm focus:border-accent outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-paper/40 ml-2">Tags (comma separated)</label>
                  <input 
                    type="text" 
                    value={formData.tags}
                    onChange={e => setFormData({...formData, tags: e.target.value})}
                    className="w-full bg-paper/5 border border-paper/10 rounded-xl px-4 py-3 text-sm focus:border-accent outline-none transition-all"
                    placeholder="Abstract, Neon, 2024"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-2">
                    <label className="text-[10px] uppercase tracking-widest text-paper/40">Description</label>
                    <button 
                      type="button"
                      onClick={generateAIDescription}
                      disabled={isGeneratingAI || !selectedFile}
                      className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-accent hover:text-paper transition-colors disabled:opacity-50"
                    >
                      {isGeneratingAI ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      Generate with AI
                    </button>
                  </div>
                  <textarea 
                    required
                    rows={4}
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full bg-paper/5 border border-paper/10 rounded-xl px-4 py-3 text-sm focus:border-accent outline-none transition-all resize-none"
                    placeholder="Describe the inspiration behind this piece..."
                  />
                </div>

                <button 
                  type="submit"
                  disabled={uploading || !selectedFile}
                  className="w-full py-4 bg-accent text-ink font-bold uppercase text-xs tracking-[0.3em] rounded-xl hover:bg-paper transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {uploading ? "Publishing..." : "Publish to Gallery"}
                  {!uploading && <Check className="w-4 h-4" />}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
