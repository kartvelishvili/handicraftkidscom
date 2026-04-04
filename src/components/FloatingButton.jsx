import React, { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';

const FloatingButton = () => {
  const [settings, setSettings] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('floating_button_settings').select('*').limit(1).single();
      if (data) setSettings(data);
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 200);
    };
    // Show after initial load with slight delay
    const timer = setTimeout(() => setIsVisible(true), 1500);
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timer);
    };
  }, []);

  if (!settings?.is_active) return null;

  const size = settings.button_size || 60;
  // Mobile: cap at 52px
  const mobileSize = Math.min(size, 52);
  const color = settings.button_color || '#0084FF';
  const url = settings.button_url || 'https://m.me/handicraftGeorgia';
  const icon = settings.button_icon || 'messenger';
  const imageUrl = settings.button_image_url || '';

  const renderIcon = () => {
    if (imageUrl) {
      return (
        <img 
          src={imageUrl} 
          alt="Chat" 
          className="rounded-full object-cover"
          style={{ width: size * 0.6, height: size * 0.6 }}
        />
      );
    }

    if (icon === 'messenger') {
      return (
        <svg viewBox="0 0 36 36" fill="none" style={{ width: size * 0.5, height: size * 0.5 }}>
          <path d="M18 2C9.163 2 2 8.636 2 16.75c0 4.462 2.165 8.448 5.572 11.085V34l5.902-3.236c1.42.392 2.928.611 4.526.611 8.837 0 16-6.636 16-14.75C34 8.636 26.837 2 18 2z" fill="white"/>
          <path d="M6.502 21.556l5.7-9.062 3.6 3.6 6.6-3.6-5.7 9L13.102 17.9z" fill={color}/>
        </svg>
      );
    }

    // Default: MessageCircle icon
    return <MessageCircle className="text-white" style={{ width: size * 0.45, height: size * 0.45 }} />;
  };

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`fixed z-50 flex items-center justify-center rounded-full shadow-2xl transition-all duration-500 hover:scale-110 active:scale-95 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
      style={{
        bottom: '24px',
        right: '24px',
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: color,
        boxShadow: `0 4px 20px ${color}40, 0 8px 32px rgba(0,0,0,0.15)`,
      }}
      aria-label="Chat with us"
    >
      {renderIcon()}

      {/* Pulse animation */}
      <span
        className="absolute inset-0 rounded-full animate-ping opacity-20"
        style={{ backgroundColor: color }}
      />

      {/* Mobile size override */}
      <style>{`
        @media (max-width: 768px) {
          a[aria-label="Chat with us"] {
            width: ${mobileSize}px !important;
            height: ${mobileSize}px !important;
            bottom: 16px !important;
            right: 16px !important;
          }
        }
      `}</style>
    </a>
  );
};

export default FloatingButton;
