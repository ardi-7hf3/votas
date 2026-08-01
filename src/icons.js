// icons.js — Daftar icon lucide-react yang bisa dipilih admin untuk tiap pilihan voting.
// Disimpan sebagai nama string (mis. "Gamepad2") di kolom `icon` Supabase, bukan emoji lagi.
import {
  Gamepad2,
  Music,
  Camera,
  Film,
  BookOpen,
  Palette,
  Trophy,
  Star,
  Heart,
  Flag,
  ThumbsUp,
  Rocket,
  Globe,
  MapPin,
  Utensils,
  Dumbbell,
  Mic,
  Users,
  Gift,
  Coffee,
  Headphones,
  Smartphone,
  Sparkles,
  Zap,
  CircleDashed,
} from 'lucide-react'

export const OPTION_ICONS = [
  { name: 'Gamepad2', label: 'Game', Icon: Gamepad2 },
  { name: 'Music', label: 'Musik', Icon: Music },
  { name: 'Camera', label: 'Kamera', Icon: Camera },
  { name: 'Film', label: 'Film', Icon: Film },
  { name: 'BookOpen', label: 'Buku', Icon: BookOpen },
  { name: 'Palette', label: 'Seni', Icon: Palette },
  { name: 'Trophy', label: 'Piala', Icon: Trophy },
  { name: 'Star', label: 'Bintang', Icon: Star },
  { name: 'Heart', label: 'Favorit', Icon: Heart },
  { name: 'Flag', label: 'Bendera', Icon: Flag },
  { name: 'ThumbsUp', label: 'Suka', Icon: ThumbsUp },
  { name: 'Rocket', label: 'Roket', Icon: Rocket },
  { name: 'Globe', label: 'Dunia', Icon: Globe },
  { name: 'MapPin', label: 'Lokasi', Icon: MapPin },
  { name: 'Utensils', label: 'Kuliner', Icon: Utensils },
  { name: 'Dumbbell', label: 'Olahraga', Icon: Dumbbell },
  { name: 'Mic', label: 'Mik', Icon: Mic },
  { name: 'Users', label: 'Komunitas', Icon: Users },
  { name: 'Gift', label: 'Hadiah', Icon: Gift },
  { name: 'Coffee', label: 'Kopi', Icon: Coffee },
  { name: 'Headphones', label: 'Audio', Icon: Headphones },
  { name: 'Smartphone', label: 'Ponsel', Icon: Smartphone },
  { name: 'Sparkles', label: 'Spesial', Icon: Sparkles },
  { name: 'Zap', label: 'Trending', Icon: Zap },
]

const ICON_MAP = OPTION_ICONS.reduce((map, { name, Icon }) => {
  map[name] = Icon
  return map
}, {})

// Fallback kalau icon belum dipilih atau nilainya tidak dikenali (mis. data lama).
export function getOptionIcon(name) {
  return ICON_MAP[name] || CircleDashed
}
