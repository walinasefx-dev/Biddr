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
  export const Trophy: LucideIcon;
  export const TrendingUp: LucideIcon;
  export const DollarSign: LucideIcon;
  export const Users: LucideIcon;
  export const CheckCircle2: LucideIcon;
  export const AlertCircle: LucideIcon;
  export const Mail: LucideIcon;
  export const Lock: LucideIcon;
  export const MapPin: LucideIcon;
  export const Calendar: LucideIcon;
  export const Edit3: LucideIcon;
  export const LogOut: LucideIcon;
  export const Camera: LucideIcon;
  export const ExternalLink: LucideIcon;
  export const Instagram: LucideIcon;
  export const Twitter: LucideIcon;
  export const Disc: LucideIcon;
  
  const icons: { [key: string]: LucideIcon };
  export default icons;
}
