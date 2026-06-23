'use client';

import { useEffect, useState } from 'react';

export default function WikiImage({ 
  placeName, 
  destination, 
  className 
}: { 
  placeName: string; 
  destination: string; 
  className?: string;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchImage = async () => {
      try {
        const query = encodeURIComponent(`${placeName} ${destination}`);
        const res = await fetch(`http://localhost:8000/api/image?q=${query}`);
        
        if (!res.ok) throw new Error("Image API Error");
        
        const data = await res.json();
        if (data.url && isMounted) {
          setImageUrl(data.url);
          return;
        }
      } catch (err) {
        console.error("Failed to fetch image for", placeName);
      }
      
      // Fallback if no image is found
      if (isMounted) {
        const hash = placeName.replace(/[^a-zA-Z0-9]/g, '');
        setImageUrl(`https://picsum.photos/seed/${hash}/800/600`);
      }
    };
    
    fetchImage();
    
    return () => {
      isMounted = false;
    };
  }, [placeName, destination]);

  if (!imageUrl) {
    return <div className={`bg-zinc-800 animate-pulse ${className}`} />;
  }

  return <img src={imageUrl} alt={placeName} className={className} />;
}
