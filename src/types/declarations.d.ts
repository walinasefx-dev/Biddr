declare module 'lucide-react' {
  import * as React from 'react';

  export interface LucideProps extends React.SVGProps<SVGSVGElement> {
    size?: string | number;
    color?: string;
    strokeWidth?: string | number;
    title?: string;
  }

  export type LucideIcon = React.ForwardRefExoticComponent<
    LucideProps & React.RefAttributes<SVGSVGElement>
  >;

  export const Menu: LucideIcon;
  export const X: LucideIcon;
  export const Flame: LucideIcon;
  export const Sparkles: LucideIcon;
  export const User: LucideIcon;
  export const ArrowRight: LucideIcon;
  export const ArrowLeft: LucideIcon;
  export const ArrowUpRight: LucideIcon;
  export const Clock: LucideIcon;
  export const ShieldCheck: LucideIcon;
  export const Shield: LucideIcon;
  export const ShieldAlert: LucideIcon;
  export const Zap: LucideIcon;
  export const Eye: LucideIcon;
  export const EyeOff: LucideIcon;
  export const Filter: LucideIcon;
  export const Layers: LucideIcon;
  export const Watch: LucideIcon;
  export const Cpu: LucideIcon;
  export const Wrench: LucideIcon;
  export const Search: LucideIcon;
  export const Video: LucideIcon;
  export const VideoOff: LucideIcon;
  export const Mic: LucideIcon;
  export const MicOff: LucideIcon;
  export const Play: LucideIcon;
  export const Pause: LucideIcon;
  export const SkipForward: LucideIcon;
  export const FastForward: LucideIcon;
  export const Trophy: LucideIcon;
  export const TrendingUp: LucideIcon;
  export const DollarSign: LucideIcon;
  export const Users: LucideIcon;
  export const CheckCircle2: LucideIcon;
  export const CheckCheck: LucideIcon;
  export const AlertCircle: LucideIcon;
  export const AlertTriangle: LucideIcon;
  export const Mail: LucideIcon;
  export const Lock: LucideIcon;
  export const MapPin: LucideIcon;
  export const Calendar: LucideIcon;
  export const Edit3: LucideIcon;
  export const LogOut: LucideIcon;
  export const Camera: LucideIcon;
  export const ExternalLink: LucideIcon;
  export const Plus: LucideIcon;
  export const Trash2: LucideIcon;
  export const Bookmark: LucideIcon;
  export const BookmarkCheck: LucideIcon;
  export const Gavel: LucideIcon;
  export const History: LucideIcon;
  export const Share2: LucideIcon;
  export const Check: LucideIcon;
  export const ChevronLeft: LucideIcon;
  export const ChevronRight: LucideIcon;
  export const Image: LucideIcon;
  export const Package: LucideIcon;
  export const PackageCheck: LucideIcon;
  export const ShoppingBag: LucideIcon;
  export const Truck: LucideIcon;
  export const CreditCard: LucideIcon;
  export const Smartphone: LucideIcon;
  export const Star: LucideIcon;
  export const HelpCircle: LucideIcon;
  export const Bell: LucideIcon;
  export const Tag: LucideIcon;
  export const SlidersHorizontal: LucideIcon;
  export const ArrowUpDown: LucideIcon;
  export const Instagram: LucideIcon;
  export const Twitter: LucideIcon;
  export const Disc: LucideIcon;
  export const Heart: LucideIcon;
  export const MessageSquare: LucideIcon;
  export const Send: LucideIcon;
  export const ThumbsUp: LucideIcon;
  export const UserPlus: LucideIcon;
  export const UserCheck: LucideIcon;
  export const Radio: LucideIcon;
  export const Volume2: LucideIcon;
  export const VolumeX: LucideIcon;
  export const Maximize2: LucideIcon;
  export const Compass: LucideIcon;
  export const Tv: LucideIcon;
  
  const icons: { [key: string]: LucideIcon };
  export default icons;
}
