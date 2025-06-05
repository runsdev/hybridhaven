import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetTypography,
  presetWebFonts,
  presetWind3,
  transformerDirectives,
  transformerVariantGroup
} from 'unocss'

export default defineConfig({
  presets: [
    presetWind3(),
    presetAttributify(),
    presetIcons(),
    presetTypography(),
    presetWebFonts({
      fonts: {
        // ...
      },
    }),
  ],
  transformers: [
    transformerDirectives(),
    transformerVariantGroup(),
  ],
  theme: {
    colors: {
      cyber: {
        pink: '#ff0080',
        blue: '#00d4ff',
        purple: '#8b5cf6',
        green: '#00ff88',
        yellow: '#ffff00',
        orange: '#ff8800'
      },
      glass: {
        white: 'rgba(255, 255, 255, 0.1)',
        blue: 'rgba(0, 212, 255, 0.1)',
        pink: 'rgba(255, 0, 128, 0.1)',
        purple: 'rgba(139, 92, 246, 0.1)'
      }
    },
    backdropBlur: {
      'glass': '16px',
      'cyber': '24px'
    },
    boxShadow: {
      'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
      'cyber-pink': '0 0 20px rgba(255, 0, 128, 0.5)',
      'cyber-blue': '0 0 20px rgba(0, 212, 255, 0.5)',
      'cyber-purple': '0 0 20px rgba(139, 92, 246, 0.5)',
      'neon-glow': '0 0 5px currentColor, 0 0 10px currentColor, 0 0 15px currentColor'
    },
    animation: {
      'cyber-pulse': 'cyber-pulse 2s ease-in-out infinite alternate',
      'glitch': 'glitch 0.3s linear infinite',
      'float': 'float 6s ease-in-out infinite'
    },
    keyframes: {
      'cyber-pulse': {
        '0%': { opacity: '0.6', transform: 'scale(1)' },
        '100%': { opacity: '1', transform: 'scale(1.02)' }
      },
      'float': {
        '0%, 100%': { transform: 'translateY(0px)' },
        '50%': { transform: 'translateY(-10px)' }
      },
      'glitch': {
        '0%': { transform: 'translate(0)' },
        '20%': { transform: 'translate(-2px, 2px)' },
        '40%': { transform: 'translate(-2px, -2px)' },
        '60%': { transform: 'translate(2px, 2px)' },
        '80%': { transform: 'translate(2px, -2px)' },
        '100%': { transform: 'translate(0)' }
      }
    }
  },
  shortcuts: {
    'glass-card': 'backdrop-blur-[20px] bg-white/15 border border-white/30 rounded-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.5)] ring-1 ring-white/10',
    'cyber-card': 'backdrop-blur-[24px] bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-400/30 rounded-3xl shadow-[0_0_20px_rgba(0,212,255,0.5)]',
    'neon-text': 'bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(0,212,255,0.8)]',
    'cyber-button': 'bg-gradient-to-r from-pink-500 to-cyan-500 hover:from-cyan-500 hover:to-pink-500 transition-all duration-300 transform hover:scale-105 rounded-2xl shadow-[0_0_20px_rgba(255,0,128,0.5)] hover:shadow-[0_0_20px_rgba(0,212,255,0.5)]'
  },
  safelist: [
    'animate-cyber-pulse',
    'animate-glitch',
    'animate-float',
    'backdrop-blur-[16px]',
    'backdrop-blur-[20px]',
    'backdrop-blur-[24px]',
    'bg-white/10',
    'bg-white/15',
    'border-white/20',
    'border-white/30',
    'border-cyan-400/30',
    'ring-1',
    'ring-white/10',
    'from-cyan-500/10',
    'to-purple-500/10',
    'from-cyan-400',
    'via-purple-400',
    'to-pink-400',
    'from-pink-500',
    'to-cyan-500',
    'hover:from-cyan-500',
    'hover:to-pink-500'
  ]
})