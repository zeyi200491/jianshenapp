import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';

export default function StatusRedirectLayout({ children }: { children: ReactNode }) {
  void children;
  redirect('/diet');
}
