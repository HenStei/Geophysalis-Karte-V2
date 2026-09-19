import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Globe, Camera, Heart } from 'lucide-react';

export default function About() {
  return (
    <div className="min-h-[100dvh] bg-[#f3f4f6] w-full overflow-y-auto">
      <div className="max-w-3xl mx-auto p-4 sm:p-8 pt-8 sm:pt-16 pb-20">
        
        {/* Navigation */}
        <Link to="/" className="inline-flex items-center text-blue-600 font-bold hover:text-blue-800 transition mb-8 bg-white px-4 py-2 rounded-xl shadow-sm">
          <ArrowLeft size={20} className="mr-2" /> Zurück zur Karte
        </Link>

        {/* Hero Section */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-8 border border-gray-100">
          <div className="h-48 sm:h-64 bg-blue-600 relative overflow-hidden flex items-center justify-center">
            {/* Placeholder for Hero Image */}
            <div className="absolute inset-0 bg-black/20 z-10"></div>
            <Globe size={120} className="text-white/20 absolute -right-10 -bottom-10" />
            <h1 className="relative z-20 text-4xl sm:text-5xl font-black text-white text-center px-4 tracking-tight">
              The Story of<br/>Geophysalis
            </h1>
          </div>
          
          <div className="p-6 sm:p-10">
            <p className="text-lg text-gray-700 leading-relaxed font-medium mb-6">
              Welcome to the global Geophysalis project. This space is reserved for the full story of how this sticker movement started, where it is heading, and how you can be a part of it.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-10">
              <div className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-2xl">
                <Globe size={32} className="text-blue-500 mb-3" />
                <h3 className="font-bold text-gray-900 mb-1">Global Reach</h3>
                <p className="text-sm text-gray-600">Track stickers across all continents in real-time.</p>
              </div>
              <div className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-2xl">
                <Camera size={32} className="text-blue-500 mb-3" />
                <h3 className="font-bold text-gray-900 mb-1">Capture Moments</h3>
                <p className="text-sm text-gray-600">Upload photos of your spotted stickers directly.</p>
              </div>
              <div className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-2xl">
                <Heart size={32} className="text-blue-500 mb-3" />
                <h3 className="font-bold text-gray-900 mb-1">Community</h3>
                <p className="text-sm text-gray-600">Join a worldwide community of explorers.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section Placeholder */}
        <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-10 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">How it all began...</h2>
          <div className="space-y-4 text-gray-600 leading-relaxed">
            <p className="bg-gray-100 h-4 rounded w-full animate-pulse"></p>
            <p className="bg-gray-100 h-4 rounded w-5/6 animate-pulse"></p>
            <p className="bg-gray-100 h-4 rounded w-4/6 animate-pulse"></p>
            
            <div className="my-8 w-full h-48 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 font-medium border-2 border-dashed border-gray-200">
              [ Platzhalter für Bilder / Fotos ]
            </div>

            <p className="bg-gray-100 h-4 rounded w-full animate-pulse"></p>
            <p className="bg-gray-100 h-4 rounded w-3/4 animate-pulse"></p>
          </div>
        </div>

      </div>
    </div>
  );
}
