export type NavItem = {
  href: string;
  label: string;
  id: string;
  children?: { href: string; label: string }[];
};

export const overEmfNavItems: NavItem[] = [
  { href: '/contact', label: 'Contact', id: 'contact' },
  { href: '/steun-ons', label: 'Steun ons', id: 'steun-ons' },
  { href: '/over-emf/ernest-mandel', label: 'Ernest Mandel', id: 'ernest-mandel' },
  { href: '/over-emf/politiek-handvest', label: 'Politiek handvest', id: 'politiek-handvest' },
  { href: '/over-emf/kameraden', label: 'Kameraden', id: 'kameraden' },
  { href: '/colofon', label: 'Colofon', id: 'colofon' },
];
