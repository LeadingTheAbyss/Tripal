'use client';

import { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';

export default function WikiImage({
  placeName,
  destination,
  className,
}: {
  placeName: string;
  destination: string;
  className?: string;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setImageUrl(null);
    setError(false);

    const fetchImage = async () => {
      try {
        const query = encodeURIComponent(`${placeName} ${destination}`);
        const res = await fetch(`http://localhost:8000/api/image?q=${query}`, {
          cache: 'no-store',
        });

        if (!res.ok) throw new Error('Image API Error');

        const data = await res.json();
        if (data.url && isMounted) {
          setImageUrl(data.url);
        } else {
          throw new Error('No image found');
        }
      } catch {
        if (isMounted) setError(true);
      }
    };

    fetchImage();

    return () => {
      isMounted = false;
    };
  }, [placeName, destination]);

  if (!imageUrl) {
    return (
      <div className={`bg-zinc-800 animate-pulse flex items-center justify-center ${className}`}>
        <div className="w-8 h-8 rounded-full border-2 border-zinc-700 border-t-blue-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-zinc-800 flex flex-col items-center justify-center gap-2 text-zinc-600 ${className}`}>
        <ImageOff size={28} />
        <span className="text-xs">No photo</span>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={placeName}
      className={className}
      onError={() => setError(true)}
    />
  );
}
