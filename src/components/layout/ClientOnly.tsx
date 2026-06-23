'use client';

import React, { useEffect, useState } from 'react';

export function ClientOnly({ children }: { children: React.ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return <div className="min-h-screen bg-zinc-50 flex items-center justify-center text-zinc-400">Loading application...</div>;
  }

  return <>{children}</>;
}
